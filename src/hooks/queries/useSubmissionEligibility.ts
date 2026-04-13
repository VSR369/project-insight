/**
 * useSubmissionEligibility — Checks if a provider meets a challenge's
 * access_type + min_star_tier requirements before allowing submission.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EligibilityResult {
  isEligible: boolean;
  reason: string | null;
  requiredTier: number;
  providerTier: number;
  accessType: string;
  isLoading: boolean;
}

export function useSubmissionEligibility(
  challengeId?: string,
  providerId?: string,
): EligibilityResult {
  const { data, isLoading } = useQuery({
    queryKey: ['submission-eligibility', challengeId, providerId],
    queryFn: async () => {
      // Fetch challenge access rules
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select('access_type, min_star_tier')
        .eq('id', challengeId!)
        .single();

      if (cErr) throw new Error(cErr.message);

      const accessType = challenge.access_type ?? 'open_all';
      const minTier = challenge.min_star_tier ?? 0;

      if (accessType === 'open_all') {
        return { isEligible: true, reason: null, requiredTier: 0, providerTier: 0, accessType };
      }

      // Fetch provider's resolved cert
      const { data: cert } = await supabase
        .from('vw_provider_resolved_cert')
        .select('resolved_star_tier')
        .eq('provider_id', providerId!)
        .maybeSingle();

      const providerTier = cert?.resolved_star_tier ?? 0;

      if (accessType === 'certified_only' && providerTier === 0) {
        return {
          isEligible: false,
          reason: 'This challenge requires a certified provider (any tier).',
          requiredTier: 1,
          providerTier,
          accessType,
        };
      }

      if (accessType === 'star_gated' && providerTier < minTier) {
        const tierLabels: Record<number, string> = { 1: 'Proven', 2: 'Acclaimed', 3: 'Eminent' };
        return {
          isEligible: false,
          reason: `This challenge requires ${tierLabels[minTier] ?? `tier ${minTier}`} certification or higher.`,
          requiredTier: minTier,
          providerTier,
          accessType,
        };
      }

      if (accessType === 'invite_only') {
        return {
          isEligible: false,
          reason: 'This challenge is invite-only.',
          requiredTier: minTier,
          providerTier,
          accessType,
        };
      }

      return { isEligible: true, reason: null, requiredTier: minTier, providerTier, accessType };
    },
    enabled: !!challengeId && !!providerId,
    staleTime: 60_000,
  });

  return {
    isEligible: data?.isEligible ?? false,
    reason: data?.reason ?? null,
    requiredTier: data?.requiredTier ?? 0,
    providerTier: data?.providerTier ?? 0,
    accessType: data?.accessType ?? 'open_all',
    isLoading,
  };
}
