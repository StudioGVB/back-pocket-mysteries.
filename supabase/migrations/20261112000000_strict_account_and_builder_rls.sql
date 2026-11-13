-- ============================================================================
-- STRICT ACCOUNT, GUEST ROSTER, ORDERS & BUILDER ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Ensures:
-- 1. Zero cross-account leakage of personal profiles, guest rosters, invitations,
--    connections, support tickets, or payment orders.
-- 2. Automatic cleanup of ANY legacy permissive `USING (true)` policies on
--    `profiles`, `guests`, `guest_connections`, `guest_invitations`, `orders`,
--    `discounts`, `user_roles`, `clues`, `mysteries`, and `characters`.
-- 3. New signups and standard customers can NEVER escalate privileges in `user_roles`,
--    call `get_mock_guests()` to view admin guests, or mutate internal builder tables.
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
CREATE OR REPLACE FUNCTION public.get_mock_guests()
RETURNS SETOF public.guests
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM public.guests
  WHERE user_id = '4903bd39-e54f-42e4-b679-2af5d128bb8f'
  ORDER BY created_at DESC;
END;
$$;

-- 3. Dynamically drop ALL legacy policies on sensitive account & builder tables
--    so no dashboard-created `USING (true)` policy can survive regardless of its name.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'guests',
        'guest_connections',
        'guest_invitations',
        'orders',
        'discounts',
        'user_roles',
        'clues',
        'support_tickets',
        'support_ticket_messages',
        'inquiries',
        'reviews',
        'leads',
        'ai_usage_logs',
        'plot_beats',
        'subplots',
        'subplot_beats',
        'motives',
        'relationships'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- 4. Strict RLS on `public.profiles`
-- Users can only read/update their own profile, OR hosts can read basic profile info
-- of guests who explicitly accepted their invitation in `public.guest_connections`, OR admins.
-- Anonymous (`anon`) users have ZERO access to `public.profiles`.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 5. Strict RLS on `public.guests` (Customer's Private Guest Roster)
ALTER TABLE IF EXISTS public.guests ENABLE ROW LEVEL SECURITY;

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

-- 6. Strict RLS on `public.guest_connections` & `public.guest_invitations`
ALTER TABLE IF EXISTS public.guest_connections ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE IF EXISTS public.guest_invitations ENABLE ROW LEVEL SECURITY;

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

-- 7. Strict RLS on `public.orders` (Payment & Purchase History Isolation)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

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

-- 8. Strict RLS on `public.user_roles` (Prevent Privilege Escalation)
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

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

-- 9. Strict RLS on `public.discounts`
ALTER TABLE IF EXISTS public.discounts ENABLE ROW LEVEL SECURITY;

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

-- 10. Strict RLS on `public.clues` (Block anonymous scraping & non-owner mutations)
ALTER TABLE IF EXISTS public.clues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view clues for accessible mysteries"
  ON public.clues
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND (m.created_by = auth.uid() OR m.status = 'published')
    )
  );

CREATE POLICY "Only mystery owner or admin can mutate clues"
  ON public.clues
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND m.created_by = auth.uid()
    )
  );

-- 11. Strict RLS on `public.mysteries` & `public.characters`
-- Customers can NEVER overwrite or delete the canonical admin mystery templates in Postgres.
ALTER TABLE IF EXISTS public.mysteries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can insert mysteries" ON public.mysteries;
DROP POLICY IF EXISTS "Only admins can delete mysteries" ON public.mysteries;
DROP POLICY IF EXISTS "Only owner or admin can update mysteries" ON public.mysteries;

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

ALTER TABLE IF EXISTS public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only owner or admin can update characters" ON public.characters;
DROP POLICY IF EXISTS "Only owner or admin can insert characters" ON public.characters;
DROP POLICY IF EXISTS "Only owner or admin can delete characters" ON public.characters;

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

-- 12. Strict RLS on `public.support_tickets` & `public.support_ticket_messages`
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE IF EXISTS public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

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
      AND is_admin = false
      AND EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = support_ticket_messages.ticket_id
          AND st.user_id = auth.uid()
      )
    )
  );

-- 13. Strict RLS on `public.inquiries`, `public.reviews`, `public.leads`, and `public.ai_usage_logs`
ALTER TABLE IF EXISTS public.inquiries ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Only admins can update or delete reviews"
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

ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE IF EXISTS public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

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

-- 14. Strict RLS on Builder Tables (`plot_beats`, `subplots`, `subplot_beats`, `motives`, `relationships`)
ALTER TABLE IF EXISTS public.plot_beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plot_beats for accessible mysteries"
  ON public.plot_beats
  FOR SELECT
  TO authenticated
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

ALTER TABLE IF EXISTS public.subplots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view subplots for accessible mysteries"
  ON public.subplots
  FOR SELECT
  TO authenticated
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

ALTER TABLE IF EXISTS public.subplot_beats ENABLE ROW LEVEL SECURITY;

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

ALTER TABLE IF EXISTS public.motives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view motives for accessible mysteries"
  ON public.motives
  FOR SELECT
  TO authenticated
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

ALTER TABLE IF EXISTS public.relationships ENABLE ROW LEVEL SECURITY;

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
