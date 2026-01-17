/**
 * Cascade Reset Service
 * 
 * Provides functions for performing cascade resets when industry or expertise
 * levels change. These wrap database functions to ensure transactional integrity.
 * 
 * V2 functions operate at enrollment level (multi-industry support)
 * Legacy functions operate at provider level (deprecated)
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import { handleMutationError, logWarning, logAuditEvent } from '@/lib/errorHandler';

export interface CascadeResetResult {
  success: boolean;
  error?: string;
}

export interface CascadeImpactCounts {
  specialty_proof_points_count: number;
  general_proof_points_count: number;
  specialities_count: number;
  proficiency_areas_count: number;
}

// ============================================================================
// V2 Functions - Enrollment-Scoped (Preferred)
// ============================================================================

/**
 * Execute expertise level change reset for a specific enrollment.
 * Only affects data scoped to the given enrollment, not other industries.
 */
export async function executeExpertiseLevelChangeResetV2(
  enrollmentId: string
): Promise<CascadeResetResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_expertise_change_reset_v2', {
      p_enrollment_id: enrollmentId,
      p_user_id: userId,
    });

    if (error) {
      handleMutationError(error, { 
        operation: 'executeExpertiseLevelChangeResetV2', 
        enrollmentId 
      }, false);
      return { success: false, error: error.message };
    }

    logAuditEvent('EXPERTISE_RESET_EXECUTED_V2', {
      enrollmentId,
      resetType: 'expertise_change_enrollment_scoped',
    }, userId);

    return { success: true };
  } catch (error) {
    handleMutationError(error, { 
      operation: 'executeExpertiseLevelChangeResetV2', 
      enrollmentId 
    }, false);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Execute industry change reset for a specific enrollment.
 * Only affects data scoped to the given enrollment.
 */
export async function executeIndustryChangeResetV2(
  enrollmentId: string
): Promise<CascadeResetResult> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_industry_change_reset_v2', {
      p_enrollment_id: enrollmentId,
      p_user_id: userId,
    });

    if (error) {
      handleMutationError(error, { 
        operation: 'executeIndustryChangeResetV2', 
        enrollmentId 
      }, false);
      return { success: false, error: error.message };
    }

    logAuditEvent('INDUSTRY_RESET_EXECUTED_V2', {
      enrollmentId,
      resetType: 'industry_change_enrollment_scoped',
    }, userId);

    return { success: true };
  } catch (error) {
    handleMutationError(error, { 
      operation: 'executeIndustryChangeResetV2', 
      enrollmentId 
    }, false);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get cascade impact counts for a specific enrollment.
 * Returns counts scoped only to the given enrollment.
 */
export async function getCascadeImpactCountsV2(
  enrollmentId: string
): Promise<CascadeImpactCounts | null> {
  try {
    const { data, error } = await supabase.rpc('get_cascade_impact_counts_v2', {
      p_enrollment_id: enrollmentId,
    });

    if (error) {
      logWarning('Failed to get cascade impact counts V2', { 
        operation: 'getCascadeImpactCountsV2', 
        enrollmentId 
      });
      return null;
    }

    if (!data || data.length === 0) {
      return {
        specialty_proof_points_count: 0,
        general_proof_points_count: 0,
        specialities_count: 0,
        proficiency_areas_count: 0,
      };
    }

    return data[0] as CascadeImpactCounts;
  } catch (error) {
    logWarning('Get cascade impact counts V2 error', { 
      operation: 'getCascadeImpactCountsV2', 
      enrollmentId 
    });
    return null;
  }
}

/**
 * Handle orphaned proof points for a specific enrollment.
 * Converts orphaned specialty proof points to general category.
 */
export async function handleOrphanedProofPointsV2(
  enrollmentId: string,
  removedAreaIds: string[]
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('handle_orphaned_proof_points_v2', {
      p_enrollment_id: enrollmentId,
      p_removed_area_ids: removedAreaIds,
    });

    if (error) {
      logWarning('Failed to handle orphaned proof points V2', { 
        operation: 'handleOrphanedProofPointsV2', 
        enrollmentId 
      });
      return 0;
    }

    return data ?? 0;
  } catch (error) {
    logWarning('Handle orphaned proof points V2 error', { 
      operation: 'handleOrphanedProofPointsV2', 
      enrollmentId 
    });
    return 0;
  }
}

// ============================================================================
// Legacy Functions - Provider-Scoped (Deprecated)
// Keep for backward compatibility, but prefer V2 functions
// ============================================================================

/**
 * @deprecated Use executeIndustryChangeResetV2 instead
 * Execute industry change reset for a provider (affects ALL enrollments)
 */
export async function executeIndustryChangeReset(providerId: string): Promise<CascadeResetResult> {
  console.warn('executeIndustryChangeReset is deprecated. Use executeIndustryChangeResetV2 with enrollmentId instead.');
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_industry_change_reset', {
      p_provider_id: providerId,
      p_user_id: userId,
    });

    if (error) {
      handleMutationError(error, { 
        operation: 'executeIndustryChangeReset', 
        providerId 
      }, false);
      return { success: false, error: error.message };
    }

    logAuditEvent('INDUSTRY_RESET_EXECUTED_LEGACY', {
      providerId,
      resetType: 'industry_change',
      deprecated: true,
    }, userId);

    return { success: true };
  } catch (error) {
    handleMutationError(error, { 
      operation: 'executeIndustryChangeReset', 
      providerId 
    }, false);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * @deprecated Use executeExpertiseLevelChangeResetV2 instead
 * Execute expertise level change reset for a provider (affects ALL enrollments)
 */
export async function executeExpertiseLevelChangeReset(providerId: string): Promise<CascadeResetResult> {
  console.warn('executeExpertiseLevelChangeReset is deprecated. Use executeExpertiseLevelChangeResetV2 with enrollmentId instead.');
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_expertise_change_reset', {
      p_provider_id: providerId,
      p_user_id: userId,
    });

    if (error) {
      handleMutationError(error, { 
        operation: 'executeExpertiseLevelChangeReset', 
        providerId 
      }, false);
      return { success: false, error: error.message };
    }

    logAuditEvent('EXPERTISE_RESET_EXECUTED_LEGACY', {
      providerId,
      resetType: 'expertise_change',
      deprecated: true,
    }, userId);

    return { success: true };
  } catch (error) {
    handleMutationError(error, { 
      operation: 'executeExpertiseLevelChangeReset', 
      providerId 
    }, false);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * @deprecated Use getCascadeImpactCountsV2 instead
 * Get cascade impact counts for a provider (counts ALL enrollments)
 */
export async function getCascadeImpactCounts(providerId: string): Promise<CascadeImpactCounts | null> {
  console.warn('getCascadeImpactCounts is deprecated. Use getCascadeImpactCountsV2 with enrollmentId instead.');
  
  try {
    const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
      p_provider_id: providerId,
    });

    if (error) {
      logWarning('Failed to get cascade impact counts', { 
        operation: 'getCascadeImpactCounts', 
        providerId 
      });
      return null;
    }

    return data?.[0] ?? null;
  } catch (error) {
    logWarning('Get cascade impact counts error', { 
      operation: 'getCascadeImpactCounts', 
      providerId 
    });
    return null;
  }
}
