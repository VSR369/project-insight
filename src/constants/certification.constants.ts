/**
 * Certification Constants
 * 
 * Score weights, certification outcome thresholds, and display configuration
 * for Final Result calculation.
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
  oneStar: 66.0,        // 51.0% - 65.9% = One Star (Basic)
  twoStar: 86.0,        // 66.0% - 85.9% = Two Star (Competent)
  // >= 86.0% = Three Star (Expert)
} as const;

/** Certification outcome types */
export type CertificationOutcome = 'interview_unsuccessful' | 'one_star' | 'two_star' | 'three_star';

/** Stage status types */
export type StageStatus = 'completed' | 'in_progress' | 'not_started';

/** Certification level types (stored in database) */
export type CertificationLevel = 'proven' | 'acclaimed' | 'eminent';

/** Certification outcome display configuration */
export const OUTCOME_DISPLAY: Record<CertificationOutcome, {
  label: string;
  stars: number;
  level: CertificationLevel | null;
  colorClass: string;
  bgClass: string;
  textClass: string;
}> = {
  interview_unsuccessful: {
    label: 'Interview Unsuccessful',
    stars: 0,
    level: null,
    colorClass: 'text-amber-600',  // Changed from destructive to encourage retry
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  one_star: {
    label: 'Certified',
    stars: 1,
    level: 'basic',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  two_star: {
    label: 'Certified',
    stars: 2,
    level: 'competent',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  three_star: {
    label: 'Certified',
    stars: 3,
    level: 'expert',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
  },
};

/** Certification level display configuration */
export const CERTIFICATION_LEVELS: Record<CertificationLevel, {
  label: string;
  description: string;
  stars: number;
  minScore: number;
  maxScore: number;
}> = {
  basic: {
    label: 'Basic',
    description: 'Entry-level certification',
    stars: 1,
    minScore: 51.0,
    maxScore: 65.9,
  },
  competent: {
    label: 'Competent',
    description: 'Professional-level certification',
    stars: 2,
    minScore: 66.0,
    maxScore: 85.9,
  },
  expert: {
    label: 'Expert',
    description: 'Expert-level certification',
    stars: 3,
    minScore: 86.0,
    maxScore: 100.0,
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
  if (compositeScore < CERTIFICATION_THRESHOLDS.notCertified) return 'interview_unsuccessful';
  if (compositeScore < CERTIFICATION_THRESHOLDS.oneStar) return 'one_star';
  if (compositeScore < CERTIFICATION_THRESHOLDS.twoStar) return 'two_star';
  return 'three_star';
}

/**
 * Map certification outcome to certification level
 */
export function outcomeToLevel(outcome: CertificationOutcome): CertificationLevel | null {
  return OUTCOME_DISPLAY[outcome].level;
}

/**
 * Map star rating to certification level
 */
export function starRatingToLevel(starRating: number | null): CertificationLevel | null {
  if (starRating === null || starRating === 0) return null;
  if (starRating === 1) return 'proven';
  if (starRating === 2) return 'acclaimed';
  return 'eminent';
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
