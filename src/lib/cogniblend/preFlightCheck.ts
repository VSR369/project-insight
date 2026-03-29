/**
 * Pre-Flight Gate — validates mandatory section content before global AI review.
 *
 * Tier 1 (mandatory): blocks review if missing.
 * Tier 2 (recommended): warns but allows proceeding.
 */

import type { SectionKey } from '@/types/sections';

export interface PreFlightItem {
  sectionId: SectionKey;
  sectionName: string;
  reason: string;
}

export interface PreFlightResult {
  canProceed: boolean;
  missingMandatory: PreFlightItem[];
  warnings: PreFlightItem[];
}

const MANDATORY_SECTIONS: PreFlightItem[] = [
  {
    sectionId: 'problem_statement',
    sectionName: 'Problem Statement',
    reason: 'Defines what the challenge solves. AI cannot infer this — it must come from the curator or sponsor.',
  },
  {
    sectionId: 'scope',
    sectionName: 'Scope',
    reason: 'Defines the challenge boundary. Without it, AI generates unbounded content.',
  },
];

const RECOMMENDED_SECTIONS: PreFlightItem[] = [
  {
    sectionId: 'context_and_background',
    sectionName: 'Context & Background',
    reason: 'Industry context helps AI produce specific content. Will be AI-generated — review carefully.',
  },
  {
    sectionId: 'expected_outcomes',
    sectionName: 'Expected Outcomes',
    reason: 'Success criteria help calibrate deliverables. Will be AI-derived from scope.',
  },
  {
    sectionId: 'deliverables',
    sectionName: 'Deliverables',
    reason: 'What solvers must produce. AI can infer but may miss sponsor-specific requirements.',
  },
];

function getSectionContent(
  sections: Record<string, string | null | unknown>,
  key: string,
): string {
  const val = sections[key];
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const str = JSON.stringify(val);
    // Empty arrays or objects with no real content
    if (str === '[]' || str === '{}' || str === 'null') return '';
    return str;
  }
  return String(val).trim();
}

export function preFlightCheck(
  sections: Record<string, string | null | unknown>,
): PreFlightResult {
  const missingMandatory: PreFlightItem[] = [];
  const warnings: PreFlightItem[] = [];

  for (const s of MANDATORY_SECTIONS) {
    const content = getSectionContent(sections, s.sectionId);
    if (content.length < 50) {
      missingMandatory.push(s);
    }
  }

  for (const s of RECOMMENDED_SECTIONS) {
    const content = getSectionContent(sections, s.sectionId);
    if (content.length < 30) {
      warnings.push({
        ...s,
        reason: s.reason + ' AI will generate this — review the output carefully.',
      });
    }
  }

  return {
    canProceed: missingMandatory.length === 0,
    missingMandatory,
    warnings,
  };
}
