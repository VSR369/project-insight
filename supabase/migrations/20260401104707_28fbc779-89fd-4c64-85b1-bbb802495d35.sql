
-- role_authority_matrix: AM → CR for Phase 1
UPDATE public.role_authority_matrix
SET required_role = 'CR'
WHERE required_role = 'AM';

-- role_authority_matrix: ID → CU for Phase 4, 5, 11, 13
UPDATE public.role_authority_matrix
SET required_role = 'CU'
WHERE required_role = 'ID';

-- notification_routing: AM → CR as primary_recipient_role
UPDATE public.notification_routing
SET primary_recipient_role = 'CR', updated_at = now()
WHERE primary_recipient_role = 'AM';

-- notification_routing: ID → CU as primary_recipient_role
UPDATE public.notification_routing
SET primary_recipient_role = 'CU', updated_at = now()
WHERE primary_recipient_role = 'ID';

-- notification_routing: Replace ID in escalation_roles arrays
UPDATE public.notification_routing
SET escalation_roles = array_replace(escalation_roles, 'ID', 'CU'),
    updated_at = now()
WHERE 'ID' = ANY(escalation_roles);

-- notification_routing: Replace AM in cc_roles arrays
UPDATE public.notification_routing
SET cc_roles = array_replace(cc_roles, 'AM', 'CR'),
    updated_at = now()
WHERE 'AM' = ANY(cc_roles);

-- notification_routing: Replace ID in cc_roles arrays
UPDATE public.notification_routing
SET cc_roles = array_replace(cc_roles, 'ID', 'CU'),
    updated_at = now()
WHERE 'ID' = ANY(cc_roles);
