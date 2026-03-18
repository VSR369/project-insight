
-- notification_routing: Governs who receives notifications per phase + event
CREATE TABLE public.notification_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'SLA_WARNING', 'SLA_BREACH', 'PHASE_COMPLETE', 'ROLE_ASSIGNED',
    'AMENDMENT_INITIATED', 'CHALLENGE_RETURNED', 'CHALLENGE_REJECTED',
    'SOLUTION_SUBMITTED', 'EVALUATION_COMPLETE', 'ESCROW_EVENT',
    'DISPUTE_FILED', 'IP_TRANSFER'
  )),
  primary_recipient_role TEXT NOT NULL,
  cc_roles TEXT[] NOT NULL DEFAULT '{}',
  escalation_roles TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(phase, event_type)
);

-- Indexes
CREATE INDEX idx_notification_routing_phase_event ON public.notification_routing(phase, event_type);
CREATE INDEX idx_notification_routing_active ON public.notification_routing(is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.notification_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_notification_routing"
  ON public.notification_routing
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed BRD §7.2 routing configuration
INSERT INTO public.notification_routing (phase, event_type, primary_recipient_role, cc_roles, escalation_roles) VALUES
  -- Phase 1: Challenge Creation → AM primary, ID cc
  (1, 'PHASE_COMPLETE',      'AM', ARRAY['ID'],       ARRAY['ID']),
  (1, 'SLA_WARNING',         'AM', ARRAY['ID'],       ARRAY['ID']),
  (1, 'SLA_BREACH',          'AM', ARRAY['ID'],       ARRAY['ID']),
  (1, 'ROLE_ASSIGNED',       'AM', ARRAY['ID'],       ARRAY[]::TEXT[]),
  -- Phase 2: Legal Review → CR primary, CU cc
  (2, 'PHASE_COMPLETE',      'CR', ARRAY['CU'],       ARRAY['ID']),
  (2, 'SLA_WARNING',         'CR', ARRAY['CU'],       ARRAY['ID']),
  (2, 'SLA_BREACH',          'CR', ARRAY['CU'],       ARRAY['ID']),
  (2, 'ROLE_ASSIGNED',       'CR', ARRAY['CU'],       ARRAY[]::TEXT[]),
  -- Phase 3: Curation → CU primary, ID cc
  (3, 'PHASE_COMPLETE',      'CU', ARRAY['ID'],       ARRAY['ID']),
  (3, 'SLA_WARNING',         'CU', ARRAY['ID'],       ARRAY['ID']),
  (3, 'SLA_BREACH',          'CU', ARRAY['ID'],       ARRAY['ID']),
  (3, 'ROLE_ASSIGNED',       'CU', ARRAY['ID'],       ARRAY[]::TEXT[]),
  (3, 'CHALLENGE_RETURNED',  'CR', ARRAY['AM','CU'],  ARRAY['ID']),
  -- Phase 4: Approval → ID primary, Org Admin cc
  (4, 'PHASE_COMPLETE',      'ID', ARRAY['ORG_ADMIN'], ARRAY[]::TEXT[]),
  (4, 'SLA_WARNING',         'ID', ARRAY['ORG_ADMIN'], ARRAY[]::TEXT[]),
  (4, 'SLA_BREACH',          'ID', ARRAY['ORG_ADMIN'], ARRAY[]::TEXT[]),
  (4, 'ROLE_ASSIGNED',       'ID', ARRAY['ORG_ADMIN'], ARRAY[]::TEXT[]),
  (4, 'CHALLENGE_RETURNED',  'CU', ARRAY['CR','AM'],   ARRAY['ID']),
  (4, 'CHALLENGE_REJECTED',  'CU', ARRAY['CR','AM'],   ARRAY['ID']),
  -- Phase 5: Publication → ID primary, FC cc (escrow)
  (5, 'PHASE_COMPLETE',      'ID', ARRAY['FC'],       ARRAY[]::TEXT[]),
  (5, 'SLA_WARNING',         'ID', ARRAY['FC'],       ARRAY[]::TEXT[]),
  (5, 'SLA_BREACH',          'ID', ARRAY['FC'],       ARRAY[]::TEXT[]),
  (5, 'ESCROW_EVENT',        'FC', ARRAY['ID'],       ARRAY['ORG_ADMIN']),
  -- Phase 6: Submission → ID primary, ER cc
  (6, 'PHASE_COMPLETE',      'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (6, 'SOLUTION_SUBMITTED',  'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (6, 'SLA_WARNING',         'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (6, 'SLA_BREACH',          'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (6, 'AMENDMENT_INITIATED', 'ID', ARRAY['CU','CR'],  ARRAY[]::TEXT[]),
  -- Phase 7: Screening → ID primary, ER cc
  (7, 'PHASE_COMPLETE',      'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (7, 'SLA_WARNING',         'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  (7, 'SLA_BREACH',          'ID', ARRAY['ER'],       ARRAY[]::TEXT[]),
  -- Phase 8: Evaluation → ER primary, ID cc
  (8, 'PHASE_COMPLETE',      'ER', ARRAY['ID'],       ARRAY[]::TEXT[]),
  (8, 'SLA_WARNING',         'ER', ARRAY['ID'],       ARRAY['ID']),
  (8, 'SLA_BREACH',          'ER', ARRAY['ID'],       ARRAY['ID']),
  (8, 'EVALUATION_COMPLETE', 'ER', ARRAY['ID'],       ARRAY[]::TEXT[]),
  (8, 'ROLE_ASSIGNED',       'ER', ARRAY['ID'],       ARRAY[]::TEXT[]),
  -- Phase 9: Selection → ID primary, FC cc
  (9, 'PHASE_COMPLETE',      'ID', ARRAY['FC'],       ARRAY[]::TEXT[]),
  (9, 'ESCROW_EVENT',        'FC', ARRAY['ID'],       ARRAY['ORG_ADMIN']),
  -- Phase 10: IP Transfer → LC primary, ID + FC cc
  (10, 'PHASE_COMPLETE',     'LC', ARRAY['ID','FC'],  ARRAY[]::TEXT[]),
  (10, 'IP_TRANSFER',        'LC', ARRAY['ID','FC'],  ARRAY[]::TEXT[]),
  (10, 'SLA_WARNING',        'LC', ARRAY['ID'],       ARRAY['ID']),
  (10, 'SLA_BREACH',         'LC', ARRAY['ID'],       ARRAY['ID']),
  -- Phase 11: Dispute → ID primary, LC cc
  (11, 'DISPUTE_FILED',      'ID', ARRAY['LC'],       ARRAY['ORG_ADMIN']),
  (11, 'SLA_WARNING',        'ID', ARRAY['LC'],       ARRAY[]::TEXT[]),
  (11, 'SLA_BREACH',         'ID', ARRAY['LC','ORG_ADMIN'], ARRAY[]::TEXT[]);
