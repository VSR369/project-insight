
-- Add template_content column for full legal clause text
ALTER TABLE public.legal_document_templates
  ADD COLUMN IF NOT EXISTS template_content TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- RLS INSERT policy for supervisor/senior_admin
CREATE POLICY "Admins can insert legal document templates"
ON public.legal_document_templates
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_admin_profiles
    WHERE id = auth.uid()
      AND admin_tier IN ('supervisor', 'senior_admin')
      AND is_active = true
  )
);

-- RLS UPDATE policy for supervisor/senior_admin
CREATE POLICY "Admins can update legal document templates"
ON public.legal_document_templates
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admin_profiles
    WHERE id = auth.uid()
      AND admin_tier IN ('supervisor', 'senior_admin')
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_admin_profiles
    WHERE id = auth.uid()
      AND admin_tier IN ('supervisor', 'senior_admin')
      AND is_active = true
  )
);

-- RLS DELETE policy for supervisor/senior_admin
CREATE POLICY "Admins can delete legal document templates"
ON public.legal_document_templates
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admin_profiles
    WHERE id = auth.uid()
      AND admin_tier IN ('supervisor', 'senior_admin')
      AND is_active = true
  )
);
