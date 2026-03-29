-- Enable RLS on phase_templates
ALTER TABLE phase_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active phase templates
CREATE POLICY "Authenticated users can read active phase templates"
  ON phase_templates FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Platform admins can manage phase templates (using service_role for now)
CREATE POLICY "Service role full access to phase templates"
  ON phase_templates FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);