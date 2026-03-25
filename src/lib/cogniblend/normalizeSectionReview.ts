/**
 * normalizeSectionReview.ts — Ensures consistent status/comments contract.
 *
 * Rule: If status === "pass" but comments exist → downgrade to "warning".
 * This prevents confusing UI states where "Pass" is shown alongside warnings.
 */

type ReviewStatus = "pass" | "warning" | "needs_revision";

/**
 * Normalize a single section review.
 * - pass + comments → warning
 * - ensures comments is always an array
 */
export function normalizeSectionReview<T extends { status: ReviewStatus | string; comments: string[] }>(review: T): T {
  const comments = Array.isArray(review.comments) ? review.comments : [];
  const hasActionableComments = comments.length > 0;

  if (review.status === 'pass' && hasActionableComments) {
    return { ...review, status: 'warning' as T['status'], comments };
  }

  return { ...review, comments };
}

/**
 * Normalize an array of section reviews.
 */
export function normalizeSectionReviews<T extends { status: ReviewStatus | string; comments: string[] }>(reviews: T[]): T[] {
  return reviews.map(normalizeSectionReview);
}
