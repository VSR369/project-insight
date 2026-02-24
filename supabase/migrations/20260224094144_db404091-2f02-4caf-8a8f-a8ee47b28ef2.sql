
CREATE POLICY "Registration insert seeker_memberships"
ON public.seeker_memberships
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Registration select seeker_memberships"
ON public.seeker_memberships
FOR SELECT
TO anon, authenticated
USING (true);
