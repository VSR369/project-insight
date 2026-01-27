/**
 * Interview KIT Constants
 * Per Project Knowledge Section 1 - Constants Extraction Pattern
 */

export const COMPETENCY_CONFIG = {
  solution_design: {
    code: 'solution_design',
    label: 'Solution Design & Architecture Thinking',
    icon: 'Lightbulb',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  execution_governance: {
    code: 'execution_governance',
    label: 'Execution & Governance',
    icon: 'Target',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  data_tech_readiness: {
    code: 'data_tech_readiness',
    label: 'Data / Tech Readiness & Tooling Awareness',
    icon: 'Database',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  soft_skills: {
    code: 'soft_skills',
    label: 'Soft Skills for Solution Provider Success',
    icon: 'Users',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  innovation_cocreation: {
    code: 'innovation_cocreation',
    label: 'Innovation & Co-creation Ability',
    icon: 'Sparkles',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
} as const;

export type CompetencyCode = keyof typeof COMPETENCY_CONFIG;

// Import batch sizes (per memory/features/enterprise-import-system-v2)
export const INTERVIEW_KIT_IMPORT_BATCH_SIZE = 100;
export const INTERVIEW_KIT_DELETE_BATCH_SIZE = 50;
export const INTERVIEW_KIT_PAGE_SIZE = 1000;

// =====================================================
// Interview Kit Scoring Constants
// =====================================================

export const RATING_SCORES = {
  right: 5,
  wrong: 0,
  not_answered: 0,
} as const;

export type RatingType = keyof typeof RATING_SCORES;

export const RATING_CONFIG = {
  right: {
    label: 'Right',
    score: 5,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  wrong: {
    label: 'Wrong',
    score: 0,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  not_answered: {
    label: 'Not Answered',
    score: 0,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
  },
} as const;

export const RECOMMENDATION_THRESHOLDS = {
  strong_recommend: { 
    min: 80, 
    label: 'Strong Recommend', 
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  with_conditions: { 
    min: 65, 
    label: 'Recommend with Conditions', 
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  borderline: { 
    min: 50, 
    label: 'Borderline / Re-interview', 
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  not_recommended: { 
    min: 0, 
    label: 'Not Recommended', 
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
  },
} as const;

export type RecommendationType = keyof typeof RECOMMENDATION_THRESHOLDS;

export function getRecommendation(percentage: number): RecommendationType {
  if (percentage >= 80) return 'strong_recommend';
  if (percentage >= 65) return 'with_conditions';
  if (percentage >= 50) return 'borderline';
  return 'not_recommended';
}

// =====================================================
// Proof Point Question Templates
// =====================================================

export const PROOF_POINT_QUESTION_TEMPLATES: Record<string, string[]> = {
  project: [
    "Walk us through the key challenges you faced in '{title}' and how you overcame them.",
    "What measurable outcomes did you achieve with '{title}'?"
  ],
  case_study: [
    "Describe the methodology you used for '{title}'.",
    "What lessons learned from '{title}' would you apply to future work?"
  ],
  certification: [
    "How has obtaining '{title}' influenced your professional approach?",
    "Describe a real scenario where you applied knowledge from '{title}'."
  ],
  award: [
    "What specific achievement led to receiving '{title}'?"
  ],
  publication: [
    "Explain the core thesis of '{title}' and its practical applications."
  ],
  portfolio: [
    "Walk us through a key piece in '{title}' and your creative process."
  ],
  testimonial: [
    "Tell us more about the work that led to this testimonial for '{title}'."
  ],
  other: [
    "Describe the significance of '{title}' in your professional journey."
  ]
};

// Section type constants
export const INTERVIEW_KIT_SECTIONS = {
  domain_delivery: {
    type: 'domain_delivery',
    label: 'Domain & Delivery Depth',
    maxQuestions: 10,
  },
  proof_points: {
    type: 'proof_points',
    label: 'Proof Points Deep-Dive',
    maxQuestionsPerProofPoint: 2,
  },
} as const;
