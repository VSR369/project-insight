/**
 * Interview Kit Scoring Constants
 * Per Project Knowledge Section 1 - Constants Extraction Pattern
 */

export const INTERVIEW_RATING_POINTS = {
  right: 5,
  wrong: 0,
  not_answered: 0,
} as const;

export type InterviewRating = keyof typeof INTERVIEW_RATING_POINTS;

export const INTERVIEW_RATING_LABELS: Record<InterviewRating, string> = {
  right: 'Right',
  wrong: 'Wrong',
  not_answered: 'Not Answered',
};

export const INTERVIEW_RATING_COLORS: Record<InterviewRating, { bg: string; text: string; border: string }> = {
  right: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  wrong: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  not_answered: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
};

export const RECOMMENDATION_THRESHOLDS = {
  strong_recommend: 80,
  recommend_with_conditions: 65,
  borderline: 50,
  not_recommended: 0,
} as const;

export type RecommendationLevel = keyof typeof RECOMMENDATION_THRESHOLDS;

export const RECOMMENDATION_CONFIG: Record<RecommendationLevel, { label: string; color: string; bgColor: string }> = {
  strong_recommend: {
    label: 'Strong Recommend',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  recommend_with_conditions: {
    label: 'Recommend with Conditions',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  borderline: {
    label: 'Borderline / Re-interview',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  not_recommended: {
    label: 'Not Recommended',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export const INTERVIEW_SECTIONS = {
  domain_delivery: {
    name: 'Domain & Delivery Depth',
    source: 'question_bank',
    description: 'Questions from the Question Bank based on provider specialities',
  },
  proof_points: {
    name: 'Proof Points Deep-Dive',
    source: 'proof_point',
    description: 'Follow-up questions to validate real-world experience from proof points',
  },
} as const;

// Questions per section limits
export const QUESTIONS_PER_COMPETENCY = { min: 2, max: 3 };
export const QUESTIONS_PER_PROOF_POINT = { min: 1, max: 2 };
export const DOMAIN_QUESTIONS_LIMIT = 5;

// Helper function to get recommendation level based on percentage
export function getRecommendationLevel(percentage: number): RecommendationLevel {
  if (percentage >= RECOMMENDATION_THRESHOLDS.strong_recommend) return 'strong_recommend';
  if (percentage >= RECOMMENDATION_THRESHOLDS.recommend_with_conditions) return 'recommend_with_conditions';
  if (percentage >= RECOMMENDATION_THRESHOLDS.borderline) return 'borderline';
  return 'not_recommended';
}

// Helper function to calculate score
export function calculateInterviewScore(ratings: InterviewRating[]): {
  earned: number;
  max: number;
  percentage: number;
  recommendation: RecommendationLevel;
} {
  const earned = ratings.reduce((sum, rating) => sum + INTERVIEW_RATING_POINTS[rating], 0);
  const max = ratings.length * INTERVIEW_RATING_POINTS.right;
  const percentage = max > 0 ? (earned / max) * 100 : 0;
  const recommendation = getRecommendationLevel(percentage);

  return { earned, max, percentage, recommendation };
}
