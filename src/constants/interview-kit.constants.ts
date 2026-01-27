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
