/**
 * challengeNavigation — Governance-aware routing helpers for post-AI-generation flows.
 */

import type { GovernanceMode } from '@/lib/governanceMode';

/**
 * Returns the route to navigate to after AI spec generation, based on governance mode.
 * - QUICK: go to spec review (minimal review)
 * - STRUCTURED: go to spec review (user can optionally refine in Advanced Editor)
 * - CONTROLLED: go to spec review (mandatory Advanced Editor refinement)
 */
export function getPostGenerationRoute(challengeId: string, _mode: GovernanceMode): string {
  // All modes go to spec review first; the spec review page handles mode-specific UX
  return `/cogni/challenges/${challengeId}/spec`;
}

/**
 * Whether the Advanced Editor is mandatory after AI generation.
 * CONTROLLED mode requires manual verification of all fields.
 */
export function shouldRequireAdvancedEditor(mode: GovernanceMode): boolean {
  return mode === 'CONTROLLED';
}

/**
 * Whether the Advanced Editor should be suggested (but not required).
 * STRUCTURED mode benefits from editor refinement.
 */
export function shouldSuggestAdvancedEditor(mode: GovernanceMode): boolean {
  return mode === 'STRUCTURED';
}
