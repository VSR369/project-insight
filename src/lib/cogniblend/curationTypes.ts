/**
 * Curation Review Page — Shared Type Definitions
 *
 * Extracted from CurationReviewPage.tsx (Phase D1.1).
 * Pure interfaces with no runtime dependencies.
 */

import type { Json } from "@/integrations/supabase/types";

/** Core fields loaded immediately for initial render */
export interface ChallengeDataCore {
  id: string;
  title: string;
  problem_statement: string | null;
  scope: string | null;
  hook: string | null;
  description: string | null;
  deliverables: Json | null;
  expected_outcomes: Json | null;
  evaluation_criteria: Json | null;
  reward_structure: Json | null;
  phase_schedule: Json | null;
  ip_model: string | null;
  maturity_level: string | null;
  domain_tags: Json | null;
  currency_code: string | null;
  operating_model: string | null;
  governance_profile: string | null;
  governance_mode_override: string | null;
  current_phase: number | null;
  phase_status: string | null;
  organization_id: string;
  curation_lock_status: string | null;
  curation_frozen_at: string | null;
  extended_brief: Json | null;
  creator_legal_instructions: string | null;
  ai_section_reviews: Json | null;
  visibility: string | null;
  evaluation_method: string | null;
  evaluator_count: number | null;
  solver_audience: string | null;
  /** Joined from seeker_organizations → organization_types */
  seeker_organizations?: {
    organization_type_id: string | null;
    organization_types: { name: string } | null;
  } | null;
}

/** Deferred fields loaded after initial render */
export interface ChallengeDataDeferred {
  complexity_score: number | null;
  complexity_level: string | null;
  complexity_parameters: Json | null;
  complexity_locked: boolean | null;
  complexity_locked_at: string | null;
  complexity_locked_by: string | null;
  solver_eligibility_types: Json | null;
  solver_visibility_types: Json | null;
  solver_expertise_requirements: Json | null;
  targeting_filters: Json | null;
  eligibility_model: string | null;
  eligibility: string | null;
  solution_type: string | null;
  solution_types: Json | null;
  data_resources_provided: Json | null;
  success_metrics_kpis: Json | null;
  max_solutions: number | null;
  lc_review_required: boolean | null;
}

/** Full challenge data — core + deferred merged */
export type ChallengeData = ChallengeDataCore & Partial<ChallengeDataDeferred>;

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
