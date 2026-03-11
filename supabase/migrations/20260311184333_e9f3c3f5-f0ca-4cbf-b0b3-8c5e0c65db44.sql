-- Fix display names per BRD
UPDATE md_slm_role_codes SET display_name = 'Account Manager', description = 'Primary point of contact for the seeking organization' WHERE code = 'R2';
UPDATE md_slm_role_codes SET display_name = 'Finance Coordinator', description = 'Manages financial governance and billing approvals' WHERE code = 'R8';
UPDATE md_slm_role_codes SET display_name = 'Legal Coordinator', description = 'Ensures legal and regulatory compliance' WHERE code = 'R9';
UPDATE md_slm_role_codes SET display_name = 'Challenge Creator', description = 'Creates and initiates challenges in aggregator model' WHERE code = 'R4';

-- Fix min_required per BRD (min 2 expert reviewers per abstract)
UPDATE md_slm_role_codes SET min_required = 2 WHERE code IN ('R7_MP', 'R7_AGG');