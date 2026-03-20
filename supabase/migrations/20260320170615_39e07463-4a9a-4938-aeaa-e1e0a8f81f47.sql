-- Reactivate original 8 solver types, deactivate redundant 5-code model
UPDATE md_solver_eligibility SET is_active = true WHERE code IN ('certified_basic', 'certified_competent', 'certified_expert', 'registered', 'expert_invitee', 'signed_in', 'open_community', 'hybrid');

UPDATE md_solver_eligibility SET is_active = false WHERE code IN ('CE', 'IO', 'DR', 'OC', 'OPEN');