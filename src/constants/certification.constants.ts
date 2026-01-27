/**
 * Certification Constants
 * 
 * Score weights and certification outcome thresholds for Final Result calculation.
 */

/** Score weightages for composite score calculation */
export const SCORE_WEIGHTS = {
  proofPoints: 0.30,    // 30%
  assessment: 0.50,     // 50%
  interview: 0.20,      // 20%
} as const;

/** Certification outcome thresholds (percentage) */
export const CERTIFICATION_THRESHOLDS = {
  notCertified: 51.0,   // < 51.0% = Not Certified
  oneStar: 66.0,        // 51.0% - 65.9% = One Star
  twoStar: 86.0,        // 66.0% - 85.9% = Two Star
  // >= 86.0% = Three Star
} as const;

/** Certification outcome types */
export type CertificationOutcome = 'not_certified' | 'one_star' | 'two_star' | 'three_star';

/** Stage status types */
export type StageStatus = 'completed' | 'in_progress' | 'not_started';

/** Certification outcome display configuration */
export const OUTCOME_DISPLAY: Record<CertificationOutcome, {
  label: string;
  stars: number;
  colorClass: string;
  bgClass: string;
  textClass: string;
}> = {
  not_certified: {
    label: 'Not Certified',
    stars: 0,
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
  },
  one_star: {
    label: 'Certified',
    stars: 1,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  two_star: {
    label: 'Certified',
    stars: 2,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  three_star: {
    label: 'Certified',
    stars: 3,
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
};

/** Stage status display configuration */
export const STAGE_STATUS_DISPLAY: Record<StageStatus, {
  label: string;
  bgClass: string;
  textClass: string;
  iconClass: string;
}> = {
  completed: {
    label: 'Completed',
    bgClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
    iconClass: 'text-green-600',
  },
  in_progress: {
    label: 'In Progress',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
    iconClass: 'text-amber-600',
  },
  not_started: {
    label: 'Not Started',
    bgClass: 'bg-muted border-muted-foreground/20',
    textClass: 'text-muted-foreground',
    iconClass: 'text-muted-foreground',
  },
};

/**
 * Calculate certification outcome based on composite score
 */
export function getCertificationOutcome(compositeScore: number): CertificationOutcome {
  if (compositeScore < CERTIFICATION_THRESHOLDS.notCertified) return 'not_certified';
  if (compositeScore < CERTIFICATION_THRESHOLDS.oneStar) return 'one_star';
  if (compositeScore < CERTIFICATION_THRESHOLDS.twoStar) return 'two_star';
  return 'three_star';
}

/**
 * Calculate composite score from individual scores
 */
export function calculateCompositeScore(
  proofPointsScore: number | null,
  assessmentPercentage: number | null,
  interviewScore: number | null
): { score: number | null; isComplete: boolean } {
  // All scores must be present for a complete composite
  if (proofPointsScore === null || assessmentPercentage === null || interviewScore === null) {
    return { score: null, isComplete: false };
  }

  // Normalize scores to percentages
  const proofPointsPercent = (proofPointsScore / 10) * 100;    // 0-10 → 0-100
  const interviewPercent = (interviewScore / 10) * 100;        // 0-10 → 0-100

  // Calculate weighted composite
  const compositeScore =
    (proofPointsPercent * SCORE_WEIGHTS.proofPoints) +
    (assessmentPercentage * SCORE_WEIGHTS.assessment) +
    (interviewPercent * SCORE_WEIGHTS.interview);

  // Round to 1 decimal place
  const roundedScore = Math.round(compositeScore * 10) / 10;

  return { score: roundedScore, isComplete: true };
}
