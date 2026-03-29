/**
 * normalizeSectionReview.ts — Ensures consistent status/comments contract.
 *
 * Updated for multi-tier comments: only downgrade pass→warning if comments
 * contain error or warning types. Strength/best_practice/suggestion comments
 * keep the "pass" status.
 */

type ReviewStatus = "pass" | "warning" | "needs_revision" | "generated";

/** Comment can be a string (legacy) or structured object (multi-tier) */
type AnyComment = string | { text?: string; type?: string; severity?: string; [key: string]: unknown };

/**
 * Check if a comment represents a high-severity issue (error or warning).
 */
function isHighSeverityComment(c: AnyComment): boolean {
  if (typeof c === 'string') return true; // Legacy string comments are treated as warnings
  const type = c.type || c.severity;
  return type === 'error' || type === 'warning' || type === 'required';
}

/**
 * Normalize a single section review.
 * - pass + high-severity comments → warning
 * - pass + only strength/best_practice/suggestion comments → stays pass
 * - ensures comments is always an array
 */
export function normalizeSectionReview<T extends { status: ReviewStatus | string; comments: AnyComment[] }>(review: T): T {
  const comments = Array.isArray(review.comments) ? review.comments : [];
  const hasHighSeverity = comments.some(isHighSeverityComment);

  if (review.status === 'pass' && hasHighSeverity) {
    return { ...review, status: 'warning' as T['status'], comments };
  }

  return { ...review, comments };
}

/**
 * Normalize an array of section reviews.
 */
export function normalizeSectionReviews<T extends { status: ReviewStatus | string; comments: AnyComment[] }>(reviews: T[]): T[] {
  return reviews.map(normalizeSectionReview);
}
