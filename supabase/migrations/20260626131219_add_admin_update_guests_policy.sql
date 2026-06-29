-- Allow admins to update any guest record
CREATE POLICY "Admins can update any guest" 
ON public.guests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role::text IN ('admin', 'super_admin')
  )
);
