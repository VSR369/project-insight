/**
 * sectionRoutes — unit tests
 *
 * Aligned to corrected test specs:
 * G-05/R-05: Edge function routing per section key
 *
 * Note: These routes are used by useAiSectionReview.review() and reReview(),
 * NOT by the global handleAIReview pipeline (which hardcodes edge function names).
 */

import { describe, it, expect } from 'vitest';
import { getReviewRoute, DEFAULT_REVIEW_ROUTE, SECTION_REVIEW_ROUTES } from '@/lib/sectionRoutes';
import type { SectionKey } from '@/types/sections';

describe('getReviewRoute — R-05: correct edge function per section', () => {
  it('complexity → assess-complexity', () => {
    expect(getReviewRoute('complexity' as SectionKey)).toBe('assess-complexity');
  });

  it('reward_structure → refine-challenge-section', () => {
    expect(getReviewRoute('reward_structure' as SectionKey)).toBe('refine-challenge-section');
  });

  it('all other sections → review-challenge-sections (default)', () => {
    const defaultSections: SectionKey[] = [
      'problem_statement',
      'scope',
      'hook',
      'deliverables',
      'evaluation_criteria',
      'phase_schedule',
      'ip_model',
      'maturity_level',
      'eligibility',
      'domain_tags',
      'expected_outcomes',
      'extended_brief',
    ] as SectionKey[];

    for (const key of defaultSections) {
      expect(getReviewRoute(key)).toBe(DEFAULT_REVIEW_ROUTE);
    }
  });

  it('SECTION_REVIEW_ROUTES only has explicit overrides', () => {
    const overrideKeys = Object.keys(SECTION_REVIEW_ROUTES);
    expect(overrideKeys).toHaveLength(2);
    expect(overrideKeys).toContain('complexity');
    expect(overrideKeys).toContain('reward_structure');
  });
});
