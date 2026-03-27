/**
 * Edge function routing map for AI section reviews.
 *
 * Each section that needs a non-default edge function is listed here.
 * The unified hook does: SECTION_REVIEW_ROUTES[sectionId] ?? DEFAULT_REVIEW_ROUTE
 * No if/else chains — new sections just need an entry.
 */

import type { SectionKey } from '@/types/sections';

export const DEFAULT_REVIEW_ROUTE = 'review-challenge-sections';

export const SECTION_REVIEW_ROUTES: Partial<Record<SectionKey, string>> = {
  reward_structure: 'refine-challenge-section',
};

/**
 * Get the edge function name for reviewing a given section.
 */
export function getReviewRoute(sectionKey: SectionKey): string {
  return SECTION_REVIEW_ROUTES[sectionKey] ?? DEFAULT_REVIEW_ROUTE;
}
