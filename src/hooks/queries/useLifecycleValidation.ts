/**
 * Lifecycle Validation Hooks
 * 
 * React Query hooks for lifecycle validation and cascade impact detection.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from './useProvider';
import {
  canModifyField,
  getCascadeImpact,
  isWizardStepLocked,
  getLifecycleRank,
  type FieldCategory,
  type LockCheckResult,
  type CascadeImpact,
  LIFECYCLE_RANKS,
} from '@/services/lifecycleService';

export interface LifecycleStage {
  id: string;
  status_code: string;
  rank: number;
  display_name: string;
  description: string | null;
  locks_configuration: boolean;
  locks_content: boolean;
  locks_everything: boolean;
}

/**
 * Fetch all lifecycle stages from the database
 */
export function useLifecycleStages() {
  return useQuery({
    queryKey: ['lifecycle-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lifecycle_stages')
        .select('*')
        .eq('is_active', true)
        .order('rank', { ascending: true });

      if (error) throw error;
      return data as LifecycleStage[];
    },
    staleTime: Infinity, // Reference data, rarely changes
  });
}

/**
 * Hook to check if a field category can be modified based on current lifecycle
 * 
 * @param fieldCategory - Category of fields to check
 * @returns LockCheckResult with allowed status and reason
 */
export function useCanModifyField(fieldCategory: FieldCategory): LockCheckResult & { isLoading: boolean } {
  const { data: provider, isLoading } = useCurrentProvider();

  return useMemo(() => {
    if (isLoading) {
      return { allowed: false, reason: 'Loading...', isLoading: true };
    }

    if (!provider) {
      return { allowed: false, reason: 'Provider not found', isLoading: false };
    }

    const result = canModifyField(provider.lifecycle_rank, fieldCategory);
    return { ...result, isLoading: false };
  }, [provider?.lifecycle_rank, fieldCategory, isLoading]);
}

/**
 * Hook to get cascade impact for a field change
 * 
 * @param fieldName - Name of the field that might change
 * @returns CascadeImpact or null if loading
 */
export function useCascadeImpact(fieldName: string): {
  impact: CascadeImpact | null;
  isLoading: boolean;
} {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();

  // Check for specialty proof points
  const { data: proofPointCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['proof-point-counts', provider?.id],
    queryFn: async () => {
      if (!provider?.id) return { specialty: 0, general: 0 };

      const { data, error } = await supabase
        .from('proof_points')
        .select('category')
        .eq('provider_id', provider.id)
        .eq('is_deleted', false);

      if (error) throw error;

      const specialty = data?.filter(p => p.category === 'specialty_specific').length ?? 0;
      const general = data?.filter(p => p.category === 'general').length ?? 0;

      return { specialty, general };
    },
    enabled: !!provider?.id,
    staleTime: 30000,
  });

  return useMemo(() => {
    const isLoading = providerLoading || countsLoading;

    if (isLoading || !provider) {
      return { impact: null, isLoading };
    }

    const hasExpertiseSelected = !!provider.expertise_level_id;
    const hasSpecialtyProofPoints = (proofPointCounts?.specialty ?? 0) > 0;

    const impact = getCascadeImpact(
      fieldName,
      provider.lifecycle_rank,
      hasExpertiseSelected,
      hasSpecialtyProofPoints
    );

    return { impact, isLoading: false };
  }, [provider, fieldName, proofPointCounts, providerLoading, countsLoading]);
}

/**
 * Hook to get cascade impact counts for confirmation dialogs
 */
export function useCascadeImpactCounts() {
  const { data: provider } = useCurrentProvider();

  return useQuery({
    queryKey: ['cascade-impact-counts', provider?.id],
    queryFn: async () => {
      if (!provider?.id) {
        return {
          specialty_proof_points_count: 0,
          general_proof_points_count: 0,
          specialities_count: 0,
          proficiency_areas_count: 0,
        };
      }

      const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
        p_provider_id: provider.id,
      });

      if (error) throw error;
      return data?.[0] ?? {
        specialty_proof_points_count: 0,
        general_proof_points_count: 0,
        specialities_count: 0,
        proficiency_areas_count: 0,
      };
    },
    enabled: !!provider?.id,
    staleTime: 30000,
  });
}

/**
 * Hook to check if a wizard step is locked
 * 
 * @param stepId - Wizard step ID (1-9)
 * @returns boolean indicating if step is locked
 */
export function useIsStepLocked(stepId: number): {
  isLocked: boolean;
  isLoading: boolean;
} {
  const { data: provider, isLoading } = useCurrentProvider();

  return useMemo(() => {
    if (isLoading || !provider) {
      return { isLocked: false, isLoading };
    }

    return {
      isLocked: isWizardStepLocked(stepId, provider.lifecycle_rank),
      isLoading: false,
    };
  }, [provider?.lifecycle_rank, stepId, isLoading]);
}

/**
 * Hook to get step lock status function for WizardStepper
 */
export function useStepLockChecker(): (stepId: number) => boolean {
  const { data: provider } = useCurrentProvider();

  return useMemo(() => {
    return (stepId: number): boolean => {
      if (!provider?.lifecycle_rank) return false;
      return isWizardStepLocked(stepId, provider.lifecycle_rank);
    };
  }, [provider?.lifecycle_rank]);
}

/**
 * Hook to fetch system settings
 */
export function useSystemSetting(settingKey: string) {
  return useQuery({
    queryKey: ['system-setting', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (error) throw error;
      return data?.setting_value as { value: number } | null;
    },
    staleTime: Infinity, // System settings rarely change
  });
}

/**
 * Hook to get minimum proof points required
 */
export function useMinProofPointsRequired() {
  const { data } = useSystemSetting('proof_points_minimum');
  return data?.value ?? 2; // Default to 2
}

/**
 * Hook to check if terminal state is reached
 */
export function useIsTerminalState(): {
  isTerminal: boolean;
  status: string | null;
  isLoading: boolean;
} {
  const { data: provider, isLoading } = useCurrentProvider();

  return useMemo(() => {
    if (isLoading || !provider) {
      return { isTerminal: false, status: null, isLoading };
    }

    const terminalStatuses = ['verified', 'certified', 'not_verified', 'active', 'suspended', 'inactive'];
    const isTerminal = terminalStatuses.includes(provider.lifecycle_status);

    return {
      isTerminal,
      status: provider.lifecycle_status,
      isLoading: false,
    };
  }, [provider, isLoading]);
}

// Re-export types and constants for convenience
export { LIFECYCLE_RANKS, type FieldCategory, type LockCheckResult, type CascadeImpact };
