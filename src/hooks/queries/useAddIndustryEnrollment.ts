/**
 * useAddIndustryEnrollment — Provider creation + enrollment logic.
 * Extracted from AddIndustryDialog for R2 layer separation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

interface CreateEnrollmentInput {
  industrySegmentId: string;
  existingProviderId: string | undefined;
  enrollmentCount: number;
}

interface CreateEnrollmentResult {
  providerId: string;
  enrollmentId: string;
  industryName: string | null;
  isNewProvider: boolean;
}

export function useAddIndustryEnrollment(
  createEnrollmentMutation: { mutateAsync: (params: { providerId: string; industrySegmentId: string; isPrimary: boolean }) => Promise<{ id: string; industry_segment?: { name: string } | null }> },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEnrollmentInput): Promise<CreateEnrollmentResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to continue');

      let providerId = input.existingProviderId;
      let isNewProvider = false;

      if (!providerId) {
        // Check for existing provider
        const { data: existing } = await supabase
          .from('solution_providers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          providerId = existing.id;
        } else {
          const providerData = await withCreatedBy({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || 'Provider',
            last_name: user.user_metadata?.last_name || '',
            is_student: user.user_metadata?.is_student || false,
            lifecycle_status: 'registered' as const,
            lifecycle_rank: 10,
            onboarding_status: 'in_progress' as const,
          });

          const { data: newProvider, error: providerError } = await supabase
            .from('solution_providers')
            .insert(providerData)
            .select('id')
            .single();

          if (providerError) {
            if (providerError.code === '23505') {
              const { data: raceProvider } = await supabase
                .from('solution_providers')
                .select('id')
                .eq('user_id', user.id)
                .single();
              if (raceProvider) providerId = raceProvider.id;
              else throw new Error('Failed to create or find provider');
            } else {
              throw new Error('Failed to create profile');
            }
          } else {
            providerId = newProvider.id;
            isNewProvider = true;
          }
        }
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      }

      const enrollment = await createEnrollmentMutation.mutateAsync({
        providerId: providerId!,
        industrySegmentId: input.industrySegmentId,
        isPrimary: input.enrollmentCount === 0,
      });

      return {
        providerId: providerId!,
        enrollmentId: enrollment.id,
        industryName: enrollment.industry_segment?.name ?? null,
        isNewProvider,
      };
    },
    onError: () => {
      toast.error('Failed to create enrollment. Please try again.');
    },
  });
}
