/**
 * Expertise Upgrade Service
 * 
 * Handles post-certification expertise upgrade workflow.
 * Allows certified providers to voluntarily change expertise level.
 */

import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface UpgradeEligibility {
  isEligible: boolean;
  currentExpertiseLevel: string | null;
  currentExpertiseLevelId: string | null;
  currentStarRating: number | null;
  upgradeCount: number;
  reason?: string;
}

export interface UpgradeResult {
  success: boolean;
  message?: string;
  error?: string;
  previous_expertise_level_id?: string;
  previous_star_rating?: number;
  previous_certified_at?: string;
  upgrade_count?: number;
}

/**
 * Check if certified provider can initiate expertise upgrade
 */
export async function checkUpgradeEligibility(
  enrollmentId: string
): Promise<UpgradeEligibility> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments')
    .select(`
      lifecycle_status,
      star_rating,
      upgrade_attempt_count,
      expertise_level_id
    `)
    .eq('id', enrollmentId)
    .single();
    
  if (error) {
    handleQueryError(error, { operation: 'check_upgrade_eligibility' });
    throw new Error('Failed to check upgrade eligibility');
  }

  // Fetch expertise level name separately to avoid ambiguous FK issue
  let expertiseLevelName: string | null = null;
  if (data.expertise_level_id) {
    const { data: levelData } = await supabase
      .from('expertise_levels')
      .select('name')
      .eq('id', data.expertise_level_id)
      .single();
    expertiseLevelName = levelData?.name || null;
  }
  
  const isCertified = data.lifecycle_status === 'certified';
  
  return {
    isEligible: isCertified,
    currentExpertiseLevel: expertiseLevelName,
    currentExpertiseLevelId: data.expertise_level_id,
    currentStarRating: data.star_rating,
    upgradeCount: data.upgrade_attempt_count || 0,
    reason: isCertified ? undefined : 'Only certified providers can upgrade expertise',
  };
}

/**
 * Reset enrollment for expertise upgrade process
 */
export async function resetForExpertiseUpgrade(enrollmentId: string): Promise<UpgradeResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data, error } = await supabase.rpc('reset_enrollment_for_expertise_upgrade', {
    p_enrollment_id: enrollmentId,
    p_user_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Handle the JSON response from RPC
  const result = data as unknown as UpgradeResult;
  return result;
}
