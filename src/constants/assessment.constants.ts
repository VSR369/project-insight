/**
 * Assessment Constants
 * 
 * Configuration for assessment timing, scoring, and requirements.
 */

/** Default time limit in minutes for an assessment */
export const DEFAULT_TIME_LIMIT_MINUTES = 60;

/** Default number of questions per assessment */
export const DEFAULT_QUESTIONS_PER_ASSESSMENT = 20;

/** Minimum passing score percentage */
export const PASSING_SCORE_PERCENTAGE = 70;

/** Lifecycle rank thresholds for assessment */
export const ASSESSMENT_LIFECYCLE = {
  /** Minimum rank required to start assessment */
  MIN_RANK_TO_START: 70,
  /** Rank when assessment is in progress */
  IN_PROGRESS_RANK: 100,
  /** Rank when assessment is completed (not passed) */
  COMPLETED_RANK: 105,
  /** Rank when assessment is passed */
  PASSED_RANK: 110,
} as const;
