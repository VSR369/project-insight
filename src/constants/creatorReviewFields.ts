/**
 * creatorReviewFields — Maps governance mode to the Creator-owned fields for AI Review.
 * QUICK: 5 fields | STRUCTURED: 8 fields | CONTROLLED: 12 fields
 */

import type { GovernanceMode } from '@/lib/governanceMode';

export interface ReviewFieldDef {
  key: string;
  label: string;
}

const QUICK_FIELDS: ReviewFieldDef[] = [
  { key: 'title', label: 'Challenge Title' },
  { key: 'problem_statement', label: 'Problem Statement' },
  { key: 'domain_tags', label: 'Domain Tags' },
  { key: 'currency_code', label: 'Currency' },
  { key: 'platinum_award', label: 'Top Prize' },
];

const STRUCTURED_FIELDS: ReviewFieldDef[] = [
  ...QUICK_FIELDS,
  { key: 'scope', label: 'Scope & Constraints' },
  { key: 'maturity_level', label: 'Solution Maturity' },
  { key: 'weighted_criteria', label: 'Evaluation Criteria' },
];

const CONTROLLED_FIELDS: ReviewFieldDef[] = [
  ...STRUCTURED_FIELDS,
  { key: 'hook', label: 'One-Line Summary' },
  { key: 'context_background', label: 'Organization Context' },
  { key: 'ip_model', label: 'IP Preference' },
  { key: 'expected_timeline', label: 'Expected Timeline' },
];

export const CREATOR_REVIEW_FIELDS: Record<GovernanceMode, ReviewFieldDef[]> = {
  QUICK: QUICK_FIELDS,
  STRUCTURED: STRUCTURED_FIELDS,
  CONTROLLED: CONTROLLED_FIELDS,
};
