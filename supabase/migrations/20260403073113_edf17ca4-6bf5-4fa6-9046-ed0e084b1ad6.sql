UPDATE legal_document_templates
SET is_active = false, updated_at = now()
WHERE document_code IS NULL AND is_active = true;