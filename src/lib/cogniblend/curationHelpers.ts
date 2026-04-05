/**
 * Curation Review Page — Pure Helper Functions
 *
 * Extracted from CurationReviewPage.tsx (Phase D1.1).
 * Parser functions delegated to curationParsers.ts.
 */

import type { Json } from "@/integrations/supabase/types";
import type { ChallengeData, LegalDocSummary, EscrowRecord } from "./curationTypes";
import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { isControlledMode, resolveGovernanceMode } from "@/lib/governanceMode";

// Re-export parsers for backward compatibility
export {
  parseJson,
  getFieldValue,
  getDeliverableItems,
  getDeliverableObjects,
  getExpectedOutcomeObjects,
  getSubmissionGuidelineObjects,
  getEvalCriteria,
  getSectionContent,
} from './curationParsers';
// Also re-export parseJson as named import for direct use
import { parseJson } from './curationParsers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GAP_FIELD_TO_SECTION: Record<string, string> = {
  problem_statement: "problem_statement",
  scope: "scope",
  deliverables: "deliverables",
  evaluation_criteria: "evaluation_criteria",
  reward_structure: "reward_structure",
  phase_schedule: "phase_schedule",
  complexity: "complexity",
  ip_model: "ip_model",
  eligibility: "eligibility",
  visibility: "visibility",
  submission_guidelines: "submission_guidelines",
  maturity_level: "maturity_level",
  legal: "legal_docs",
  escrow: "escrow_funding",
};

// ---------------------------------------------------------------------------
// Checklist auto-check logic
// ---------------------------------------------------------------------------

export const CHECKLIST_LABELS: string[] = [
  "Problem Statement present",
  "Scope defined",
  "Deliverables listed",
  "Evaluation criteria weights = 100%",
  "Reward structure valid",
  "Phase schedule defined",
  "Submission guidelines provided",
  "Eligibility configured",
  "Taxonomy tags applied",
  "Tier 1 legal docs attached",
  "Tier 2 legal templates attached",
  "Complexity parameters entered",
  "Maturity level + legal match",
  "Artifact types configured",
  "Fee calculation verified",
];

export function computeAutoChecks(
  challenge: ChallengeData,
  legalDocs: LegalDocSummary[],
  escrowRecord: EscrowRecord | null,
): boolean[] {
  const tier1Docs = legalDocs.find((d) => d.tier.includes("Tier 1"));
  const tier2Docs = legalDocs.find((d) => d.tier.includes("Tier 2"));
  const evalCriteria = unwrapEvalCriteria(challenge.evaluation_criteria);
  const evalWeightSum = evalCriteria?.reduce((sum, c) => sum + (c.weight ?? 0), 0) ?? 0;

  return [
    !!challenge.problem_statement?.trim(),
    !!challenge.scope?.trim(),
    (() => {
      const d = unwrapArray(challenge.deliverables, "items");
      return !!d && d.length > 0;
    })(),
    evalWeightSum === 100,
    isJsonFilled(challenge.reward_structure),
    isJsonFilled(challenge.phase_schedule),
    !!challenge.description?.trim(),
    !!challenge.eligibility?.trim(),
    (() => {
      const tags = parseJson<string[]>(challenge.domain_tags);
      return Array.isArray(tags) && tags.length > 0;
    })(),
    !!tier1Docs && tier1Docs.attached > 0 && tier1Docs.attached === tier1Docs.total,
    !!tier2Docs && tier2Docs.attached > 0 && tier2Docs.attached === tier2Docs.total,
    challenge.complexity_score != null || !!challenge.complexity_parameters,
    !!challenge.maturity_level,
    (() => {
      const del = jsonParse<Record<string, unknown>>(challenge.deliverables);
      const artifacts = del?.permitted_artifact_types;
      return Array.isArray(artifacts) && artifacts.length > 0;
    })(),
    isControlledMode(resolveGovernanceMode(challenge.governance_profile))
      ? escrowRecord?.escrow_status === "FUNDED"
      : true,
  ];
}

// ---------------------------------------------------------------------------
// Helper: resolve industry segment ID from multiple sources
// ---------------------------------------------------------------------------

export function resolveIndustrySegmentId(challenge: ChallengeData): string | null {
  const tf = parseJson<any>(challenge.targeting_filters);
  if (tf?.industry_segment_id) return tf.industry_segment_id;
  if (tf?.industries?.length > 0) return tf.industries[0];
  const elig = parseJson<any>(challenge.eligibility);
  if (elig && !Array.isArray(elig) && elig.industry_segment_id) return elig.industry_segment_id;
  if (challenge.eligibility_model) return challenge.eligibility_model;
  return null;
}
