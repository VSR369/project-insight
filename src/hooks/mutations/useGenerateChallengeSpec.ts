/**
 * useGenerateChallengeSpec — Mutation hook for AI challenge spec generation.
 * Calls the generate-challenge-spec edge function and returns structured fields.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export interface GenerateSpecRequest {
  problem_statement: string;
  maturity_level: string;
  template_id?: string;
}

export interface SolverEligibilityDetail {
  code: string;
  label: string;
  description: string | null;
  requires_auth: boolean;
  requires_provider_record: boolean;
  requires_certification: boolean;
}

export interface ScoringRubricLevel {
  score: number;
  label: string;
  description: string;
}

export interface ScoringRubric {
  criterion_name: string;
  levels: ScoringRubricLevel[];
}

export interface ExtendedBrief {
  context_background: string;
  root_causes: string;
  affected_stakeholders: string[];
  current_deficiencies: string;
  preferred_approach: string;
  approaches_not_of_interest: string;
  scoring_rubrics: ScoringRubric[];
  
  reward_description: string;
  phase_notes: string;
  complexity_notes: string;
}

export interface GeneratedSpec {
  title: string;
  problem_statement: string;
  scope: string;
  description: string;
  deliverables: string[];
  evaluation_criteria: Array<{ name: string; weight: number; description: string }>;
  eligibility: string;
  hook: string;
  ip_model: string;
  /** AI-selected solver category codes for submission eligibility */
  solver_eligibility_codes: string[];
  /** Full details of eligible solver categories (hydrated by edge function) */
  solver_eligibility_details: SolverEligibilityDetail[];
  /** AI-selected solver category codes for view-only visibility */
  visible_solver_codes: string[];
  /** Full details of visible solver categories (hydrated by edge function) */
  solver_visibility_details: SolverEligibilityDetail[];
  /** Free-text eligibility notes */
  eligibility_notes: string;
  /** Extended brief containing Category B AI-generated fields */
  /** Extended brief containing Category B AI-generated fields */
  extended_brief?: ExtendedBrief;
}

export function useGenerateChallengeSpec() {
  return useMutation({
    mutationFn: async (request: GenerateSpecRequest): Promise<GeneratedSpec> => {
      const { data, error } = await supabase.functions.invoke('generate-challenge-spec', {
        body: request,
      });

      if (error) throw new Error(error.message || 'Failed to generate spec');
      if (!data?.success) throw new Error(data?.error?.message || 'AI generation failed');

      return data.data as GeneratedSpec;
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        toast.error('AI is busy. Please wait a moment and try again.');
      } else if (error.message.includes('credits') || error.message.includes('402')) {
        toast.error('AI credits exhausted. Contact support for more.');
      } else {
        handleMutationError(error, { operation: 'generate_challenge_spec' });
      }
    },
  });
}
