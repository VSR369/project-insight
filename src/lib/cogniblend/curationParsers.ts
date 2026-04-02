/**
 * curationParsers — Pure parser/extractor functions for curation data.
 * Extracted from curationHelpers for ≤200 line compliance.
 */

import type { Json } from "@/integrations/supabase/types";
import type { ChallengeData } from "./curationTypes";
import { parseDeliverables } from "@/utils/parseDeliverableItem";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";

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

export function getDeliverableObjects(ch: ChallengeData, prefix: string = 'D'): DeliverableItem[] {
  const raw = parseJson<any>(ch.deliverables);
  const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return parseDeliverables(d, prefix);
}

export function getExpectedOutcomeObjects(ch: ChallengeData): DeliverableItem[] {
  const eo = parseJson<any>(ch.expected_outcomes);
  const outcomes = Array.isArray(eo) ? eo : (eo?.items ?? []);
  return parseDeliverables(outcomes, 'O');
}

export function getSubmissionGuidelineObjects(ch: ChallengeData): DeliverableItem[] {
  const sgRaw = parseJson<any>((ch as any).submission_guidelines);
  if (sgRaw) {
    const sgItems = Array.isArray(sgRaw) ? sgRaw : (sgRaw?.items ?? []);
    if (sgItems.length > 0) return parseDeliverables(sgItems, 'S');
  }
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

export function getSectionContent(ch: ChallengeData, sectionKey: string): string | null {
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
