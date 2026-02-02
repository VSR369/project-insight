/**
 * Lifecycle Validation Hooks
 * 
 * React Query hooks for lifecycle validation and cascade impact detection.
 */

import { useMemo, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from './useProvider';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
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
 * IMPORTANT: Uses ENROLLMENT lifecycle rank for multi-industry isolation
 * 
 * @param fieldCategory - Category of fields to check
 * @returns LockCheckResult with allowed status and reason
 */
export function useCanModifyField(fieldCategory: FieldCategory): LockCheckResult & { isLoading: boolean } {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();

  return useMemo(() => {
    const isLoading = providerLoading || (enrollmentContext?.isLoading ?? false);
    
    if (isLoading) {
      return { allowed: false, reason: 'Loading...', isLoading: true };
    }

    // New users (no provider yet) should have full access to all fields
    if (!provider) {
      return { allowed: true, reason: undefined, isLoading: false };
    }

    // Use enrollment lifecycle rank if available, fallback to provider for backward compatibility
    const lifecycleRank = enrollmentContext?.activeLifecycleRank ?? provider.lifecycle_rank;
    const result = canModifyField(lifecycleRank, fieldCategory);
    return { ...result, isLoading: false };
  }, [provider, enrollmentContext?.activeLifecycleRank, enrollmentContext?.isLoading, fieldCategory, providerLoading]);
}

/**
 * Hook to get cascade impact for a field change
 * IMPORTANT: Uses ENROLLMENT lifecycle rank and data for multi-industry isolation
 * 
 * @param fieldName - Name of the field that might change
 * @returns CascadeImpact or null if loading
 */
export function useCascadeImpact(fieldName: string): {
  impact: CascadeImpact | null;
  isLoading: boolean;
} {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();
  const activeEnrollment = enrollmentContext?.activeEnrollment;

  // Check for specialty proof points - scoped to enrollment if available
  const { data: proofPointCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['proof-point-counts', provider?.id, activeEnrollment?.industry_segment_id],
    queryFn: async () => {
      if (!provider?.id) return { specialty: 0, general: 0 };

      let query = supabase
        .from('proof_points')
        .select('category')
        .eq('provider_id', provider.id)
        .eq('is_deleted', false);
      
      // Scope to active industry if available
      if (activeEnrollment?.industry_segment_id) {
        query = query.eq('industry_segment_id', activeEnrollment.industry_segment_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const specialty = data?.filter(p => p.category === 'specialty_specific').length ?? 0;
      const general = data?.filter(p => p.category === 'general').length ?? 0;

      return { specialty, general };
    },
    enabled: !!provider?.id,
    staleTime: 30000,
  });

  return useMemo(() => {
    const isLoading = providerLoading || countsLoading || (enrollmentContext?.isLoading ?? false);

    if (isLoading || !provider) {
      return { impact: null, isLoading };
    }

    // Use enrollment data if available, fallback to provider
    const hasExpertiseSelected = !!(activeEnrollment?.expertise_level_id ?? provider.expertise_level_id);
    const hasSpecialtyProofPoints = (proofPointCounts?.specialty ?? 0) > 0;
    const lifecycleRank = enrollmentContext?.activeLifecycleRank ?? provider.lifecycle_rank;

    const impact = getCascadeImpact(
      fieldName,
      lifecycleRank,
      hasExpertiseSelected,
      hasSpecialtyProofPoints
    );

    return { impact, isLoading: false };
  }, [provider, activeEnrollment, enrollmentContext?.activeLifecycleRank, enrollmentContext?.isLoading, fieldName, proofPointCounts, providerLoading, countsLoading]);
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
 * IMPORTANT: Uses ENROLLMENT lifecycle rank for multi-industry isolation
 * 
 * @param stepId - Wizard step ID (1-9)
 * @returns boolean indicating if step is locked
 */
export function useIsStepLocked(stepId: number): {
  isLocked: boolean;
  isLoading: boolean;
} {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();

  return useMemo(() => {
    const isLoading = providerLoading || (enrollmentContext?.isLoading ?? false);
    
    if (isLoading || !provider) {
      return { isLocked: false, isLoading };
    }

    // Use enrollment lifecycle rank, fallback to provider for backward compatibility
    const lifecycleRank = enrollmentContext?.activeLifecycleRank ?? provider.lifecycle_rank;
    return {
      isLocked: isWizardStepLocked(stepId, lifecycleRank),
      isLoading: false,
    };
  }, [provider, enrollmentContext?.activeLifecycleRank, enrollmentContext?.isLoading, stepId, providerLoading]);
}

/**
 * Hook to get step lock status function for WizardStepper
 * IMPORTANT: Uses ENROLLMENT lifecycle rank for multi-industry isolation
 */
export function useStepLockChecker(): (stepId: number) => boolean {
  const { data: provider } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();

  return useMemo(() => {
    return (stepId: number): boolean => {
      // Use enrollment lifecycle rank, fallback to provider for backward compatibility
      const lifecycleRank = enrollmentContext?.activeLifecycleRank ?? provider?.lifecycle_rank ?? 0;
      if (!lifecycleRank) return false;
      return isWizardStepLocked(stepId, lifecycleRank);
    };
  }, [provider?.lifecycle_rank, enrollmentContext?.activeLifecycleRank]);
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
 * IMPORTANT: Uses ENROLLMENT lifecycle status for multi-industry isolation
 */
export function useIsTerminalState(): {
  isTerminal: boolean;
  status: string | null;
  isLoading: boolean;
} {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();

  return useMemo(() => {
    const isLoading = providerLoading || (enrollmentContext?.isLoading ?? false);
    
    if (isLoading || !provider) {
      return { isTerminal: false, status: null, isLoading };
    }

    const terminalStatuses = ['certified', 'not_certified', 'active', 'suspended', 'inactive'];
    // Use enrollment lifecycle status, fallback to provider for backward compatibility
    const lifecycleStatus = enrollmentContext?.activeLifecycleStatus ?? provider.lifecycle_status;
    const isTerminal = terminalStatuses.includes(lifecycleStatus);

    return {
      isTerminal,
      status: lifecycleStatus,
      isLoading: false,
    };
  }, [provider, enrollmentContext?.activeLifecycleStatus, enrollmentContext?.isLoading, providerLoading]);
}

// Re-export types and constants for convenience
export { LIFECYCLE_RANKS, type FieldCategory, type LockCheckResult, type CascadeImpact };
