/**
 * Curation Review Page — Pure Helper Functions
 *
 * Extracted from CurationReviewPage.tsx (Phase D1.1).
 * All functions are pure — no state, no closures, no side effects.
 */

import type { Json } from "@/integrations/supabase/types";
import type { ChallengeData, LegalDocSummary, EscrowRecord } from "./curationTypes";
import { parseDeliverables } from "@/utils/parseDeliverableItem";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { isControlledMode, resolveGovernanceMode } from "@/lib/governanceMode";

// ---------------------------------------------------------------------------
// Generic JSON parser
// ---------------------------------------------------------------------------

export function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

// ---------------------------------------------------------------------------
// Field value extractors
// ---------------------------------------------------------------------------

export function getFieldValue(ch: ChallengeData, sectionKey: string): string {
  switch (sectionKey) {
    case "problem_statement": return ch.problem_statement ?? "";
    case "scope": return ch.scope ?? "";
    case "hook": return ch.hook ?? "";
    default: return "";
  }
}

export function getDeliverableItems(ch: ChallengeData): string[] {
  const raw = parseJson<any>(ch.deliverables);
  const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return d.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
}

/** Returns full structured deliverable objects, using parser to decompose flat strings */
export function getDeliverableObjects(ch: ChallengeData, prefix: string = 'D'): DeliverableItem[] {
  const raw = parseJson<any>(ch.deliverables);
  const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return parseDeliverables(d, prefix);
}

/** Returns expected outcome objects from dedicated expected_outcomes column */
export function getExpectedOutcomeObjects(ch: ChallengeData): DeliverableItem[] {
  const eo = parseJson<any>(ch.expected_outcomes);
  const outcomes = Array.isArray(eo) ? eo : (eo?.items ?? []);
  return parseDeliverables(outcomes, 'O');
}

/** Returns submission guideline objects from submission_guidelines column (fallback: description) */
export function getSubmissionGuidelineObjects(ch: ChallengeData): DeliverableItem[] {
  // Try new dedicated column first
  const sgRaw = parseJson<any>((ch as any).submission_guidelines);
  if (sgRaw) {
    const sgItems = Array.isArray(sgRaw) ? sgRaw : (sgRaw?.items ?? []);
    if (sgItems.length > 0) return parseDeliverables(sgItems, 'S');
  }
  // Fallback to legacy description column
  const raw = parseJson<any>(ch.description);
  const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
  return parseDeliverables(items, 'S');
}

export function getEvalCriteria(ch: ChallengeData): { name: string; weight: number }[] {
  const raw = parseJson<any>(ch.evaluation_criteria);
  const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : [];
  return ec.map((c: any) => ({
    name: c.criterion_name ?? c.name ?? c.criterion ?? c.title ?? "",
    weight: c.weight_percentage ?? c.weight ?? c.percentage ?? 0,
  }));
}

// Get current content for any section (used by AI refinement)
export function getSectionContent(ch: ChallengeData, sectionKey: string): string | null {
  // Check if this is an extended brief subsection
  const ebField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
  if (ebField) {
    const eb = parseJson<any>(ch.extended_brief);
    const val = eb?.[ebField];
    if (val == null) return null;
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  switch (sectionKey) {
    case "problem_statement": return ch.problem_statement;
    case "scope": return ch.scope;
    case "submission_guidelines": return (ch as any).submission_guidelines ?? ch.description;
    case "ip_model": return ch.ip_model;
    case "eligibility": {
      const solverTypes = parseJson<any>(ch.solver_eligibility_types);
      if (Array.isArray(solverTypes) && solverTypes.length > 0) {
        const codes = solverTypes.map((t: any) => typeof t === "string" ? t : t?.code ?? "");
        return JSON.stringify(codes);
      }
      return ch.eligibility;
    }
    case "visibility": {
      const solverVis = parseJson<any>(ch.solver_visibility_types);
      if (Array.isArray(solverVis) && solverVis.length > 0) {
        const codes = solverVis.map((t: any) => typeof t === "string" ? t : t?.code ?? "");
        return JSON.stringify(codes);
      }
      return ch.visibility;
    }
    case "deliverables": return ch.deliverables ? JSON.stringify(ch.deliverables) : null;
    case "evaluation_criteria": return ch.evaluation_criteria ? JSON.stringify(ch.evaluation_criteria) : null;
    case "reward_structure": return ch.reward_structure ? JSON.stringify(ch.reward_structure) : null;
    case "phase_schedule": return ch.phase_schedule ? JSON.stringify(ch.phase_schedule) : null;
    case "maturity_level": return ch.maturity_level;
    case "solution_type": return ch.solution_types ? JSON.stringify(ch.solution_types) : null;
    case "complexity": return ch.complexity_parameters ? JSON.stringify(ch.complexity_parameters) : null;
    case "hook": return ch.hook;
    
    case "extended_brief": return ch.extended_brief ? JSON.stringify(ch.extended_brief) : null;
    case "solver_expertise": return ch.solver_expertise_requirements ? JSON.stringify(ch.solver_expertise_requirements) : null;
    case "domain_tags": return ch.domain_tags ? JSON.stringify(ch.domain_tags) : null;
    case "data_resources_provided": return ch.data_resources_provided ? JSON.stringify(ch.data_resources_provided) : null;
    case "success_metrics_kpis": return ch.success_metrics_kpis ? JSON.stringify(ch.success_metrics_kpis) : null;
    case "expected_outcomes": {
      const eo = parseJson<any>(ch.expected_outcomes);
      if (!eo) return null;
      const items = Array.isArray(eo) ? eo : (eo?.items ?? []);
      return items.length > 0 ? JSON.stringify(items) : null;
    }
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Map AI quality gaps to section keys
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
  "Escrow funding confirmed",
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
  // 1. targeting_filters.industry_segment_id — canonical field (set by curator)
  const tf = parseJson<any>(challenge.targeting_filters);
  if (tf?.industry_segment_id) return tf.industry_segment_id;
  // 2. targeting_filters.industries[0] — set by Account Manager during intake
  if (tf?.industries?.length > 0) return tf.industries[0];
  // 3. eligibility.industry_segment_id — legacy: only when eligibility is an object (not array)
  const elig = parseJson<any>(challenge.eligibility);
  if (elig && !Array.isArray(elig) && elig.industry_segment_id) return elig.industry_segment_id;
  // 4. eligibility_model — fallback field
  if (challenge.eligibility_model) return challenge.eligibility_model;
  return null;
}
