-- Fix RLS policies for sub_domains to allow admin INSERTs
DROP POLICY IF EXISTS "Admin manage sub_domains" ON sub_domains;
CREATE POLICY "Admin manage sub_domains" ON sub_domains
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Fix RLS policies for specialities to allow admin INSERTs
DROP POLICY IF EXISTS "Admin manage specialities" ON specialities;
CREATE POLICY "Admin manage specialities" ON specialities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));