import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/**
 * Fetch challenges for an organization
 */
export function useOrgChallenges(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-challenges', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, description, status, engagement_model_id, complexity_id,
          consulting_fee, management_fee, total_fee, currency_code,
          payment_status, shadow_fee_amount, max_solutions, solutions_awarded,
          visibility, is_active, created_at,
          md_challenge_complexity(complexity_label, complexity_level),
          md_engagement_models(name, code)
        `)
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch complexity levels
 */
export function useComplexityLevels() {
  return useQuery({
    queryKey: ['complexity-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_challenge_complexity')
        .select('id, complexity_code, complexity_label, complexity_level, consulting_fee_multiplier, management_fee_multiplier, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch engagement models
 */
export function useEngagementModels() {
  return useQuery({
    queryKey: ['engagement-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_engagement_models')
        .select('id, code, name, description, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch solver eligibility categories
 */
export function useSolverEligibility() {
  return useQuery({
    queryKey: ['solver-eligibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_solver_eligibility')
        .select('id, code, label, description, requires_auth, requires_provider_record, requires_certification, min_star_rating, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/**
 * Fetch base fees for a country and tier
 */
export function useBaseFees(countryId: string | undefined, tierId: string | undefined) {
  return useQuery({
    queryKey: ['base-fees', countryId, tierId],
    queryFn: async () => {
      if (!countryId || !tierId) return null;
      const { data, error } = await supabase
        .from('md_challenge_base_fees')
        .select('consulting_base_fee, management_base_fee, currency_code')
        .eq('country_id', countryId)
        .eq('tier_id', tierId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId && !!tierId,
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Create a new challenge
 */
export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenantId: string;
      organizationId: string;
      title: string;
      description?: string;
      engagementModelId: string;
      complexityId: string;
      consultingFee: number;
      managementFee: number;
      totalFee: number;
      currencyCode: string;
      maxSolutions: number;
      shadowFeeAmount?: number;
      visibility?: string;
      solverEligibilityId?: string;
    }) => {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          tenant_id: params.tenantId,
          organization_id: params.organizationId,
          title: params.title,
          description: params.description ?? null,
          engagement_model_id: params.engagementModelId,
          complexity_id: params.complexityId,
          consulting_fee: params.consultingFee,
          management_fee: params.managementFee,
          total_fee: params.totalFee,
          currency_code: params.currencyCode,
          max_solutions: params.maxSolutions,
          shadow_fee_amount: params.shadowFeeAmount ?? null,
          visibility: params.visibility ?? 'private',
          solver_eligibility_id: params.solverEligibilityId ?? null,
          status: 'draft',
          payment_status: 'pending',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-challenges', vars.organizationId] });
      toast.success('Challenge created successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_challenge' });
    },
  });
}
