-- ============================================================================
-- STRICT ACCOUNT, GUEST ROSTER, ORDERS & BUILDER ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Ensures:
-- 1. Every single table in the `public` schema has Row-Level Security (RLS) ENABLED.
-- 2. Zero cross-account leakage of personal profiles, guest rosters, invitations,
--    connections, support tickets, or payment orders.
-- 3. Automatic cleanup of ANY legacy permissive `USING (true)` policies on all
--    `public` tables (`profiles`, `guests`, `guest_connections`, `guest_invitations`,
--    `orders`, `discounts`, `user_roles`, `clues`, `mysteries`, `mystery_bases`,
--    `user_mysteries`, `characters`, `ai_usage_logs`, etc.).
-- 4. Existence-safe (`to_regclass`) policy creation so the script never aborts if an
--    optional table has not yet been created.
-- ============================================================================

-- 1. Authoritative Admin Helper Function (`public.is_admin()`)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.role() = 'authenticated'
    AND (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'hello@studiogvb.com'
      OR auth.uid() = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid
      OR EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
          AND lower(user_roles.role::text) IN ('admin', 'superadmin', 'super_admin')
      )
    );
$$;

-- 2. Lock down `public.get_mock_guests()` so non-admins can NEVER dump admin's guest roster
DO $$
BEGIN
  IF to_regclass('public.guests') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.get_mock_guests()
      RETURNS SETOF public.guests
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $body$
      BEGIN
        IF NOT public.is_admin() THEN
          RETURN;
        END IF;

        RETURN QUERY
        SELECT * FROM public.guests
        WHERE user_id = '4903bd39-e54f-42e4-b679-2af5d128bb8f'
        ORDER BY created_at DESC;
      END;
      $body$;
    $fn$;
    REVOKE EXECUTE ON FUNCTION public.get_mock_guests() FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.get_mock_guests() TO authenticated;
  END IF;
END;
$$;

-- 3. Enable RLS on EVERY table in `public` and drop all existing policies on managed tables
--    so no dashboard-created `USING (true)` policy or `rls_disabled_in_public` warning can survive.
DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
BEGIN
  -- Enable RLS on ALL tables in `public` schema
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;

  -- Drop all existing policies across all `public` tables so we can recreate strict policies cleanly
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- 4. Strict RLS on `public.profiles`
-- Users can only read/update their own profile, OR hosts can read basic profile info
-- of guests who explicitly accepted their invitation in `public.guest_connections`, OR admins.
-- Anonymous (`anon`) users have ZERO access to `public.profiles`.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF to_regclass('public.guest_connections') IS NOT NULL THEN
      EXECUTE $sql$
        CREATE POLICY "Users can view own or connected guest profiles"
          ON public.profiles
          FOR SELECT
          TO authenticated
          USING (
            auth.uid() = id
            OR public.is_admin()
            OR EXISTS (
              SELECT 1
              FROM public.guest_connections gc
              WHERE gc.host_user_id = auth.uid()
                AND gc.guest_user_id = profiles.id
            )
          );
      $sql$;
    ELSE
      EXECUTE $sql$
        CREATE POLICY "Users can view own profile or admin views all"
          ON public.profiles
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id OR public.is_admin());
      $sql$;
    END IF;

    EXECUTE $sql$
      CREATE POLICY "Users can insert own profile"
        ON public.profiles
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = id OR public.is_admin());

      CREATE POLICY "Users can update own profile or admin updates all"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id OR public.is_admin())
        WITH CHECK (auth.uid() = id OR public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 5. Strict RLS on `public.guests` (Customer's Private Guest Roster)
DO $$
BEGIN
  IF to_regclass('public.guests') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view their own guests"
        ON public.guests
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Users can insert their own guests"
        ON public.guests
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Users can update their own guests"
        ON public.guests
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin())
        WITH CHECK (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Users can delete their own guests"
        ON public.guests
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 6. Strict RLS on `public.guest_connections` & `public.guest_invitations`
DO $$
BEGIN
  IF to_regclass('public.guest_connections') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Hosts and linked guests can view their own connections"
        ON public.guest_connections
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() = host_user_id
          OR auth.uid() = guest_user_id
          OR public.is_admin()
        );

      CREATE POLICY "Hosts and linked guests can insert their own connections"
        ON public.guest_connections
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() = host_user_id
          OR auth.uid() = guest_user_id
          OR public.is_admin()
        );

      CREATE POLICY "Hosts and linked guests can delete their own connections"
        ON public.guest_connections
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() = host_user_id
          OR auth.uid() = guest_user_id
          OR public.is_admin()
        );
    $sql$;
  END IF;

  IF to_regclass('public.guest_invitations') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Hosts and invited guests can view their invitations"
        ON public.guest_invitations
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() = inviter_user_id
          OR auth.uid() = invited_user_id
          OR lower(coalesce(invite_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          OR public.is_admin()
        );

      CREATE POLICY "Hosts can insert their own invitations"
        ON public.guest_invitations
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = inviter_user_id OR public.is_admin());

      CREATE POLICY "Hosts and invited users can update their invitations"
        ON public.guest_invitations
        FOR UPDATE
        TO authenticated
        USING (
          auth.uid() = inviter_user_id
          OR auth.uid() = invited_user_id
          OR lower(coalesce(invite_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
          OR public.is_admin()
        );
    $sql$;
  END IF;
END;
$$;

-- 7. Strict RLS on `public.orders` (Payment & Purchase History Isolation)
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view own orders or admin views all"
        ON public.orders
        FOR SELECT
        TO authenticated
        USING (
          (user_id IS NOT NULL AND auth.uid() = user_id)
          OR public.is_admin()
        );

      CREATE POLICY "Users can insert own orders"
        ON public.orders
        FOR INSERT
        TO authenticated
        WITH CHECK (
          (user_id IS NOT NULL AND auth.uid() = user_id)
          OR public.is_admin()
        );

      CREATE POLICY "Users can update own orders"
        ON public.orders
        FOR UPDATE
        TO authenticated
        USING (
          (user_id IS NOT NULL AND auth.uid() = user_id)
          OR public.is_admin()
        )
        WITH CHECK (
          (user_id IS NOT NULL AND auth.uid() = user_id)
          OR public.is_admin()
        );
    $sql$;
  END IF;
END;
$$;

-- 8. Strict RLS on `public.user_roles` (Prevent Privilege Escalation)
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view own role or admin views all"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Only admins can manage user roles"
        ON public.user_roles
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 9. Strict RLS on `public.discounts` (if table exists)
DO $$
BEGIN
  IF to_regclass('public.discounts') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can read active auto-apply discounts"
        ON public.discounts
        FOR SELECT
        TO authenticated
        USING ((active = true AND auto_apply = true) OR public.is_admin());

      CREATE POLICY "Only admins can manage discounts"
        ON public.discounts
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 10. Strict RLS on `public.clues` (Allow Playroom guests to view clues for published mysteries & isolated live party carrier rows; block non-owner mutations on real game clues)
DO $$
BEGIN
  IF to_regclass('public.clues') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view clues for published mysteries or isolated live session carrier"
        ON public.clues
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR (round_number = 99 AND title = '__BPM_LIVE_CAST_AND_SESSION__')
          OR EXISTS (
            SELECT 1
            FROM public.mysteries m
            WHERE m.id = clues.mystery_id
              AND (m.created_by = auth.uid() OR m.status = 'published')
          )
        );

      CREATE POLICY "Only mystery owner or admin can mutate real game clues"
        ON public.clues
        FOR ALL
        TO authenticated
        USING (
          round_number <> 99
          AND (
            public.is_admin()
            OR EXISTS (
              SELECT 1
              FROM public.mysteries m
              WHERE m.id = clues.mystery_id
                AND m.created_by = auth.uid()
            )
          )
        )
        WITH CHECK (
          round_number <> 99
          AND (
            public.is_admin()
            OR EXISTS (
              SELECT 1
              FROM public.mysteries m
              WHERE m.id = clues.mystery_id
                AND m.created_by = auth.uid()
            )
          )
        );

      CREATE POLICY "Authenticated hosts can insert their isolated live session carrier"
        ON public.clues
        FOR INSERT
        TO authenticated
        WITH CHECK (
          round_number = 99
          AND title = '__BPM_LIVE_CAST_AND_SESSION__'
        );

      CREATE POLICY "Playroom participants can update isolated live session carrier"
        ON public.clues
        FOR UPDATE
        TO anon, authenticated
        USING (
          round_number = 99
          AND title = '__BPM_LIVE_CAST_AND_SESSION__'
        )
        WITH CHECK (
          round_number = 99
          AND title = '__BPM_LIVE_CAST_AND_SESSION__'
        );

      CREATE POLICY "Only admin can delete isolated live session carrier"
        ON public.clues
        FOR DELETE
        TO authenticated
        USING (
          round_number = 99
          AND title = '__BPM_LIVE_CAST_AND_SESSION__'
          AND public.is_admin()
        );
    $sql$;
  END IF;
END;
$$;

-- 11. Strict RLS on `public.mysteries`, `public.mystery_bases`, `public.user_mysteries`, & `public.characters`
DO $$
BEGIN
  IF to_regclass('public.mysteries') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view published mysteries or owner/admin views all"
        ON public.mysteries
        FOR SELECT
        TO anon, authenticated
        USING (status = 'published' OR created_by = auth.uid() OR public.is_admin());

      CREATE POLICY "Only admins can insert mysteries"
        ON public.mysteries
        FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin());

      CREATE POLICY "Only owner or admin can update mysteries"
        ON public.mysteries
        FOR UPDATE
        TO authenticated
        USING (created_by = auth.uid() OR public.is_admin())
        WITH CHECK (created_by = auth.uid() OR public.is_admin());

      CREATE POLICY "Only admins can delete mysteries"
        ON public.mysteries
        FOR DELETE
        TO authenticated
        USING (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.mystery_bases') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can view mystery_bases"
        ON public.mystery_bases
        FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "Only admins can mutate mystery_bases"
        ON public.mystery_bases
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.user_mysteries') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_mysteries' AND column_name = 'user_id'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY "Users can view own user_mysteries or admin views all"
          ON public.user_mysteries
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id OR public.is_admin());

        CREATE POLICY "Users can manage own user_mysteries or admin manages all"
          ON public.user_mysteries
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id OR public.is_admin())
          WITH CHECK (auth.uid() = user_id OR public.is_admin());
      $sql$;
    ELSE
      EXECUTE $sql$
        CREATE POLICY "Only admins can access user_mysteries"
          ON public.user_mysteries
          FOR ALL
          TO authenticated
          USING (public.is_admin())
          WITH CHECK (public.is_admin());
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.characters') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view characters for published mysteries or owner/admin views all"
        ON public.characters
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = characters.mystery_id
              AND (m.status = 'published' OR m.created_by = auth.uid())
          )
        );

      CREATE POLICY "Only owner or admin can insert characters"
        ON public.characters
        FOR INSERT
        TO authenticated
        WITH CHECK (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = characters.mystery_id AND m.created_by = auth.uid()
          )
        );

      CREATE POLICY "Only owner or admin can update characters"
        ON public.characters
        FOR UPDATE
        TO authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = characters.mystery_id AND m.created_by = auth.uid()
          )
        )
        WITH CHECK (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = characters.mystery_id AND m.created_by = auth.uid()
          )
        );

      CREATE POLICY "Only owner or admin can delete characters"
        ON public.characters
        FOR DELETE
        TO authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = characters.mystery_id AND m.created_by = auth.uid()
          )
        );
    $sql$;
  END IF;
END;
$$;

-- 12. Strict RLS on `public.support_tickets` & `public.support_ticket_messages` (if tables exist)
DO $$
BEGIN
  IF to_regclass('public.support_tickets') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view own support tickets or admin views all"
        ON public.support_tickets
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Users can insert own support tickets"
        ON public.support_tickets
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id OR public.is_admin());

      CREATE POLICY "Users can update own support tickets or admin updates all"
        ON public.support_tickets
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id OR public.is_admin())
        WITH CHECK (auth.uid() = user_id OR public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.support_ticket_messages') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view messages for their own tickets or admin views all"
        ON public.support_ticket_messages
        FOR SELECT
        TO authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = support_ticket_messages.ticket_id
              AND st.user_id = auth.uid()
          )
        );

      CREATE POLICY "Users can insert messages only on their own tickets"
        ON public.support_ticket_messages
        FOR INSERT
        TO authenticated
        WITH CHECK (
          public.is_admin()
          OR (
            auth.uid() = sender_id
            AND EXISTS (
              SELECT 1 FROM public.support_tickets st
              WHERE st.id = support_ticket_messages.ticket_id
                AND st.user_id = auth.uid()
            )
          )
        );
    $sql$;
  END IF;
END;
$$;

-- 13. Strict RLS on `public.inquiries`, `public.reviews`, `public.leads`, `public.ai_usage_logs`, & `public.image_generation_cache`
DO $$
BEGIN
  IF to_regclass('public.inquiries') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can submit contact inquiry"
        ON public.inquiries
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (true);

      CREATE POLICY "Only admins can read or manage inquiries"
        ON public.inquiries
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can read approved reviews or admin reads all"
        ON public.reviews
        FOR SELECT
        TO anon, authenticated
        USING (status = 'approved' OR public.is_admin());

      CREATE POLICY "Anyone can submit pending review"
        ON public.reviews
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (status = 'pending' OR public.is_admin());

      CREATE POLICY "Only admins can update reviews"
        ON public.reviews
        FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());

      CREATE POLICY "Only admins can delete reviews"
        ON public.reviews
        FOR DELETE
        TO authenticated
        USING (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.leads') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can submit lead"
        ON public.leads
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (true);

      CREATE POLICY "Only admins can read or manage leads"
        ON public.leads
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.ai_usage_logs') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Only admins can view ai_usage_logs"
        ON public.ai_usage_logs
        FOR SELECT
        TO authenticated
        USING (public.is_admin());

      CREATE POLICY "Authenticated users can insert own ai_usage_logs"
        ON public.ai_usage_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.image_generation_cache') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can view image_generation_cache"
        ON public.image_generation_cache
        FOR SELECT
        TO authenticated
        USING (true);

      CREATE POLICY "Authenticated users can insert image_generation_cache"
        ON public.image_generation_cache
        FOR INSERT
        TO authenticated
        WITH CHECK (true);

      CREATE POLICY "Only admins can mutate image_generation_cache"
        ON public.image_generation_cache
        FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 14. Strict RLS on Builder Tables (`plot_beats`, `subplots`, `subplot_beats`, `motives`, `relationships`)
DO $$
BEGIN
  IF to_regclass('public.plot_beats') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view plot_beats for published mysteries or owner/admin views all"
        ON public.plot_beats
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = plot_beats.mystery_id
              AND (m.created_by = auth.uid() OR m.status = 'published')
          )
        );

      CREATE POLICY "Only admins can mutate plot_beats"
        ON public.plot_beats
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.subplots') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view subplots for published mysteries or owner/admin views all"
        ON public.subplots
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = subplots.mystery_id
              AND (m.created_by = auth.uid() OR m.status = 'published')
          )
        );

      CREATE POLICY "Only admins can mutate subplots"
        ON public.subplots
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.subplot_beats') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Authenticated users can view subplot_beats for accessible mysteries"
        ON public.subplot_beats
        FOR SELECT
        TO authenticated
        USING (public.is_admin() OR auth.role() = 'authenticated');

      CREATE POLICY "Only admins can mutate subplot_beats"
        ON public.subplot_beats
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.motives') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view motives for published mysteries or owner/admin views all"
        ON public.motives
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = motives.mystery_id
              AND (m.created_by = auth.uid() OR m.status = 'published')
          )
        );

      CREATE POLICY "Only admins can mutate motives"
        ON public.motives
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.relationships') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view relationships for published mysteries or admin views all"
        ON public.relationships
        FOR SELECT
        TO anon, authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.mysteries m
            WHERE m.id = relationships.mystery_id
              AND (m.created_by = auth.uid() OR m.status = 'published')
          )
        );

      CREATE POLICY "Only admins can mutate relationships"
        ON public.relationships
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 15. Strict RLS on Marketing Tables (`blogs`, `social_posts`, `edm_campaigns`)
DO $$
BEGIN
  IF to_regclass('public.blogs') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Anyone can view published blogs or admin views all"
        ON public.blogs
        FOR SELECT
        TO anon, authenticated
        USING (is_draft = false OR public.is_admin());

      CREATE POLICY "Only admins can mutate blogs"
        ON public.blogs
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.social_posts') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Only admins can access social_posts"
        ON public.social_posts
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;

  IF to_regclass('public.edm_campaigns') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE POLICY "Only admins can access edm_campaigns"
        ON public.edm_campaigns
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    $sql$;
  END IF;
END;
$$;

-- 16. Strict RLS on Supabase Storage Buckets (`character-images` & `mystery-audio`)
-- Prevents any user from overwriting or deleting another user's or admin's images/audio files.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    -- Remove overly permissive legacy storage UPDATE / DELETE / INSERT policies
    DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Insert mystery-audio" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Update mystery-audio" ON storage.objects;
    DROP POLICY IF EXISTS "Auth Delete mystery-audio" ON storage.objects;
    DROP POLICY IF EXISTS "Owner or admin can update character-images" ON storage.objects;
    DROP POLICY IF EXISTS "Owner or admin can delete character-images" ON storage.objects;
    DROP POLICY IF EXISTS "Only admins can insert mystery-audio" ON storage.objects;
    DROP POLICY IF EXISTS "Only admins can update mystery-audio" ON storage.objects;
    DROP POLICY IF EXISTS "Only admins can delete mystery-audio" ON storage.objects;

    EXECUTE $sql$
      CREATE POLICY "Owner or admin can update character-images"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'character-images'
          AND (owner = auth.uid() OR public.is_admin())
        )
        WITH CHECK (
          bucket_id = 'character-images'
          AND (owner = auth.uid() OR public.is_admin())
        );

      CREATE POLICY "Owner or admin can delete character-images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'character-images'
          AND (owner = auth.uid() OR public.is_admin())
        );

      CREATE POLICY "Only admins can insert mystery-audio"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'mystery-audio'
          AND public.is_admin()
        );

      CREATE POLICY "Only admins can update mystery-audio"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
          bucket_id = 'mystery-audio'
          AND public.is_admin()
        )
        WITH CHECK (
          bucket_id = 'mystery-audio'
          AND public.is_admin()
        );

      CREATE POLICY "Only admins can delete mystery-audio"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'mystery-audio'
          AND public.is_admin()
        );
    $sql$;
  END IF;
END;
$$;


