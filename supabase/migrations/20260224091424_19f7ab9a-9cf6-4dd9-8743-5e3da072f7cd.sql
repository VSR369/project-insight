-- Grant necessary permissions on seeker_billing_info to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seeker_billing_info TO authenticated;

-- Also grant to anon for registration phase (pre-auth users)
GRANT SELECT, INSERT ON public.seeker_billing_info TO anon;