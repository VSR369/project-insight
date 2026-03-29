/**
 * Completeness Check Engine
 *
 * Runs a 10-point concept-level gap analysis across all sections
 * to determine if a challenge is structurally complete.
 */

export interface CompletenessCheckDef {
  id: string;
  concept: string;
  question: string;
  check_sections: string[];
  criticality: 'error' | 'warning' | 'conditional';
  condition_field: string | null;
  condition_value: string | null;
  remediation_hint: string;
  display_order: number;
}

export interface CompletenessFailure {
  concept: string;
  question: string;
  criticality: 'error' | 'warning';
  remediationHint: string;
  missingSections: string[];
}

export interface CompletenessResult {
  totalChecks: number;
  passed: number;
  failed: CompletenessFailure[];
  score: number; // 0–100
}

const CONTENT_THRESHOLD = 50;
const SECTION_THRESHOLD = 30;

/**
 * Run completeness check against section contents and challenge metadata.
 */
export function runCompletenessCheck(
  checks: CompletenessCheckDef[],
  sectionContents: Record<string, string | null>,
  metadata: Record<string, unknown>,
): CompletenessResult {
  const failures: CompletenessFailure[] = [];
  let applicableCount = 0;

  for (const check of checks) {
    // Skip conditional checks if condition not met
    if (check.criticality === 'conditional' && check.condition_field && check.condition_value) {
      if (String(metadata[check.condition_field] ?? '') !== check.condition_value) {
        continue;
      }
    }

    applicableCount++;

    // Check if ANY relevant sections contain content addressing this concept
    const relevantContent = check.check_sections
      .map((id) => sectionContents[id] ?? '')
      .join(' ');

    const hasContent = relevantContent.trim().length > CONTENT_THRESHOLD;

    if (!hasContent) {
      failures.push({
        concept: check.concept,
        question: check.question,
        criticality: check.criticality === 'conditional' ? 'warning' : check.criticality,
        remediationHint: check.remediation_hint,
        missingSections: check.check_sections.filter(
          (id) => !sectionContents[id] || (sectionContents[id]?.trim().length ?? 0) < SECTION_THRESHOLD,
        ),
      });
    }
  }

  const passed = applicableCount - failures.length;

  return {
    totalChecks: applicableCount,
    passed,
    failed: failures,
    score: applicableCount > 0 ? Math.round((passed / applicableCount) * 100) : 100,
  };
}
