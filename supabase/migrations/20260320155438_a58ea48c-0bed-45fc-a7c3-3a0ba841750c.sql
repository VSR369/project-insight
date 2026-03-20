-- Deactivate legacy solver eligibility codes (keep only CE, IO, DR, OC, OPEN)
UPDATE md_solver_eligibility 
SET is_active = false, updated_at = now() 
WHERE code IN ('certified_basic', 'certified_competent', 'certified_expert', 'registered', 'expert_invitee', 'signed_in', 'open_community', 'hybrid')
  AND is_active = true;