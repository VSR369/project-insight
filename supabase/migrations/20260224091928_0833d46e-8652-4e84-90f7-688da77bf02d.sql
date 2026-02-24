-- Grant necessary permissions on seeker_compliance to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seeker_compliance TO authenticated;

-- Grant to anon for registration phase
GRANT SELECT, INSERT ON public.seeker_compliance TO anon;