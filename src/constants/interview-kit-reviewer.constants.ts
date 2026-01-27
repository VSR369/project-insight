/**
 * Interview Kit Reviewer Constants
 * Constants for the Interview Kit tab in reviewer Candidate Detail page
 * Per Project Knowledge Section 1 - Constants Extraction Pattern
 */

// =====================================================
// Question Generation Limits
// =====================================================

/** Maximum domain questions from question_bank */
export const DOMAIN_QUESTION_MAX = 10;

/** Competency questions per section */
export const COMPETENCY_QUESTIONS_PER_SECTION = {
  min: 1,
  max: 2,
} as const;

/** Proof point follow-up questions per proof point */
export const PROOF_POINT_QUESTIONS_PER_ITEM = {
  min: 1,
  max: 2,
} as const;

// =====================================================
// Rating & Scoring
// =====================================================

/** Rating values for interview questions */
export const RATING_VALUES = {
  right: 5,
  wrong: 0,
  not_answered: 0,
} as const;

export type InterviewRating = keyof typeof RATING_VALUES;

/** Rating display configuration */
export const RATING_CONFIG: Record<InterviewRating, { label: string; points: number; color: string; bgColor: string }> = {
  right: { 
    label: 'Right', 
    points: 5, 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-950/30' 
  },
  wrong: { 
    label: 'Wrong', 
    points: 0, 
    color: 'text-red-700 dark:text-red-400', 
    bgColor: 'bg-red-100 dark:bg-red-950/30' 
  },
  not_answered: { 
    label: 'Not Answered', 
    points: 0, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted' 
  },
} as const;

// =====================================================
// Panel Recommendation Thresholds
// =====================================================

export const RECOMMENDATION_THRESHOLDS = {
  strong_recommend: { min: 80, label: 'Strong Recommend', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-950/30', borderColor: 'border-green-300' },
  recommend_with_conditions: { min: 65, label: 'Recommend with Conditions', color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-950/30', borderColor: 'border-amber-300' },
  borderline: { min: 50, label: 'Borderline / Re-interview', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-950/30', borderColor: 'border-orange-300' },
  not_recommended: { min: 0, label: 'Not Recommended', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-950/30', borderColor: 'border-red-300' },
} as const;

export type RecommendationType = keyof typeof RECOMMENDATION_THRESHOLDS;

// =====================================================
// Question Source Types
// =====================================================

export const QUESTION_SOURCE = {
  question_bank: 'question_bank',
  interview_kit: 'interview_kit',
  proof_point: 'proof_point',
  reviewer_custom: 'reviewer_custom',
} as const;

export type QuestionSource = typeof QUESTION_SOURCE[keyof typeof QUESTION_SOURCE];

// =====================================================
// Section Types
// =====================================================

export const SECTION_TYPE = {
  domain: 'domain',
  competency: 'competency',
  proof_point: 'proof_point',
  custom: 'custom',
} as const;

export type SectionType = typeof SECTION_TYPE[keyof typeof SECTION_TYPE];

// =====================================================
// Section Configuration
// =====================================================

export const SECTION_CONFIG = {
  domain: {
    name: 'Domain & Delivery Depth',
    sectionType: 'domain',
    icon: 'BookOpen',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  proof_point: {
    name: 'Proof Points Deep-Dive',
    sectionType: 'proof_point',
    icon: 'Award',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
} as const;

// =====================================================
// Proof Point Question Templates
// =====================================================

/** Templates for generating proof point follow-up questions */
export const PROOF_POINT_QUESTION_TEMPLATES = [
  'Regarding your proof point "{title}": What specific metrics or outcomes resulted from this work?',
  'What was the biggest challenge you faced in "{title}" and how did you overcome it?',
  'How would you apply the learnings from "{title}" to a new engagement in a different context?',
  'Can you walk me through the methodology you used for "{title}" and why you chose that approach?',
  'What stakeholders were involved in "{title}" and how did you manage their expectations?',
] as const;

/** Default expected answer guidance for proof point questions */
export const PROOF_POINT_DEFAULT_GUIDANCE = 
  'Look for: Specific metrics and measurable outcomes, clear methodology, stakeholder management skills, problem-solving approach, and ability to apply learnings to new situations.';

// =====================================================
// Display Order Priorities
// =====================================================

export const SECTION_DISPLAY_ORDER = {
  domain: 100,
  proof_point: 200,
  competency_base: 300, // Competencies start at 300, incremented by display_order
} as const;
