/**
 * challengeNavigation — Governance-aware routing helpers for post-AI-generation flows.
 */

import type { GovernanceMode } from '@/lib/governanceMode';

/**
 * Returns the route to navigate to after AI spec generation, based on governance mode.
 * - QUICK: spec review page (1-click confirm)
 * - STRUCTURED: spec review page (section-by-section edit)
 * - CONTROLLED: side-panel editor (manual entry + AI advisor)
 */
export function getPostGenerationRoute(challengeId: string, mode: GovernanceMode): string {
  if (mode === 'CONTROLLED') {
    return `/cogni/challenges/${challengeId}/controlled-edit`;
  }
  // Both QUICK and STRUCTURED go to spec review — the page renders mode-specific UX
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
