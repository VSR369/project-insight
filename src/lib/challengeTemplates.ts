/**
 * Challenge Templates — 8 pre-defined templates to solve the blank-canvas problem.
 * Each template pre-fills key wizard fields (problem_statement, maturity_level, domain_tags).
 * No DB table needed — these are client-side constants.
 */

import type { ChallengeFormValues } from '@/components/cogniblend/challenge-wizard/challengeFormSchema';

export interface ChallengeTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Partial form values to merge into the wizard on selection */
  prefill: Partial<ChallengeFormValues>;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'product-innovation',
    name: 'Product Innovation',
    emoji: '🚀',
    description: 'Discover new product ideas, features, or improvements driven by user needs',
    prefill: {
      maturity_level: 'blueprint',
      domain_tags: ['Innovation', 'Product Development'],
      problem_statement: '',
    },
  },
  {
    id: 'process-improvement',
    name: 'Process Improvement',
    emoji: '⚙️',
    description: 'Optimize existing workflows, reduce costs, or increase efficiency',
    prefill: {
      maturity_level: 'poc',
      domain_tags: ['Process Optimization'],
      problem_statement: '',
    },
  },
  {
    id: 'research-question',
    name: 'Research Question',
    emoji: '🔬',
    description: 'Pose an open research question and invite rigorous, evidence-based answers',
    prefill: {
      maturity_level: 'blueprint',
      domain_tags: ['Research', 'Analysis'],
      problem_statement: '',
    },
  },
  {
    id: 'design-challenge',
    name: 'Design Challenge',
    emoji: '🎨',
    description: 'Seek creative design solutions for UX, architecture, or visual problems',
    prefill: {
      maturity_level: 'prototype',
      domain_tags: ['Design', 'User Experience'],
      problem_statement: '',
    },
  },
  {
    id: 'technical-problem',
    name: 'Technical Problem',
    emoji: '🔧',
    description: 'Solve a specific engineering, integration, or systems challenge',
    prefill: {
      maturity_level: 'poc',
      domain_tags: ['Engineering', 'Technology'],
      problem_statement: '',
    },
  },
  {
    id: 'social-impact',
    name: 'Social Impact',
    emoji: '🌍',
    description: 'Address community, environmental, or societal challenges with innovative solutions',
    prefill: {
      maturity_level: 'pilot',
      domain_tags: ['Social Impact', 'Sustainability'],
      problem_statement: '',
    },
  },
  {
    id: 'data-science',
    name: 'Data Science',
    emoji: '📊',
    description: 'Build predictive models, algorithms, or data pipelines for analytical challenges',
    prefill: {
      maturity_level: 'poc',
      domain_tags: ['Data Science', 'AI/ML'],
      problem_statement: '',
    },
  },
  {
    id: 'start-from-scratch',
    name: 'Start from Scratch',
    emoji: '✨',
    description: 'Begin with a blank canvas and define everything yourself',
    prefill: {},
  },
];
