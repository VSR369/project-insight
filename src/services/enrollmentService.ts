/**
 * Enrollment Service
 * 
 * Manages provider industry enrollments - the core entity for 
 * multi-industry provider architecture.
 * 
 * Each enrollment represents a provider's journey within a specific
 * industry segment, with independent lifecycle progression.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import type { Database } from '@/integrations/supabase/types';

type LifecycleStatus = Database['public']['Enums']['lifecycle_status'];

// Define types manually since the table is newly created
// These will be replaced by auto-generated types after type regeneration
export interface ProviderIndustryEnrollment {
  id: string;
  provider_id: string;
  industry_segment_id: string;
  expertise_level_id: string | null;
  lifecycle_status: LifecycleStatus;
  lifecycle_rank: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface EnrollmentWithDetails extends ProviderIndustryEnrollment {
  industry_segment?: {
    id: string;
    name: string;
    code: string;
  } | null;
  expertise_level?: {
    id: string;
    name: string;
    level_number: number;
  } | null;
}

export interface CreateEnrollmentInput {
  providerId: string;
  industrySegmentId: string;
  isPrimary?: boolean;
}

export interface UpdateEnrollmentInput {
  enrollmentId: string;
  expertiseLevelId?: string;
  lifecycleStatus?: LifecycleStatus;
  lifecycleRank?: number;
}

/**
 * Fetch all enrollments for a provider with related data
 */
export async function fetchProviderEnrollments(
  providerId: string
): Promise<EnrollmentWithDetails[]> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments' as any)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .eq('provider_id', providerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as unknown) as EnrollmentWithDetails[];
}

/**
 * Fetch a single enrollment by ID
 */
export async function fetchEnrollment(
  enrollmentId: string
): Promise<EnrollmentWithDetails | null> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments' as any)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .eq('id', enrollmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return (data as unknown) as EnrollmentWithDetails;
}

/**
 * Get the primary or most recent enrollment for a provider
 */
export async function fetchActiveEnrollment(
  providerId: string
): Promise<EnrollmentWithDetails | null> {
  // First try to get primary enrollment
  const { data: primary, error: primaryError } = await supabase
    .from('provider_industry_enrollments' as any)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .eq('provider_id', providerId)
    .eq('is_primary', true)
    .maybeSingle();

  if (primaryError) throw primaryError;
  if (primary) return (primary as unknown) as EnrollmentWithDetails;

  // Fall back to most recently created enrollment
  const { data: recent, error: recentError } = await supabase
    .from('provider_industry_enrollments' as any)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentError) throw recentError;
  return (recent as unknown) as EnrollmentWithDetails | null;
}

/**
 * Create a new industry enrollment for a provider
 */
export async function createEnrollment(
  input: CreateEnrollmentInput
): Promise<EnrollmentWithDetails> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Check if this is the first enrollment for the provider
  const { count, error: countError } = await supabase
    .from('provider_industry_enrollments' as any)
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', input.providerId);

  if (countError) throw countError;

  const isFirst = (count ?? 0) === 0;
  const isPrimary = input.isPrimary ?? isFirst; // First enrollment is primary by default

  // If setting as primary, unset existing primary first
  if (isPrimary && !isFirst) {
    const { error: unsetError } = await supabase
      .from('provider_industry_enrollments' as any)
      .update({ is_primary: false, updated_by: userId })
      .eq('provider_id', input.providerId)
      .eq('is_primary', true);

    if (unsetError) throw unsetError;
  }

  const enrollmentData = {
    provider_id: input.providerId,
    industry_segment_id: input.industrySegmentId,
    is_primary: isPrimary,
    lifecycle_status: 'enrolled' as LifecycleStatus,
    lifecycle_rank: 20,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('provider_industry_enrollments' as any)
    .insert(enrollmentData)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .single();

  if (error) throw error;
  return (data as unknown) as EnrollmentWithDetails;
}

/**
 * Update an enrollment's expertise level
 */
export async function updateEnrollmentExpertise(
  enrollmentId: string,
  expertiseLevelId: string
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('provider_industry_enrollments' as any)
    .update({
      expertise_level_id: expertiseLevelId,
      lifecycle_status: 'expertise_selected' as LifecycleStatus,
      lifecycle_rank: 50,
      updated_by: userId,
    })
    .eq('id', enrollmentId);

  if (error) throw error;
}

/**
 * Update enrollment lifecycle status and rank
 */
export async function updateEnrollmentLifecycle(
  enrollmentId: string,
  lifecycleStatus: LifecycleStatus,
  lifecycleRank: number
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('provider_industry_enrollments' as any)
    .update({
      lifecycle_status: lifecycleStatus,
      lifecycle_rank: lifecycleRank,
      updated_by: userId,
    })
    .eq('id', enrollmentId);

  if (error) throw error;
}

/**
 * Set an enrollment as the primary industry for the provider
 */
export async function setPrimaryEnrollment(
  providerId: string,
  enrollmentId: string
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Unset any existing primary
  const { error: unsetError } = await supabase
    .from('provider_industry_enrollments' as any)
    .update({ is_primary: false, updated_by: userId })
    .eq('provider_id', providerId)
    .eq('is_primary', true);

  if (unsetError) throw unsetError;

  // Set new primary
  const { error: setError } = await supabase
    .from('provider_industry_enrollments' as any)
    .update({ is_primary: true, updated_by: userId })
    .eq('id', enrollmentId);

  if (setError) throw setError;
}

/**
 * Check if provider has an active (unsubmitted) assessment in any enrollment
 * Used for sequential assessment rule
 */
export async function hasActiveAssessmentInAnyEnrollment(
  providerId: string,
  excludeEnrollmentId?: string
): Promise<{ hasActive: boolean; activeEnrollmentId?: string; industryName?: string }> {
  // For now, use a simpler query that doesn't depend on the new table join
  // until types are regenerated
  const { data, error } = await supabase
    .from('assessment_attempts')
    .select('id, enrollment_id')
    .eq('provider_id', providerId)
    .is('submitted_at', null);

  if (error) throw error;

  const activeAttempts = excludeEnrollmentId 
    ? data?.filter(a => a.enrollment_id !== excludeEnrollmentId)
    : data;

  if (activeAttempts && activeAttempts.length > 0) {
    const activeAttempt = activeAttempts[0];
    // Fetch enrollment details separately
    if (activeAttempt.enrollment_id) {
      const enrollment = await fetchEnrollment(activeAttempt.enrollment_id);
      return {
        hasActive: true,
        activeEnrollmentId: activeAttempt.enrollment_id,
        industryName: enrollment?.industry_segment?.name,
      };
    }
    return {
      hasActive: true,
      activeEnrollmentId: activeAttempt.enrollment_id ?? undefined,
    };
  }

  return { hasActive: false };
}

/**
 * Get enrollment by provider and industry segment
 */
export async function getEnrollmentByIndustry(
  providerId: string,
  industrySegmentId: string
): Promise<EnrollmentWithDetails | null> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments' as any)
    .select(`
      *,
      industry_segment:industry_segments(id, name, code),
      expertise_level:expertise_levels(id, name, level_number)
    `)
    .eq('provider_id', providerId)
    .eq('industry_segment_id', industrySegmentId)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown) as EnrollmentWithDetails | null;
}

/**
 * Delete an enrollment (only if not primary and in early stages)
 */
export async function deleteEnrollment(enrollmentId: string): Promise<void> {
  const { data: enrollment, error: fetchError } = await supabase
    .from('provider_industry_enrollments' as any)
    .select('is_primary, lifecycle_rank')
    .eq('id', enrollmentId)
    .single();

  if (fetchError) throw fetchError;

  if ((enrollment as any).is_primary) {
    throw new Error('Cannot delete primary industry enrollment. Set another industry as primary first.');
  }

  if ((enrollment as any).lifecycle_rank >= 100) {
    throw new Error('Cannot delete enrollment after assessment has started.');
  }

  const { error } = await supabase
    .from('provider_industry_enrollments' as any)
    .delete()
    .eq('id', enrollmentId);

  if (error) throw error;
}
