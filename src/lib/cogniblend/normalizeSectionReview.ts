/**
 * normalizeSectionReview.ts — Ensures consistent status/comments contract.
 *
 * Rule: If status === "pass" but comments exist → downgrade to "warning".
 * This prevents confusing UI states where "Pass" is shown alongside warnings.
 */

export interface NormalizableReview {
  section_key: string;
  status: string;
  comments: string[];
  [key: string]: unknown;
}

/**
 * Normalize a single section review.
 * - pass + comments → warning
 * - ensures comments is always an array
 */
export function normalizeSectionReview<T extends NormalizableReview>(review: T): T {
  const comments = Array.isArray(review.comments) ? review.comments : [];
  const hasActionableComments = comments.length > 0;

  if (review.status === 'pass' && hasActionableComments) {
    return { ...review, status: 'warning', comments };
  }

  return { ...review, comments };
}

/**
 * Normalize an array of section reviews.
 */
export function normalizeSectionReviews<T extends NormalizableReview>(reviews: T[]): T[] {
  return reviews.map(normalizeSectionReview);
}
