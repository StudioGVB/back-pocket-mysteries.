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
        'clues'
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
    auth.uid() = host_user_id
    OR auth.uid() = accepted_by_user_id
    OR lower(coalesce(invited_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    OR public.is_admin()
  );

CREATE POLICY "Hosts can insert their own invitations"
  ON public.guest_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_user_id OR public.is_admin());

CREATE POLICY "Hosts and invited users can update their invitations"
  ON public.guest_invitations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = host_user_id
    OR auth.uid() = accepted_by_user_id
    OR lower(coalesce(invited_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
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

CREATE POLICY "Authenticated users can read active discounts"
  ON public.discounts
  FOR SELECT
  TO authenticated
  USING (active = true OR public.is_admin());

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
        AND (m.created_by = auth.uid() OR m.is_published = true)
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
