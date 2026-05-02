UPDATE public.legal_document_templates
SET template_content = content,
    updated_at = NOW()
WHERE document_code IN ('PRIVACY_POLICY','DPA')
  AND COALESCE(template_content, '') = ''
  AND COALESCE(content, '') <> '';