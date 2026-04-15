/**
 * masterDataValidator.ts — Post-AI hard validation for master-data-backed sections.
 * Strips invalid values, adds error comments. Runs client-side after AI response.
 */

import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';

/* ── Valid code sets ── */

const VALID_MATURITY_LEVELS = new Set(['BLUEPRINT', 'POC', 'PROTOTYPE', 'PILOT', 'PRODUCTION']);
const VALID_IP_MODELS = new Set(['IP-EA', 'IP-NEL', 'IP-EL', 'IP-JO', 'IP-SR']);
const VALID_VISIBILITY_OPTIONS = new Set(['public', 'private', 'invite_only']);

interface ValidationIssue {
  sectionKey: string;
  field: string;
  invalidValues: string[];
  message: string;
}

export interface MasterDataValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  correctedReviews: SectionReview[];
}

/* ── Helpers ── */

function extractSuggestionValue(suggestion: unknown): unknown {
  if (!suggestion) return null;
  if (typeof suggestion === 'string') {
    try { return JSON.parse(suggestion); } catch { return suggestion; }
  }
  return suggestion;
}

function validateCodeAgainstSet(
  value: unknown,
  validSet: Set<string>,
  sectionKey: string,
  fieldName: string,
): { cleaned: unknown; issue: ValidationIssue | null } {
  if (!value) return { cleaned: value, issue: null };

  // checkbox_single: { selected_id: "CODE", rationale: "..." }
  if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.selected_id && typeof obj.selected_id === 'string') {
      if (!validSet.has(obj.selected_id)) {
        return {
          cleaned: null,
          issue: {
            sectionKey,
            field: fieldName,
            invalidValues: [obj.selected_id],
            message: `AI suggested "${obj.selected_id}" which is not a valid ${fieldName}. Valid values: ${[...validSet].join(', ')}`,
          },
        };
      }
    }
    return { cleaned: value, issue: null };
  }

  // checkbox_multi: ["CODE1", "CODE2"]
  if (Array.isArray(value)) {
    const validItems = value.filter(v => typeof v === 'string' && validSet.has(v));
    const invalidItems = value.filter(v => typeof v === 'string' && !validSet.has(v));
    if (invalidItems.length > 0) {
      return {
        cleaned: validItems.length > 0 ? validItems : null,
        issue: {
          sectionKey,
          field: fieldName,
          invalidValues: invalidItems as string[],
          message: `AI suggested invalid ${fieldName} values: ${invalidItems.join(', ')}. Valid values: ${[...validSet].join(', ')}`,
        },
      };
    }
    return { cleaned: value, issue: null };
  }

  // Single string
  if (typeof value === 'string') {
    if (!validSet.has(value)) {
      return {
        cleaned: null,
        issue: {
          sectionKey,
          field: fieldName,
          invalidValues: [value],
          message: `AI suggested "${value}" which is not a valid ${fieldName}. Valid values: ${[...validSet].join(', ')}`,
        },
      };
    }
  }

  return { cleaned: value, issue: null };
}

function validateEvalCriteriaWeights(suggestion: unknown, sectionKey: string): ValidationIssue | null {
  const parsed = extractSuggestionValue(suggestion);
  if (!Array.isArray(parsed)) return null;

  const totalWeight = parsed.reduce((sum: number, item: Record<string, unknown>) => {
    const w = Number(item.weight_percentage ?? item.weight ?? 0);
    return sum + w;
  }, 0);

  if (Math.abs(totalWeight - 100) > 0.5) {
    return {
      sectionKey,
      field: 'evaluation_criteria',
      invalidValues: [`total=${totalWeight}%`],
      message: `Evaluation criteria weights sum to ${totalWeight}%, not 100%. Weights must sum to exactly 100%.`,
    };
  }

  return null;
}

/* ── Main validator ── */

export function validateMasterDataInReviews(
  reviews: SectionReview[],
  dynamicMasterData?: {
    eligibilityCodes?: string[];
    solutionTypeCodes?: string[];
  },
): MasterDataValidationResult {
  const issues: ValidationIssue[] = [];
  const corrected = reviews.map(review => {
    const r = { ...review };
    if (!r.suggestion) return r;

    const suggestionValue = extractSuggestionValue(r.suggestion);

    // Validate maturity_level
    if (r.section_key === 'maturity_level') {
      const result = validateCodeAgainstSet(suggestionValue, VALID_MATURITY_LEVELS, r.section_key, 'maturity_level');
      if (result.issue) {
        issues.push(result.issue);
        r.suggestion = undefined;
        r.comments = [
          ...(r.comments ?? []),
          { type: 'error', text: result.issue.message },
        ];
      }
    }

    // Validate ip_model
    if (r.section_key === 'ip_model') {
      const result = validateCodeAgainstSet(suggestionValue, VALID_IP_MODELS, r.section_key, 'ip_model');
      if (result.issue) {
        issues.push(result.issue);
        r.suggestion = undefined;
        r.comments = [
          ...(r.comments ?? []),
          { type: 'error', text: result.issue.message },
        ];
      }
    }

    // Validate visibility
    if (r.section_key === 'visibility') {
      const result = validateCodeAgainstSet(suggestionValue, VALID_VISIBILITY_OPTIONS, r.section_key, 'visibility');
      if (result.issue) {
        issues.push(result.issue);
        r.suggestion = result.cleaned ? JSON.stringify(result.cleaned) : undefined;
        r.comments = [
          ...(r.comments ?? []),
          { type: 'error', text: result.issue.message },
        ];
      }
    }

    // Validate eligibility against dynamic master data
    if (r.section_key === 'eligibility' && dynamicMasterData?.eligibilityCodes?.length) {
      const validEligibility = new Set(dynamicMasterData.eligibilityCodes);
      const result = validateCodeAgainstSet(suggestionValue, validEligibility, r.section_key, 'eligibility');
      if (result.issue) {
        issues.push(result.issue);
        r.suggestion = result.cleaned ? JSON.stringify(result.cleaned) : undefined;
        r.comments = [
          ...(r.comments ?? []),
          { type: 'error', text: result.issue.message },
        ];
      }
    }

    // Validate solution_type against dynamic master data
    if (r.section_key === 'solution_type' && dynamicMasterData?.solutionTypeCodes?.length) {
      const validSolutionTypes = new Set(dynamicMasterData.solutionTypeCodes);
      const result = validateCodeAgainstSet(suggestionValue, validSolutionTypes, r.section_key, 'solution_type');
      if (result.issue) {
        issues.push(result.issue);
        r.suggestion = result.cleaned ? JSON.stringify(result.cleaned) : undefined;
        r.comments = [
          ...(r.comments ?? []),
          { type: 'error', text: result.issue.message },
        ];
      }
    }

    // Validate evaluation_criteria weights
    if (r.section_key === 'evaluation_criteria') {
      const weightIssue = validateEvalCriteriaWeights(r.suggestion, r.section_key);
      if (weightIssue) {
        issues.push(weightIssue);
        r.comments = [
          ...(r.comments ?? []),
          { type: 'warning', text: weightIssue.message },
        ];
      }
    }

    return r;
  });

  return {
    isValid: issues.length === 0,
    issues,
    correctedReviews: corrected,
  };
}
