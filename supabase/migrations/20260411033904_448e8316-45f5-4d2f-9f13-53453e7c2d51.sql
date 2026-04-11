-- Bug 7: Fix stale notification_routing phase mappings for 10-phase model
-- Phase 2 = Curation (CU is primary), not Creator

-- Phase 2: ROLE_ASSIGNED → CU primary, CR as CC
UPDATE public.notification_routing
SET primary_recipient_role = 'CU',
    cc_roles = ARRAY['CR'],
    escalation_roles = ARRAY['CU']
WHERE phase = 2 AND event_type = 'ROLE_ASSIGNED';

-- Phase 2: PHASE_COMPLETE → CU primary, CR as CC
UPDATE public.notification_routing
SET primary_recipient_role = 'CU',
    cc_roles = ARRAY['CR'],
    escalation_roles = ARRAY['CU']
WHERE phase = 2 AND event_type = 'PHASE_COMPLETE';

-- Phase 2: SLA_WARNING → CU primary
UPDATE public.notification_routing
SET primary_recipient_role = 'CU',
    cc_roles = ARRAY['CR'],
    escalation_roles = ARRAY['CU']
WHERE phase = 2 AND event_type = 'SLA_WARNING';

-- Phase 2: SLA_BREACH → CU primary
UPDATE public.notification_routing
SET primary_recipient_role = 'CU',
    cc_roles = ARRAY['CR'],
    escalation_roles = ARRAY['CU']
WHERE phase = 2 AND event_type = 'SLA_BREACH';

-- Phase 3: Update CC to include LC for compliance phase
UPDATE public.notification_routing
SET cc_roles = ARRAY['CR', 'LC']
WHERE phase = 3 AND event_type IN ('PHASE_COMPLETE', 'SLA_WARNING', 'SLA_BREACH');