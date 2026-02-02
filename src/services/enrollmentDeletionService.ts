/**
 * Enrollment Deletion Service
 * 
 * Manages comprehensive enrollment deletion validation with:
 * - Hard blockers (truly cannot delete)
 * - Soft blockers (can force delete with notifications)
 * - Stakeholder notification gathering
 * - Audit trail creation
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import { logWarning, logAuditEvent } from '@/lib/errorHandler';

// ============================================================================
// Types
// ============================================================================

export type BlockerType = 'hard' | 'soft';

export interface DeletionBlocker {
  type: BlockerType;
  code: string;
  title: string;
  message: string;
  resolution: string;
}

export interface Stakeholder {
  type: 'reviewer' | 'manager' | 'provider' | 'admin';
  email: string;
  name: string;
  context: string;
}

export interface AffectedData {
  proofPointsCount: number;
  proficiencyAreasCount: number;
  specialitiesCount: number;
  assessmentAttemptsCount: number;
  interviewBookingsCount: number;
  pendingManagerApprovals: number;
}

export interface DeletionValidationResult {
  canDelete: boolean;
  canForceDelete: boolean;
  hardBlockers: DeletionBlocker[];
  softBlockers: DeletionBlocker[];
  affectedData: AffectedData;
  stakeholders: Stakeholder[];
  enrollmentDetails: {
    id: string;
    industryName: string;
    isPrimary: boolean;
    lifecycleStatus: string;
    lifecycleRank: number;
    providerId: string;
    industrySegmentId: string;
  } | null;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate an enrollment for deletion
 * Returns detailed validation result with blockers, affected data, and stakeholders
 */
export async function validateEnrollmentDeletion(
  enrollmentId: string
): Promise<DeletionValidationResult> {
  const hardBlockers: DeletionBlocker[] = [];
  const softBlockers: DeletionBlocker[] = [];
  const stakeholders: Stakeholder[] = [];

  // Fetch enrollment details
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('provider_industry_enrollments')
    .select(`
      id,
      is_primary,
      lifecycle_status,
      lifecycle_rank,
      provider_id,
      industry_segment_id,
      org_approval_status,
      organization,
      industry_segment:industry_segments(name),
      expertise_level:expertise_levels(name)
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    return {
      canDelete: false,
      canForceDelete: false,
      hardBlockers: [{
        type: 'hard',
        code: 'ERR_NOT_FOUND',
        title: 'Enrollment Not Found',
        message: 'The enrollment could not be found',
        resolution: 'Please refresh the page and try again',
      }],
      softBlockers: [],
      affectedData: {
        proofPointsCount: 0,
        proficiencyAreasCount: 0,
        specialitiesCount: 0,
        assessmentAttemptsCount: 0,
        interviewBookingsCount: 0,
        pendingManagerApprovals: 0,
      },
      stakeholders: [],
      enrollmentDetails: null,
    };
  }

  const industryName = (enrollment.industry_segment as { name: string } | null)?.name || 'Unknown Industry';
  const enrollmentDetails = {
    id: enrollment.id,
    industryName,
    isPrimary: enrollment.is_primary,
    lifecycleStatus: enrollment.lifecycle_status,
    lifecycleRank: enrollment.lifecycle_rank,
    providerId: enrollment.provider_id,
    industrySegmentId: enrollment.industry_segment_id,
  };

  // Check enrollment count for provider
  const { count: enrollmentCount } = await supabase
    .from('provider_industry_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', enrollment.provider_id);

  // Fetch all affected data counts in parallel
  const [ppResult, paResult, psResult, aaResult, ibResult] = await Promise.all([
    supabase
      .from('proof_points')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId)
      .eq('is_deleted', false),
    supabase
      .from('provider_proficiency_areas')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId),
    supabase
      .from('provider_specialities')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId),
    supabase
      .from('assessment_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId),
    supabase
      .from('interview_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('enrollment_id', enrollmentId)
      .in('status', ['scheduled', 'confirmed']),
  ]);

  const affectedData: AffectedData = {
    proofPointsCount: ppResult.count ?? 0,
    proficiencyAreasCount: paResult.count ?? 0,
    specialitiesCount: psResult.count ?? 0,
    assessmentAttemptsCount: aaResult.count ?? 0,
    interviewBookingsCount: ibResult.count ?? 0,
    pendingManagerApprovals: enrollment.org_approval_status === 'pending' ? 1 : 0,
  };

  // ========== HARD BLOCKERS ==========

  // Rule 1: Cannot delete primary enrollment (unless it's the only one)
  if (enrollment.is_primary && (enrollmentCount ?? 0) > 1) {
    hardBlockers.push({
      type: 'hard',
      code: 'ERR_PRIMARY',
      title: 'Primary Industry',
      message: 'Cannot delete your primary industry enrollment',
      resolution: 'Set another industry as primary first, then you can delete this one',
    });
  }

  // Rule 2: Cannot delete only enrollment
  if ((enrollmentCount ?? 0) <= 1) {
    hardBlockers.push({
      type: 'hard',
      code: 'ERR_ONLY',
      title: 'Only Enrollment',
      message: 'Cannot delete your only industry enrollment',
      resolution: 'Add another industry enrollment first before deleting this one',
    });
  }

  // Rule 3: Cannot delete certified enrollments
  const terminalStatuses = ['certified'];
  if (terminalStatuses.includes(enrollment.lifecycle_status)) {
    hardBlockers.push({
      type: 'hard',
      code: 'ERR_CERTIFIED',
      title: 'Already Certified',
      message: `Cannot delete a ${enrollment.lifecycle_status} enrollment`,
      resolution: 'Contact support if you need to remove this certification',
    });
  }

  // ========== SOFT BLOCKERS ==========

  // Rule 4: Assessment started (rank >= 100)
  if (enrollment.lifecycle_rank >= 100 && !terminalStatuses.includes(enrollment.lifecycle_status)) {
    softBlockers.push({
      type: 'soft',
      code: 'WARN_ASSESSMENT',
      title: 'Assessment Progress',
      message: `Assessment has started (${affectedData.assessmentAttemptsCount} attempt${affectedData.assessmentAttemptsCount !== 1 ? 's' : ''})`,
      resolution: 'Force delete will permanently remove all assessment progress',
    });
  }

  // Rule 5: Pending organization approval
  if (enrollment.org_approval_status === 'pending') {
    const org = enrollment.organization as { manager_name?: string; manager_email?: string } | null;
    
    softBlockers.push({
      type: 'soft',
      code: 'WARN_APPROVAL',
      title: 'Pending Manager Approval',
      message: 'Organization approval is pending',
      resolution: 'Force delete will automatically withdraw the approval request',
    });

    // Add manager as stakeholder
    if (org?.manager_email) {
      stakeholders.push({
        type: 'manager',
        email: org.manager_email,
        name: org.manager_name || 'Manager',
        context: 'Pending approval request will be withdrawn',
      });
    }
  }

  // Rule 6: Scheduled interviews
  if (affectedData.interviewBookingsCount > 0) {
    // Fetch reviewer details for stakeholder notifications
    const { data: bookings } = await supabase
      .from('interview_bookings')
      .select(`
        id,
        scheduled_at,
        booking_reviewers(
          reviewer_id,
          panel_reviewers(id, name, email)
        )
      `)
      .eq('enrollment_id', enrollmentId)
      .in('status', ['scheduled', 'confirmed']);

    softBlockers.push({
      type: 'soft',
      code: 'WARN_INTERVIEW',
      title: 'Scheduled Interview',
      message: `${affectedData.interviewBookingsCount} interview${affectedData.interviewBookingsCount !== 1 ? 's' : ''} scheduled`,
      resolution: 'Force delete will cancel all interviews and notify assigned reviewers',
    });

    // Add reviewers as stakeholders
    if (bookings) {
      for (const booking of bookings) {
        const bookingReviewers = booking.booking_reviewers as Array<{
          reviewer_id: string;
          panel_reviewers: { id: string; name: string; email: string } | null;
        }> | null;
        
        if (bookingReviewers) {
          for (const br of bookingReviewers) {
            if (br.panel_reviewers?.email) {
              const scheduledDate = booking.scheduled_at 
                ? new Date(booking.scheduled_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown date';

              // Avoid duplicate stakeholders
              if (!stakeholders.find(s => s.email === br.panel_reviewers!.email)) {
                stakeholders.push({
                  type: 'reviewer',
                  email: br.panel_reviewers.email,
                  name: br.panel_reviewers.name,
                  context: `Interview scheduled for ${scheduledDate} will be cancelled`,
                });
              }
            }
          }
        }
      }
    }
  }

  // Determine delete capabilities
  const canDelete = hardBlockers.length === 0 && softBlockers.length === 0;
  const canForceDelete = hardBlockers.length === 0 && softBlockers.length > 0;

  return {
    canDelete,
    canForceDelete,
    hardBlockers,
    softBlockers,
    affectedData,
    stakeholders,
    enrollmentDetails,
  };
}

// ============================================================================
// Deletion Execution Functions
// ============================================================================

/**
 * Execute enrollment deletion with cascade and stakeholder notifications
 */
export async function executeEnrollmentDeletion(
  enrollmentId: string,
  isForceDelete: boolean = false,
  deletionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  // Re-validate before deletion
  const validation = await validateEnrollmentDeletion(enrollmentId);

  if (!validation.enrollmentDetails) {
    return { success: false, error: 'Enrollment not found' };
  }

  // Check for hard blockers
  if (validation.hardBlockers.length > 0) {
    return {
      success: false,
      error: validation.hardBlockers[0].message,
    };
  }

  // Check if force delete is required but not provided
  if (validation.softBlockers.length > 0 && !isForceDelete) {
    return {
      success: false,
      error: 'This enrollment has active dependencies. Force delete is required.',
    };
  }

  try {
    const { enrollmentDetails, affectedData, stakeholders, softBlockers } = validation;

    // Handle pending org approval - withdraw it
    if (affectedData.pendingManagerApprovals > 0) {
      const { error: withdrawError } = await supabase
        .from('provider_industry_enrollments')
        .update({ org_approval_status: 'withdrawn' })
        .eq('id', enrollmentId);

      if (withdrawError) {
        logWarning('Failed to withdraw org approval during enrollment deletion', {
          operation: 'executeEnrollmentDeletion.withdrawApproval',
          enrollmentId,
        });
      }
    }

    // Handle scheduled interviews - cancel them
    if (affectedData.interviewBookingsCount > 0) {
      // Cancel interview bookings
      const { error: cancelError } = await supabase
        .from('interview_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'Enrollment deleted',
        })
        .eq('enrollment_id', enrollmentId)
        .in('status', ['scheduled', 'confirmed']);

      if (cancelError) {
        logWarning('Failed to cancel interview bookings during enrollment deletion', {
          operation: 'executeEnrollmentDeletion.cancelBookings',
          enrollmentId,
        });
      }
    }

    // Cascade delete associated data
    // 1. Delete proof point speciality tags first (child of proof points)
    const { data: proofPointIds } = await supabase
      .from('proof_points')
      .select('id')
      .eq('enrollment_id', enrollmentId);

    if (proofPointIds && proofPointIds.length > 0) {
      const ppIds = proofPointIds.map(p => p.id);
      
      await supabase
        .from('proof_point_speciality_tags')
        .delete()
        .in('proof_point_id', ppIds);

      await supabase
        .from('proof_point_files')
        .delete()
        .in('proof_point_id', ppIds);

      await supabase
        .from('proof_point_links')
        .delete()
        .in('proof_point_id', ppIds);
    }

    // 2. Delete proof points
    await supabase
      .from('proof_points')
      .delete()
      .eq('enrollment_id', enrollmentId);

    // 3. Delete proficiency areas
    await supabase
      .from('provider_proficiency_areas')
      .delete()
      .eq('enrollment_id', enrollmentId);

    // 4. Delete specialities
    await supabase
      .from('provider_specialities')
      .delete()
      .eq('enrollment_id', enrollmentId);

    // 5. Delete assessment attempt responses first (child of attempts)
    const { data: attemptIds } = await supabase
      .from('assessment_attempts')
      .select('id')
      .eq('enrollment_id', enrollmentId);

    if (attemptIds && attemptIds.length > 0) {
      const aIds = attemptIds.map(a => a.id);
      
      await supabase
        .from('assessment_attempt_responses')
        .delete()
        .in('attempt_id', aIds);

      await supabase
        .from('assessment_results_rollup')
        .delete()
        .in('attempt_id', aIds);
    }

    // 6. Delete assessment attempts
    await supabase
      .from('assessment_attempts')
      .delete()
      .eq('enrollment_id', enrollmentId);

    // 7. Delete booking reviewers (child of interview bookings)
    const { data: bookingIds } = await supabase
      .from('interview_bookings')
      .select('id')
      .eq('enrollment_id', enrollmentId);

    if (bookingIds && bookingIds.length > 0) {
      const bIds = bookingIds.map(b => b.id);
      
      await supabase
        .from('booking_reviewers')
        .delete()
        .in('booking_id', bIds);
    }

    // 8. Delete interview bookings
    await supabase
      .from('interview_bookings')
      .delete()
      .eq('enrollment_id', enrollmentId);

    // 9. Finally delete the enrollment
    const { error: deleteError } = await supabase
      .from('provider_industry_enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (deleteError) {
      throw deleteError;
    }

    // Create audit record
    await supabase
      .from('enrollment_deletion_audit')
      .insert([{
        enrollment_id: enrollmentId,
        provider_id: enrollmentDetails.providerId,
        industry_segment_id: enrollmentDetails.industrySegmentId,
        industry_name: enrollmentDetails.industryName,
        deleted_by: userId,
        was_force_delete: isForceDelete,
        blockers_overridden: softBlockers.length > 0 ? JSON.parse(JSON.stringify(softBlockers)) : null,
        affected_data: JSON.parse(JSON.stringify(affectedData)),
        stakeholders_notified: stakeholders.length > 0 ? JSON.parse(JSON.stringify(stakeholders)) : null,
        deletion_reason: deletionReason || null,
      }]);

    // Log audit event
    logAuditEvent('enrollment_deleted', {
      enrollmentId,
      industryName: enrollmentDetails.industryName,
      wasForceDelete: isForceDelete,
      affectedData,
      stakeholderCount: stakeholders.length,
    }, userId);

    // Send stakeholder notifications if force delete
    if (isForceDelete && stakeholders.length > 0) {
      // Call edge function to send notifications
      try {
        await supabase.functions.invoke('notify-enrollment-deleted', {
          body: {
            enrollment_id: enrollmentId,
            industry_name: enrollmentDetails.industryName,
            deleted_by: userId,
            was_force_delete: isForceDelete,
            stakeholders,
            affected_data_summary: {
              proof_points: affectedData.proofPointsCount,
              interviews_cancelled: affectedData.interviewBookingsCount,
              assessments_deleted: affectedData.assessmentAttemptsCount,
            },
          },
        });
      } catch (notifyError) {
        // Don't fail deletion if notification fails
        logWarning('Failed to send stakeholder notifications', {
          operation: 'executeEnrollmentDeletion.notify',
          enrollmentId,
        });
      }
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}
