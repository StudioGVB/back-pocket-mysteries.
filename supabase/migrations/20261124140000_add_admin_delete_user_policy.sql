-- Allow admins to delete customer profiles and provide a SECURITY DEFINER RPC
-- that cascades deletion across public tables and auth.users.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles';
    EXECUTE $sql$
      CREATE POLICY "Admins can delete profiles"
        ON public.profiles
        FOR DELETE
        TO authenticated
        USING (public.is_admin());
    $sql$;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: Admin privileges required.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account.';
  END IF;

  IF target_user_id = '4903bd39-e54f-42e4-b679-2af5d128bb8f'::uuid THEN
    RAISE EXCEPTION 'Protected Super Admin account cannot be deleted.';
  END IF;

  IF to_regclass('public.guests') IS NOT NULL THEN
    DELETE FROM public.guests WHERE user_id = target_user_id;
  END IF;

  IF to_regclass('public.guest_connections') IS NOT NULL THEN
    DELETE FROM public.guest_connections
    WHERE host_user_id = target_user_id OR guest_user_id = target_user_id;
  END IF;

  IF to_regclass('public.guest_invitations') IS NOT NULL THEN
    DELETE FROM public.guest_invitations
    WHERE inviter_user_id = target_user_id OR invited_user_id = target_user_id;
  END IF;

  IF to_regclass('public.customer_mysteries') IS NOT NULL THEN
    DELETE FROM public.customer_mysteries WHERE user_id = target_user_id;
  END IF;

  IF to_regclass('public.mysteries') IS NOT NULL THEN
    DELETE FROM public.mysteries WHERE created_by = target_user_id;
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = target_user_id;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = target_user_id;
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(uuid) TO authenticated;
