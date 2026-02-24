-- Registration-phase permissive policies for seeker_subscriptions
-- Matches pattern on seeker_billing_info, seeker_compliance, seeker_contacts, seeker_organizations

CREATE POLICY "Registration insert seeker_subscriptions"
ON public.seeker_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Registration select seeker_subscriptions"
ON public.seeker_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);