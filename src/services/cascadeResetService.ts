/**
 * Cascade Reset Service
 * 
 * Functions to execute cascade resets when industry or expertise level changes.
 * These wrap database functions to ensure transactional integrity.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CascadeResetResult {
  success: boolean;
  error?: string;
}

/**
 * Execute industry change reset
 * 
 * Deletes ONLY specialty proof points (keeps general), clears specialities,
 * resets expertise level, and sets lifecycle to 'enrolled'.
 * 
 * @param providerId - Provider's UUID
 * @returns CascadeResetResult
 */
export async function executeIndustryChangeReset(providerId: string): Promise<CascadeResetResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_industry_change_reset', {
      p_provider_id: providerId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Industry change reset failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Industry change reset error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Execute expertise level change reset
 * 
 * Deletes specialty proof points, clears speciality selections,
 * and sets lifecycle to 'expertise_selected'.
 * 
 * @param providerId - Provider's UUID
 * @returns CascadeResetResult
 */
export async function executeExpertiseLevelChangeReset(providerId: string): Promise<CascadeResetResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase.rpc('execute_expertise_change_reset', {
      p_provider_id: providerId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Expertise change reset failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Expertise change reset error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get cascade impact counts for a provider
 * 
 * @param providerId - Provider's UUID
 * @returns Counts of affected items
 */
export async function getCascadeImpactCounts(providerId: string): Promise<{
  specialty_proof_points_count: number;
  general_proof_points_count: number;
  specialities_count: number;
  proficiency_areas_count: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_cascade_impact_counts', {
      p_provider_id: providerId,
    });

    if (error) {
      console.error('Failed to get cascade impact counts:', error);
      return null;
    }

    return data?.[0] ?? null;
  } catch (error) {
    console.error('Get cascade impact counts error:', error);
    return null;
  }
}
