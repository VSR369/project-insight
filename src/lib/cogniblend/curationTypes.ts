/**
 * Curation Review Page — Shared Type Definitions
 *
 * Extracted from CurationReviewPage.tsx (Phase D1.1).
 * Pure interfaces with no runtime dependencies.
 */

import type { Json } from "@/integrations/supabase/types";

export interface ChallengeData {
  id: string;
  title: string;
  problem_statement: string | null;
  scope: string | null;
  deliverables: Json | null;
  evaluation_criteria: Json | null;
  reward_structure: Json | null;
  phase_schedule: Json | null;
  complexity_score: number | null;
  complexity_level: string | null;
  complexity_parameters: Json | null;
  ip_model: string | null;
  maturity_level: string | null;
  visibility: string | null;
  eligibility: string | null;
  description: string | null;
  operating_model: string | null;
  governance_profile: string | null;
  current_phase: number | null;
  phase_status: string | null;
  domain_tags: Json | null;
  ai_section_reviews: Json | null;
  currency_code: string | null;
  hook: string | null;
  max_solutions: number | null;
  extended_brief: Json | null;
  expected_outcomes: Json | null;
  // Phase 5A: solver-tier fields for eligibility/visibility
  solver_eligibility_types: Json | null;
  solver_visibility_types: Json | null;
  // Phase: solver expertise requirements
  solver_expertise_requirements: Json | null;
  targeting_filters: Json | null;
  eligibility_model: string | null;
  organization_id: string;
  solution_type: string | null;
  solution_types: Json | null;
  data_resources_provided: Json | null;
  success_metrics_kpis: Json | null;
}

export interface LegalDocSummary {
  tier: string;
  total: number;
  attached: number;
}

export interface LegalDocDetail {
  id: string;
  document_type: string;
  document_name: string | null;
  content_summary: string | null;
  lc_status: string | null;
  status: string | null;
  tier: string;
}

export interface EscrowRecord {
  id: string;
  escrow_status: string;
  deposit_amount: number;
  remaining_amount: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_address: string | null;
  currency: string | null;
  deposit_date: string | null;
  deposit_reference: string | null;
  fc_notes: string | null;
}

export interface ComplexityParam {
  name?: string;
  key?: string;
  value?: string | number;
  score?: number;
}

export interface AIQualitySummary {
  overall_score: number;
  gaps: Array<{ field: string; severity: string; message: string }>;
}

export interface SectionDef {
  key: string;
  label: string;
  attribution?: string;
  dbField?: string;
  isFilled: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => boolean;
  render: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => React.ReactNode;
}

export interface GroupDef {
  id: string;
  label: string;
  icon: string;
  colorDone: string;
  colorActive: string;
  colorBorder: string;
  sectionKeys: string[];
  prerequisiteGroups: string[];
}
