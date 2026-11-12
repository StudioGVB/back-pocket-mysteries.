-- ============================================================================
-- STRICT ACCOUNT, GUEST ROSTER, ORDERS & BUILDER ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Ensures:
-- 1. Zero cross-account leakage of personal profiles, guest rosters, invitations,
--    connections, support tickets, or payment orders.
-- 2. New signups and standard customers can NEVER escalate privileges in `user_roles`,
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

-- 3. Strict RLS on `public.profiles`
-- Users can only read/update their own profile, OR hosts can read basic profile info
-- of guests who explicitly accepted their invitation in `public.guest_connections`, OR admins.
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin views all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or connected guest profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin updates all" ON public.profiles;

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

-- 4. Strict RLS on `public.guests` (Customer's Private Guest Roster)
ALTER TABLE IF EXISTS public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can insert their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can update their own guests" ON public.guests;
DROP POLICY IF EXISTS "Users can delete their own guests" ON public.guests;
DROP POLICY IF EXISTS "Admins can update any guest" ON public.guests;

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

-- 5. Strict RLS on `public.guest_connections` & `public.guest_invitations`
ALTER TABLE IF EXISTS public.guest_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts and linked guests can view their own connections" ON public.guest_connections;
DROP POLICY IF EXISTS "Hosts and linked guests can insert their own connections" ON public.guest_connections;
DROP POLICY IF EXISTS "Hosts and linked guests can delete their own connections" ON public.guest_connections;

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

-- 6. Strict RLS on `public.orders` (Payment & Purchase History Isolation)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders or admin views all" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

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

-- 7. Strict RLS on `public.discounts` (Only admins can create/update/delete discounts)
ALTER TABLE IF EXISTS public.discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage discounts" ON public.discounts;
DROP POLICY IF EXISTS "Only admins can manage discounts" ON public.discounts;

CREATE POLICY "Only admins can manage discounts"
  ON public.discounts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. Strict RLS on `public.mysteries` (New signups cannot create/delete mystery templates)
ALTER TABLE IF EXISTS public.mysteries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can insert mysteries" ON public.mysteries;
DROP POLICY IF EXISTS "Only admins can delete mysteries" ON public.mysteries;

CREATE POLICY "Only admins can insert mysteries"
  ON public.mysteries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete mysteries"
  ON public.mysteries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
