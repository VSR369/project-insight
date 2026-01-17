/**
 * Provider Enrollments Hooks
 * 
 * React Query hooks for managing provider industry enrollments.
 * Supports multi-industry architecture with independent lifecycles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchProviderEnrollments,
  fetchEnrollment,
  fetchActiveEnrollment,
  createEnrollment,
  updateEnrollmentExpertise,
  updateEnrollmentLifecycle,
  setPrimaryEnrollment,
  hasActiveAssessmentInAnyEnrollment,
  getEnrollmentByIndustry,
  deleteEnrollment,
  type EnrollmentWithDetails,
  type CreateEnrollmentInput,
} from '@/services/enrollmentService';
import type { Database } from '@/integrations/supabase/types';

type LifecycleStatus = Database['public']['Enums']['lifecycle_status'];

/**
 * Fetch all enrollments for a provider
 */
export function useProviderEnrollments(providerId?: string) {
  return useQuery({
    queryKey: ['provider-enrollments', providerId],
    queryFn: () => fetchProviderEnrollments(providerId!),
    enabled: !!providerId,
    staleTime: 30000,
  });
}

/**
 * Fetch a single enrollment by ID
 */
export function useEnrollment(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment', enrollmentId],
    queryFn: () => fetchEnrollment(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: 30000,
  });
}

/**
 * Fetch the active (primary or most recent) enrollment
 */
export function useActiveEnrollment(providerId?: string) {
  return useQuery({
    queryKey: ['active-enrollment', providerId],
    queryFn: () => fetchActiveEnrollment(providerId!),
    enabled: !!providerId,
    staleTime: 30000,
  });
}

/**
 * Get enrollment by provider and industry segment
 */
export function useEnrollmentByIndustry(providerId?: string, industrySegmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-by-industry', providerId, industrySegmentId],
    queryFn: () => getEnrollmentByIndustry(providerId!, industrySegmentId!),
    enabled: !!providerId && !!industrySegmentId,
    staleTime: 30000,
  });
}

/**
 * Create a new industry enrollment
 */
export function useCreateEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEnrollmentInput) => createEnrollment(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments', data.provider_id] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment', data.provider_id] });
      toast.success(`Enrolled in ${data.industry_segment?.name || 'new industry'} successfully`);
    },
    onError: (error) => {
      console.error('Error creating enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create enrollment');
    },
  });
}

/**
 * Update enrollment expertise level
 */
export function useUpdateEnrollmentExpertise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enrollmentId, expertiseLevelId }: { enrollmentId: string; expertiseLevelId: string }) =>
      updateEnrollmentExpertise(enrollmentId, expertiseLevelId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
    },
    onError: (error) => {
      console.error('Error updating expertise:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update expertise level');
    },
  });
}

/**
 * Update enrollment lifecycle status
 */
export function useUpdateEnrollmentLifecycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      enrollmentId, 
      lifecycleStatus, 
      lifecycleRank 
    }: { 
      enrollmentId: string; 
      lifecycleStatus: LifecycleStatus; 
      lifecycleRank: number;
    }) => updateEnrollmentLifecycle(enrollmentId, lifecycleStatus, lifecycleRank),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
    },
    onError: (error) => {
      console.error('Error updating lifecycle:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update lifecycle status');
    },
  });
}

/**
 * Set an enrollment as primary
 */
export function useSetPrimaryEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, enrollmentId }: { providerId: string; enrollmentId: string }) =>
      setPrimaryEnrollment(providerId, enrollmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments', variables.providerId] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment', variables.providerId] });
      toast.success('Primary industry updated');
    },
    onError: (error) => {
      console.error('Error setting primary:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set primary industry');
    },
  });
}

/**
 * Check for active assessment in any enrollment (sequential rule)
 */
export function useHasActiveAssessment(providerId?: string, excludeEnrollmentId?: string) {
  return useQuery({
    queryKey: ['active-assessment-check', providerId, excludeEnrollmentId],
    queryFn: () => hasActiveAssessmentInAnyEnrollment(providerId!, excludeEnrollmentId),
    enabled: !!providerId,
    staleTime: 10000, // 10 seconds - check frequently during assessment
  });
}

/**
 * Delete an enrollment
 */
export function useDeleteEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enrollmentId: string) => deleteEnrollment(enrollmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
      toast.success('Industry enrollment removed');
    },
    onError: (error) => {
      console.error('Error deleting enrollment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove enrollment');
    },
  });
}

// Re-export types
export type { EnrollmentWithDetails, CreateEnrollmentInput };
