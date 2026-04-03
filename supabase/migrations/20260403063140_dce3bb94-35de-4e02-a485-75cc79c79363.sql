
-- Drop existing broken policies
DROP POLICY IF EXISTS "Admins can insert legal document templates" ON public.legal_document_templates;
DROP POLICY IF EXISTS "Admins can update legal document templates" ON public.legal_document_templates;
DROP POLICY IF EXISTS "Admins can delete legal document templates" ON public.legal_document_templates;

-- Recreate with correct user_id check
CREATE POLICY "Admins can insert legal document templates"
ON public.legal_document_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM platform_admin_profiles
    WHERE platform_admin_profiles.user_id = auth.uid()
      AND platform_admin_profiles.admin_tier IN ('supervisor', 'senior_admin')
  )
);

CREATE POLICY "Admins can update legal document templates"
ON public.legal_document_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM platform_admin_profiles
    WHERE platform_admin_profiles.user_id = auth.uid()
      AND platform_admin_profiles.admin_tier IN ('supervisor', 'senior_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM platform_admin_profiles
    WHERE platform_admin_profiles.user_id = auth.uid()
      AND platform_admin_profiles.admin_tier IN ('supervisor', 'senior_admin')
  )
);

CREATE POLICY "Admins can delete legal document templates"
ON public.legal_document_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM platform_admin_profiles
    WHERE platform_admin_profiles.user_id = auth.uid()
      AND platform_admin_profiles.admin_tier IN ('supervisor', 'senior_admin')
  )
);
