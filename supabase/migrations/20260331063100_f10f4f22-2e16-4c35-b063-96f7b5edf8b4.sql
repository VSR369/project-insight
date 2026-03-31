-- Soft-deactivate deprecated AM, RQ, ID role conflict rules
UPDATE public.role_conflict_rules
SET is_active = false, updated_at = now()
WHERE role_a IN ('AM', 'RQ', 'ID') OR role_b IN ('AM', 'RQ', 'ID');