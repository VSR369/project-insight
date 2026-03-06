
-- Seed MOD-03 test data

-- 8 verifications
INSERT INTO platform_admin_verifications (organization_id, assigned_admin_id, assignment_method, status, sla_start_at, sla_duration_seconds, sla_breached, sla_breach_tier, is_current) VALUES
('48c85c00-42e9-41c6-b90e-c7fc62e9f451', 'fff77a0e-2a01-4012-b233-dcbe2f58228c', 'auto_assigned', 'Under_Verification', NOW() - INTERVAL '14.4 hours', 172800, false, 'NONE', true),
('9ebd0ad5-ca6d-4ad3-a381-3812bbbf0fdb', 'fff77a0e-2a01-4012-b233-dcbe2f58228c', 'auto_assigned', 'Under_Verification', NOW() - INTERVAL '40.8 hours', 172800, false, 'TIER1', true),
('cfe4c3f0-4af1-418e-8006-0c19e5efb7e2', 'ff121ac9-b82e-434a-a0c5-e3bfaff3f5d4', 'manual', 'Under_Verification', NOW() - INTERVAL '24 hours', 172800, false, 'NONE', true),
('6e9f2b9a-5d77-42ab-90ac-c2edef51ceea', 'ff121ac9-b82e-434a-a0c5-e3bfaff3f5d4', 'auto_assigned', 'Under_Verification', NOW() - INTERVAL '52.8 hours', 172800, true, 'TIER2', true),
('b144870a-9989-41ca-8186-7d3dbf6b5af5', '7efa9bb0-5f1f-4263-b372-fc7f01a509e8', 'manual', 'Under_Verification', NOW() - INTERVAL '28.8 hours', 172800, false, 'NONE', true),
('5fd3002f-01cf-4203-8124-7224760d698a', NULL, NULL, 'Pending_Assignment', NOW() - INTERVAL '19.2 hours', 172800, false, 'NONE', true),
('308a8374-b604-4596-9254-65daa490ffb9', NULL, NULL, 'Pending_Assignment', NOW() - INTERVAL '45.6 hours', 172800, false, 'TIER1', true),
('9710a4a1-6c06-472a-8d55-ed8921ea352f', NULL, NULL, 'Pending_Assignment', NOW() - INTERVAL '76.8 hours', 172800, true, 'TIER3', true);

-- 3 open queue entries
INSERT INTO open_queue_entries (verification_id, fallback_reason, entered_at, sla_deadline, is_critical, is_pinned, escalation_count)
SELECT id, 'NO_ELIGIBLE_ADMIN', NOW() - INTERVAL '19.2 hours', NOW() + INTERVAL '28.8 hours', false, false, 0
FROM platform_admin_verifications WHERE organization_id = '5fd3002f-01cf-4203-8124-7224760d698a' AND status = 'Pending_Assignment' LIMIT 1;

INSERT INTO open_queue_entries (verification_id, fallback_reason, entered_at, sla_deadline, is_critical, is_pinned, escalation_count)
SELECT id, 'NO_INDUSTRY_MATCH', NOW() - INTERVAL '45.6 hours', NOW() - INTERVAL '2.4 hours', false, false, 1
FROM platform_admin_verifications WHERE organization_id = '308a8374-b604-4596-9254-65daa490ffb9' AND status = 'Pending_Assignment' LIMIT 1;

INSERT INTO open_queue_entries (verification_id, fallback_reason, entered_at, sla_deadline, is_critical, is_pinned, escalation_count)
SELECT id, 'NO_ELIGIBLE_ADMIN', NOW() - INTERVAL '76.8 hours', NOW() - INTERVAL '28.8 hours', true, true, 3
FROM platform_admin_verifications WHERE organization_id = '9710a4a1-6c06-472a-8d55-ed8921ea352f' AND status = 'Pending_Assignment' LIMIT 1;
