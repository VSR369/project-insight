
-- ============================================================
-- 1. Enhanced legal_document_templates
-- ============================================================

ALTER TABLE public.legal_document_templates
  ADD COLUMN IF NOT EXISTS document_code TEXT
    CHECK (document_code IN ('PMA','CA','PSA','IPAA','EPIA')),
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applies_to_roles TEXT[] NOT NULL DEFAULT '{ALL}',
  ADD COLUMN IF NOT EXISTS applies_to_model TEXT NOT NULL DEFAULT 'BOTH'
    CHECK (applies_to_model IN ('MARKETPLACE','AGGREGATOR','BOTH')),
  ADD COLUMN IF NOT EXISTS applies_to_mode TEXT NOT NULL DEFAULT 'ALL'
    CHECK (applies_to_mode IN ('QUICK','STRUCTURED','CONTROLLED','ALL')),
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES public.legal_document_templates(template_id),
  ADD COLUMN IF NOT EXISTS version_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (version_status IN ('DRAFT','ACTIVE','ARCHIVED')),
  ADD COLUMN IF NOT EXISTS original_file_url TEXT,
  ADD COLUMN IF NOT EXISTS original_file_name TEXT;

-- Unique constraint: one active version per document_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_template_active
  ON public.legal_document_templates(document_code)
  WHERE version_status = 'ACTIVE';

-- ============================================================
-- 2. Workflow trigger configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS public.legal_doc_trigger_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code TEXT NOT NULL
    CHECK (document_code IN ('PMA','CA','PSA','IPAA','EPIA')),
  document_section TEXT,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'USER_REGISTRATION',
    'SEEKER_ENROLLMENT',
    'SOLVER_ENROLLMENT',
    'CHALLENGE_SUBMIT',
    'CHALLENGE_PUBLISH',
    'CHALLENGE_JOIN',
    'ABSTRACT_SUBMIT',
    'SOLVER_SHORTLISTED',
    'SOLUTION_SUBMIT',
    'WINNER_SELECTED',
    'WINNER_CONFIRMED',
    'ESCROW_DEPOSIT',
    'PAYMENT_RELEASE'
  )),
  required_roles TEXT[] NOT NULL DEFAULT '{ALL}',
  applies_to_mode TEXT NOT NULL DEFAULT 'ALL'
    CHECK (applies_to_mode IN ('QUICK','STRUCTURED','CONTROLLED','ALL')),
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (document_code, document_section, trigger_event, applies_to_mode)
);

-- Seed default trigger configuration
INSERT INTO public.legal_doc_trigger_config
  (document_code, document_section, trigger_event, required_roles, applies_to_mode, is_mandatory, display_order)
VALUES
  ('PMA', NULL, 'USER_REGISTRATION', '{ALL}', 'ALL', true, 1),
  ('CA', NULL, 'SEEKER_ENROLLMENT', '{CR}', 'ALL', true, 2),
  ('PSA', NULL, 'SOLVER_ENROLLMENT', '{SOLVER}', 'ALL', true, 3),
  ('CA', NULL, 'CHALLENGE_SUBMIT', '{CR}', 'ALL', true, 4),
  ('CA', NULL, 'CHALLENGE_PUBLISH', '{CR}', 'STRUCTURED', true, 5),
  ('CA', NULL, 'CHALLENGE_PUBLISH', '{CR}', 'CONTROLLED', true, 5),
  ('PSA', NULL, 'CHALLENGE_JOIN', '{SOLVER}', 'ALL', true, 6),
  ('IPAA', 'abstract', 'ABSTRACT_SUBMIT', '{SOLVER}', 'ALL', true, 7),
  ('IPAA', 'milestone', 'SOLVER_SHORTLISTED', '{SOLVER}', 'STRUCTURED', true, 8),
  ('IPAA', 'milestone', 'SOLVER_SHORTLISTED', '{SOLVER}', 'CONTROLLED', true, 8),
  ('PSA', 'detailed', 'SOLUTION_SUBMIT', '{SOLVER}', 'ALL', true, 9),
  ('IPAA', 'detailed', 'SOLUTION_SUBMIT', '{SOLVER}', 'ALL', true, 10),
  ('IPAA', 'final_award', 'WINNER_SELECTED', '{SOLVER,CR}', 'ALL', true, 11),
  ('EPIA', NULL, 'ESCROW_DEPOSIT', '{CR}', 'CONTROLLED', true, 12),
  ('EPIA', 'closure', 'PAYMENT_RELEASE', '{FC}', 'CONTROLLED', true, 13)
ON CONFLICT (document_code, document_section, trigger_event, applies_to_mode) DO NOTHING;

-- ============================================================
-- 3. Acceptance log (forensic-grade, append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.legal_acceptance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id UUID NOT NULL REFERENCES public.legal_document_templates(template_id),
  document_code TEXT NOT NULL,
  document_section TEXT,
  document_version TEXT NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id),
  trigger_event TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ACCEPTED','DECLINED')),
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_accept_user ON public.legal_acceptance_log(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_accept_challenge ON public.legal_acceptance_log(challenge_id);
CREATE INDEX IF NOT EXISTS idx_legal_accept_doc ON public.legal_acceptance_log(document_code, document_version);

-- ============================================================
-- 4. RLS
-- ============================================================

-- Trigger config
ALTER TABLE public.legal_doc_trigger_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trigger config"
  ON public.legal_doc_trigger_config FOR SELECT USING (true);

CREATE POLICY "Supervisors can manage trigger config"
  ON public.legal_doc_trigger_config FOR ALL USING (
    EXISTS (SELECT 1 FROM public.platform_admin_profiles
            WHERE user_id = auth.uid() AND admin_tier IN ('supervisor','senior_admin'))
  );

-- Acceptance log (append-only)
ALTER TABLE public.legal_acceptance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own acceptance log"
  ON public.legal_acceptance_log FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own acceptance"
  ON public.legal_acceptance_log FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supervisors can read all acceptance logs"
  ON public.legal_acceptance_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.platform_admin_profiles
            WHERE user_id = auth.uid() AND admin_tier IN ('supervisor','senior_admin'))
  );

-- No UPDATE or DELETE policies on acceptance log (append-only)

-- ============================================================
-- 5. Legal gate check RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_legal_gate(
  p_user_id UUID,
  p_trigger_event TEXT,
  p_challenge_id UUID DEFAULT NULL,
  p_user_role TEXT DEFAULT 'ALL',
  p_governance_mode TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_trigger RECORD;
  v_template RECORD;
  v_accepted BOOLEAN;
  v_pending JSONB[] := '{}';
BEGIN
  FOR v_trigger IN
    SELECT tc.document_code, tc.document_section, tc.is_mandatory
    FROM public.legal_doc_trigger_config tc
    WHERE tc.trigger_event = p_trigger_event
      AND tc.is_active = true
      AND (tc.applies_to_mode = 'ALL' OR tc.applies_to_mode = p_governance_mode)
      AND (
        p_user_role = ANY(tc.required_roles)
        OR 'ALL' = ANY(tc.required_roles)
      )
    ORDER BY tc.display_order
  LOOP
    SELECT template_id, version, document_name, summary, content, sections
    INTO v_template
    FROM public.legal_document_templates
    WHERE document_code = v_trigger.document_code
      AND version_status = 'ACTIVE'
      AND is_active = true
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_template IS NULL THEN CONTINUE; END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.legal_acceptance_log
      WHERE user_id = p_user_id
        AND document_code = v_trigger.document_code
        AND document_version = v_template.version
        AND COALESCE(document_section, '') = COALESCE(v_trigger.document_section, '')
        AND action = 'ACCEPTED'
        AND (
          (p_challenge_id IS NULL AND challenge_id IS NULL)
          OR challenge_id = p_challenge_id
        )
    ) INTO v_accepted;

    IF NOT v_accepted THEN
      v_pending := v_pending || jsonb_build_object(
        'template_id', v_template.template_id,
        'document_code', v_trigger.document_code,
        'document_section', v_trigger.document_section,
        'document_name', v_template.document_name,
        'document_version', v_template.version,
        'summary', v_template.summary,
        'is_mandatory', v_trigger.is_mandatory
      );
    END IF;
  END LOOP;

  IF array_length(v_pending, 1) IS NULL OR array_length(v_pending, 1) = 0 THEN
    RETURN jsonb_build_object('gate_open', true, 'pending_documents', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'gate_open', false,
    'pending_documents', to_jsonb(v_pending)
  );
END;
$$;

-- ============================================================
-- 6. Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Supervisors can manage legal docs storage"
  ON storage.objects FOR ALL USING (
    bucket_id = 'legal-documents'
    AND EXISTS (SELECT 1 FROM public.platform_admin_profiles
                WHERE user_id = auth.uid() AND admin_tier IN ('supervisor','senior_admin'))
  );

CREATE POLICY "Authenticated users can read legal docs storage"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'legal-documents'
    AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- 7. Seed 5 starter templates
-- ============================================================
INSERT INTO public.legal_document_templates (
  document_code, document_type, document_name, tier, version,
  version_status, is_mandatory, effective_date,
  summary, content, applies_to_roles, applies_to_mode
) VALUES
(
  'PMA', 'platform_master', 'Platform Master Agreement', 'TIER_1', '1.0',
  'ACTIVE', true, CURRENT_DATE,
  'Platform-wide terms of use, liability limitations, dispute resolution, and data handling obligations for all users.',
  '<h1>Platform Master Agreement</h1>
<p class="doc-subtitle">Version 1.0 — Effective [Date]</p>
<p>This Platform Master Agreement ("<strong>Agreement</strong>") is entered into between the Platform Provider ("<strong>Company</strong>") and the registered user ("<strong>User</strong>").</p>
<h2>Recitals</h2>
<p><em>WHEREAS, the Company operates an open innovation platform connecting organizations seeking innovative solutions ("Seekers") with individuals and entities capable of providing such solutions ("Solvers"); and</em></p>
<p><em>WHEREAS, the User wishes to access and utilize the Platform for lawful purposes in accordance with these terms;</em></p>
<p><em>NOW, THEREFORE, the parties agree as follows:</em></p>
<hr />
<h2>Article I — Definitions</h2>
<h3>1.1 Defined Terms</h3>
<p><strong>"Challenge"</strong> means a problem statement posted on the Platform by a Seeker Organization seeking innovative solutions from the Solver community.</p>
<p><strong>"Platform"</strong> means the Company''s web-based open innovation system, including all associated tools, APIs, and services.</p>
<p><strong>"Confidential Information"</strong> means any non-public information disclosed through the Platform, including but not limited to challenge details, solution submissions, evaluation criteria, and financial terms.</p>
<h2>Article II — Platform Access and Use</h2>
<h3>2.1 Grant of Access</h3>
<p>Subject to the terms of this Agreement, Company grants User a non-exclusive, non-transferable, revocable right to access and use the Platform.</p>
<ol><li>User shall maintain the confidentiality of their account credentials at all times.</li><li>User shall not share Platform access with unauthorized third parties.</li><li>User shall comply with all applicable laws and regulations in their jurisdiction.</li></ol>
<h3>2.2 Restrictions</h3>
<p>User shall not:</p>
<ol><li>Reverse engineer, decompile, or disassemble any Platform component;</li><li>Use the Platform for any unlawful, fraudulent, or harmful purpose;</li><li>Attempt to circumvent any security measures or access controls;</li><li>Scrape, harvest, or collect data from the Platform without authorization.</li></ol>
<h2>Article III — Data Protection</h2>
<h3>3.1 Data Handling</h3>
<p>The Company shall process User data in accordance with its Privacy Policy and applicable data protection regulations, including GDPR where applicable.</p>
<h2>Article IV — Limitation of Liability</h2>
<h3>4.1 Disclaimer</h3>
<p>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, COMPANY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.</p>
<h2>Article V — Dispute Resolution</h2>
<h3>5.1 Governing Law</h3>
<p>This Agreement shall be governed by the laws of [Jurisdiction].</p>
<h3>5.2 Arbitration</h3>
<p>Any disputes arising under this Agreement shall be resolved through binding arbitration in accordance with the rules of [Arbitration Body].</p>
<hr />
<p><em>By accepting this Agreement, User acknowledges that they have read, understood, and agree to be bound by all terms and conditions herein.</em></p>',
  '{ALL}', 'ALL'
),
(
  'CA', 'challenge_agreement', 'Challenge Agreement', 'TIER_1', '1.0',
  'ACTIVE', true, CURRENT_DATE,
  'Creator obligations including challenge accuracy, IP ownership confirmation, evaluation fairness commitment, and payment terms.',
  '<h1>Challenge Agreement</h1>
<p class="doc-subtitle">Version 1.0 — Applies to Challenge Creators</p>
<p>This Challenge Agreement ("<strong>Agreement</strong>") governs the obligations of the Challenge Creator ("<strong>Creator</strong>") when posting challenges on the Platform.</p>
<hr />
<h2>Article I — Creator Obligations</h2>
<h3>1.1 Accuracy</h3>
<p>Creator represents and warrants that all information provided in the challenge brief is accurate, complete, and not misleading.</p>
<h3>1.2 Authority</h3>
<p>Creator confirms they have the authority to post this challenge on behalf of their organization and to commit to the stated reward terms.</p>
<h2>Article II — Intellectual Property</h2>
<h3>2.1 Background IP</h3>
<p>Creator retains all rights to their background intellectual property. Nothing in this Agreement transfers Creator''s existing IP to any Solver.</p>
<h3>2.2 Solution IP</h3>
<p>The transfer or licensing of IP rights in submitted solutions shall be governed by the IP & Award Agreement applicable to each challenge.</p>
<h2>Article III — Payment Commitment</h2>
<h3>3.1 Award Obligation</h3>
<p>Creator commits to awarding the stated prize(s) to qualifying solution(s) as evaluated by the Expert Reviewer and confirmed by the Curator.</p>
<hr />
<p><em>By accepting, Creator confirms their commitment to these terms for this challenge.</em></p>',
  '{CR}', 'ALL'
),
(
  'PSA', 'participation_submission', 'Participation & Submission Agreement', 'TIER_1', '1.0',
  'ACTIVE', true, CURRENT_DATE,
  'Solver obligations including confidentiality, submission rules, original work declaration, and evaluation consent.',
  '<h1>Participation & Submission Agreement</h1>
<p class="doc-subtitle">Version 1.0 — Applies to Solvers</p>
<hr />
<h2>Article I — Participation Terms</h2>
<h3>1.1 Eligibility</h3>
<p>Solver confirms they meet all eligibility requirements for participation as stated in the challenge brief.</p>
<h3>1.2 Confidentiality</h3>
<p>Solver shall treat all challenge details as <strong>Confidential Information</strong> and shall not disclose challenge specifics to third parties without written consent.</p>
<h2>Article II — Submission Terms</h2>
<h3>2.1 Original Work</h3>
<p>Solver represents and warrants that all submitted work is original and does not infringe upon the intellectual property rights of any third party.</p>
<h3>2.2 Evaluation Consent</h3>
<p>By submitting, Solver grants the Platform, Creator, and designated Expert Reviewers the right to review, evaluate, and score the submission.</p>
<hr />
<p><em>By accepting, Solver agrees to these participation and submission terms.</em></p>',
  '{SOLVER}', 'ALL'
),
(
  'IPAA', 'ip_award', 'IP & Award Agreement', 'TIER_1', '1.0',
  'ACTIVE', true, CURRENT_DATE,
  'Intellectual property licensing and transfer terms, award conditions, milestone payments, and post-award obligations.',
  '<h1>IP & Award Agreement</h1>
<p class="doc-subtitle">Version 1.0 — Governs IP rights and award terms</p>
<hr />
<h2>Article I — Abstract Phase</h2>
<h3>1.1 Evaluation License</h3>
<p>By submitting an abstract, Solver grants a limited, non-exclusive license to the Platform and designated reviewers for the sole purpose of evaluation. <strong>No intellectual property is transferred at this stage.</strong></p>
<h2>Article II — Milestone Phase</h2>
<h3>2.1 Milestone Payment</h3>
<p>Shortlisted Solvers who accept this section are entitled to milestone compensation as defined in the challenge terms.</p>
<h3>2.2 Continued Participation</h3>
<p>Accepting milestone terms constitutes commitment to submit a detailed solution within the specified timeline.</p>
<h2>Article III — Detailed Submission Phase</h2>
<h3>3.1 Expanded Evaluation Rights</h3>
<p>Detailed solution submissions grant expanded evaluation rights including technical deep-dive review by Expert Reviewers.</p>
<h2>Article IV — Final Award</h2>
<h3>4.1 IP Transfer</h3>
<p>Upon award confirmation, intellectual property rights shall transfer according to the IP model specified in the challenge (exclusive, non-exclusive, or licensed).</p>
<h3>4.2 Payment Terms</h3>
<p>Final payment shall be processed within the timeline specified in the Escrow, Payment & Integrity Agreement.</p>
<hr />
<p><em>This agreement is accepted progressively at each phase milestone.</em></p>',
  '{SOLVER,CR}', 'ALL'
),
(
  'EPIA', 'escrow_payment', 'Escrow, Payment & Integrity Agreement', 'TIER_1', '1.0',
  'ACTIVE', true, CURRENT_DATE,
  'Escrow deposit rules, payment schedules, anti-fraud provisions, dispute handling, and financial integrity requirements.',
  '<h1>Escrow, Payment & Integrity Agreement</h1>
<p class="doc-subtitle">Version 1.0 — Financial controls and integrity</p>
<hr />
<h2>Article I — Escrow</h2>
<h3>1.1 Deposit</h3>
<p>Where required by the governance mode, Creator shall deposit the full challenge prize amount into the Platform escrow account prior to challenge publication.</p>
<h3>1.2 Release Conditions</h3>
<p>Escrow funds shall be released only upon confirmed award decision by the Curator and Creator, as recorded in the Platform audit trail.</p>
<h2>Article II — Payment Processing</h2>
<h3>2.1 Timeline</h3>
<p>Final payments shall be processed within thirty (30) business days of award confirmation.</p>
<h2>Article III — Integrity</h2>
<h3>3.1 Anti-Fraud</h3>
<p>All parties agree to refrain from any fraudulent, collusive, or deceptive conduct in connection with any challenge.</p>
<hr />
<p><em>This agreement is enforced by the Platform and logged in the audit trail.</em></p>',
  '{CR,FC}', 'CONTROLLED'
)
ON CONFLICT DO NOTHING;
