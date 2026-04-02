/**
 * approvalTiers — Constants for Creator tiered approval experience.
 * Groups 27 challenge sections into 3 tiers for structured review.
 */

export interface ApprovalTier {
  id: string;
  label: string;
  description: string;
  defaultExpanded: boolean;
  sections: string[];
}

export const APPROVAL_TIERS: ApprovalTier[] = [
  {
    id: 'your_challenge',
    label: 'Your Challenge',
    description: 'The key sections that define your challenge. Please review carefully.',
    defaultExpanded: true,
    sections: [
      'problem_statement',
      'scope',
      'expected_outcomes',
      'deliverables',
      'reward_structure',
    ],
  },
  {
    id: 'how_it_works',
    label: "How It'll Work",
    description: 'Evaluation criteria, timeline, expertise requirements, and IP terms.',
    defaultExpanded: false,
    sections: [
      'evaluation_criteria',
      'phase_schedule',
      'solver_expertise',
      'submission_guidelines',
      'ip_model',
    ],
  },
  {
    id: 'ai_generated',
    label: 'AI-Generated Details',
    description: 'AI researched and generated these from your input + industry benchmarks.',
    defaultExpanded: false,
    sections: [
      'context_and_background',
      'root_causes',
      'affected_stakeholders',
      'current_deficiencies',
      'preferred_approach',
      'approaches_not_of_interest',
      'solution_type',
      'maturity_level',
      'data_resources_provided',
      'success_metrics_kpis',
      'complexity',
      'eligibility',
      'hook',
      'visibility',
      'domain_tags',
      'legal_docs',
      'escrow_funding',
    ],
  },
];

export function getTierForSection(sectionKey: string): ApprovalTier {
  return APPROVAL_TIERS.find((t) => t.sections.includes(sectionKey)) ?? APPROVAL_TIERS[2];
}
