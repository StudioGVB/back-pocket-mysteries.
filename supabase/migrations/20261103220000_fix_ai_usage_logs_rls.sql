-- ============================================================================
-- STRICT ROW-LEVEL SECURITY (RLS) & ADMIN AUTHORIZATION HARDENING
-- ============================================================================

-- 1. Create a SECURITY DEFINER helper function `public.is_admin()`
-- This safely checks `public.user_roles` (admin / superadmin / super_admin)
-- OR the platform owner email/UID without failing on nested RLS.
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

-- 2. Lock down `public.user_roles` (Prevent privilege escalation)
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can read own role or admin reads all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Ensure the platform owner row exists in `public.user_roles`
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'
FROM auth.users
WHERE lower(email) = 'hello@studiogvb.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'superadmin';

-- 3. Lock down `public.profiles` (Block unauthenticated anon scraping of emails/names)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin views all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin updates all" ON public.profiles;

CREATE POLICY "Users can view own profile or admin views all"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile or admin updates all"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 4. Lock down `public.ai_usage_logs` (Only admins can view AI cost logs)
ALTER TABLE IF EXISTS public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to view AI logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Allow reading AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert AI logs" ON public.ai_usage_logs;

CREATE POLICY "Strict admin-only select on ai_usage_logs"
  ON public.ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Allow authenticated users to insert AI logs"
  ON public.ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Lock down `public.clues` (Block unauthenticated anon dumping of all mystery clues)
ALTER TABLE IF EXISTS public.clues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.clues;
DROP POLICY IF EXISTS "Public clues are viewable by everyone" ON public.clues;
DROP POLICY IF EXISTS "Authenticated users and admins can view clues" ON public.clues;
DROP POLICY IF EXISTS "Owners and admins can modify clues" ON public.clues;

CREATE POLICY "Authenticated users and admins can view clues"
  ON public.clues
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND (m.created_by = auth.uid() OR m.status = 'published')
    )
  );

CREATE POLICY "Owners and admins can modify clues"
  ON public.clues
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND m.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.mysteries m
      WHERE m.id = clues.mystery_id
        AND m.created_by = auth.uid()
    )
  );

-- 6. Lock down `public.orders` (Customers only see their own orders; Admins see all)
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders or admin views all" ON public.orders;
CREATE POLICY "Users can view own orders or admin views all"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
