export type DocumentCode = 'PMA' | 'CA' | 'PSA' | 'IPAA' | 'EPIA' | 'SPA' | 'SKPA' | 'PWA' | 'CPA_QUICK' | 'CPA_STRUCTURED' | 'CPA_CONTROLLED';
export type VersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type AppliesModel = 'MARKETPLACE' | 'AGGREGATOR' | 'BOTH';
export type AppliesMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED' | 'ALL';
export type AcceptanceAction = 'ACCEPTED' | 'DECLINED';

export type TriggerEvent =
  | 'USER_REGISTRATION'
  | 'SEEKER_ENROLLMENT'
  | 'SOLVER_ENROLLMENT'
  | 'CHALLENGE_SUBMIT'
  | 'CHALLENGE_PUBLISH'
  | 'CHALLENGE_JOIN'
  | 'ABSTRACT_SUBMIT'
  | 'SOLVER_SHORTLISTED'
  | 'SOLUTION_SUBMIT'
  | 'WINNER_SELECTED'
  | 'WINNER_CONFIRMED'
  | 'ESCROW_DEPOSIT'
  | 'PAYMENT_RELEASE';

export interface LegalDocTemplate {
  template_id: string;
  document_code: DocumentCode | null;
  document_type: string;
  document_name: string;
  tier: string;
  version: string;
  version_status: VersionStatus;
  description: string | null;
  summary: string | null;
  content: string | null;
  content_json: Record<string, unknown> | null;
  template_content: string | null;
  sections: Record<string, unknown>;
  applies_to_roles: string[];
  applies_to_model: AppliesModel;
  applies_to_mode: AppliesMode;
  is_mandatory: boolean;
  is_active: boolean;
  effective_date: string | null;
  parent_template_id: string | null;
  original_file_url: string | null;
  original_file_name: string | null;
  default_template_url: string | null;
  trigger_phase: number | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface LegalDocTriggerConfig {
  id: string;
  document_code: DocumentCode;
  document_section: string | null;
  trigger_event: TriggerEvent;
  required_roles: string[];
  applies_to_mode: AppliesMode;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface PendingLegalDocument {
  template_id: string;
  document_code: DocumentCode;
  document_section: string | null;
  document_name: string;
  document_version: string;
  summary: string | null;
  is_mandatory: boolean;
}

export interface LegalGateResult {
  gate_open: boolean;
  pending_documents: PendingLegalDocument[];
}

export const DOCUMENT_CODE_LABELS: Record<DocumentCode, string> = {
  PMA: 'Platform Master Agreement',
  CA: 'Challenge Agreement',
  PSA: 'Participation & Submission Agreement',
  IPAA: 'IP & Award Agreement',
  EPIA: 'Escrow, Payment & Integrity Agreement',
  SPA: 'Solver Platform Agreement',
  SKPA: 'Seeker Platform Agreement',
  PWA: 'Prize & Work Agreement',
  CPA_QUICK: 'CPA Template (Quick)',
  CPA_STRUCTURED: 'CPA Template (Structured)',
  CPA_CONTROLLED: 'CPA Template (Controlled)',
};

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  USER_REGISTRATION: 'User Registration',
  SEEKER_ENROLLMENT: 'Seeker Enrollment',
  SOLVER_ENROLLMENT: 'Solver Enrollment',
  CHALLENGE_SUBMIT: 'Challenge Submit',
  CHALLENGE_PUBLISH: 'Challenge Publish',
  CHALLENGE_JOIN: 'Challenge Join',
  ABSTRACT_SUBMIT: 'Abstract Submit',
  SOLVER_SHORTLISTED: 'Solver Shortlisted',
  SOLUTION_SUBMIT: 'Solution Submit',
  WINNER_SELECTED: 'Winner Selected',
  WINNER_CONFIRMED: 'Winner Confirmed',
  ESCROW_DEPOSIT: 'Escrow Deposit',
  PAYMENT_RELEASE: 'Payment Release',
};

export const TRIGGER_EVENT_DESCRIPTIONS: Record<TriggerEvent, string> = {
  USER_REGISTRATION: 'When any user first registers on the platform',
  SEEKER_ENROLLMENT: 'When a seeker organization enrolls to post challenges',
  SOLVER_ENROLLMENT: 'When a solver registers to participate in challenges',
  CHALLENGE_SUBMIT: 'When a challenge is submitted for review',
  CHALLENGE_PUBLISH: 'When a challenge is published to solvers',
  CHALLENGE_JOIN: 'When a solver joins a published challenge',
  ABSTRACT_SUBMIT: 'When a solver submits an abstract proposal',
  SOLVER_SHORTLISTED: 'When a solver is shortlisted for a challenge',
  SOLUTION_SUBMIT: 'When a solver submits their final solution',
  WINNER_SELECTED: 'When a winner is selected for a challenge',
  WINNER_CONFIRMED: 'When a winner confirms acceptance of the award',
  ESCROW_DEPOSIT: 'When escrow funds are deposited for a challenge',
  PAYMENT_RELEASE: 'When prize payment is released to a winner',
};
