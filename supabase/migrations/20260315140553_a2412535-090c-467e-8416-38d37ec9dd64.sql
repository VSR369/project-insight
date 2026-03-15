-- Seed R10_CR role code
INSERT INTO md_slm_role_codes (code, display_name, description, display_order, is_active, model_applicability, is_core, min_required)
VALUES ('R10_CR', 'Challenge Requestor', 'Submits solution requests from within the organization on behalf of a department', 4, true, 'agg', true, 0)
ON CONFLICT (code) DO NOTHING;