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
  challenge_visibility: string;
  challenge_enrollment: string;
  challenge_submission: string;
  eligibility_model: string;
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
