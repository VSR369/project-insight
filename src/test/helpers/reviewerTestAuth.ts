/**
 * Reviewer Test Authentication Helpers
 * 
 * Helper functions for reviewer enrollment testing.
 * Provides utilities for creating, authenticating, and cleaning up test reviewers.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ReviewerSession {
  userId: string;
  reviewerId: string;
  email: string;
  name: string;
  accessToken: string;
}

export interface PanelReviewer {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  enrollment_source: string;
  invitation_status: string | null;
  approval_status: string | null;
  is_active: boolean;
}

export interface TestReviewerResult {
  success: boolean;
  reviewerId?: string;
  userId?: string;
  error?: string;
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Authenticate as a test reviewer (requires existing reviewer with user account)
 */
export async function authenticateTestReviewer(
  email: string,
  password: string
): Promise<ReviewerSession | null> {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('Failed to authenticate test reviewer:', authError?.message);
      return null;
    }

    // Fetch reviewer record
    const { data: reviewer, error: reviewerError } = await supabase
      .from('panel_reviewers')
      .select('id, name, email')
      .eq('user_id', authData.user.id)
      .single();

    if (reviewerError || !reviewer) {
      console.error('Failed to fetch reviewer record:', reviewerError?.message);
      return null;
    }

    return {
      userId: authData.user.id,
      reviewerId: reviewer.id,
      email: reviewer.email,
      name: reviewer.name,
      accessToken: authData.session?.access_token || '',
    };
  } catch (error) {
    console.error('Error authenticating test reviewer:', error);
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ============================================================================
// REVIEWER LOOKUP HELPERS
// ============================================================================

/**
 * Get reviewer by email address
 */
export async function getReviewerByEmail(email: string): Promise<PanelReviewer | null> {
  const { data, error } = await supabase
    .from('panel_reviewers')
    .select('id, user_id, name, email, enrollment_source, invitation_status, approval_status, is_active')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Failed to fetch reviewer by email:', error.message);
    return null;
  }

  return data as PanelReviewer;
}

/**
 * Get reviewer by ID
 */
export async function getReviewerById(reviewerId: string): Promise<PanelReviewer | null> {
  const { data, error } = await supabase
    .from('panel_reviewers')
    .select('id, user_id, name, email, enrollment_source, invitation_status, approval_status, is_active')
    .eq('id', reviewerId)
    .single();

  if (error) {
    console.error('Failed to fetch reviewer by ID:', error.message);
    return null;
  }

  return data as PanelReviewer;
}

/**
 * Get reviewer by user ID
 */
export async function getReviewerByUserId(userId: string): Promise<PanelReviewer | null> {
  const { data, error } = await supabase
    .from('panel_reviewers')
    .select('id, user_id, name, email, enrollment_source, invitation_status, approval_status, is_active')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch reviewer by user ID:', error.message);
    return null;
  }

  return data as PanelReviewer;
}

// ============================================================================
// TEST DATA CREATION HELPERS
// ============================================================================

/**
 * Create a test reviewer application via edge function
 * Note: This creates both auth user and panel_reviewers record
 */
export async function createTestReviewerApplication(
  applicationData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    industrySegmentIds: string[];
    expertiseLevelIds: string[];
    whyJoinStatement: string;
  }
): Promise<TestReviewerResult> {
  try {
    const { data, error } = await supabase.functions.invoke('register-reviewer-application', {
      body: applicationData,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Unknown error' };
    }

    return {
      success: true,
      reviewerId: data.reviewer_id,
      userId: data.user_id,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Simulate invitation token expiry by updating the expires_at field
 * Note: Requires admin access
 */
export async function simulateInvitationExpiry(reviewerId: string): Promise<boolean> {
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  
  const { error } = await supabase
    .from('panel_reviewers')
    .update({
      invitation_token_expires_at: expiredDate,
      invitation_status: 'EXPIRED',
    })
    .eq('id', reviewerId);

  if (error) {
    console.error('Failed to simulate invitation expiry:', error.message);
    return false;
  }

  return true;
}

/**
 * Check if a user has the panel_reviewer role
 */
export async function hasReviewerRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'panel_reviewer')
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

// ============================================================================
// CLEANUP HELPERS
// ============================================================================

/**
 * Clean up test reviewers by email pattern
 * Note: Only cleans up reviewers with test email pattern
 */
export async function cleanupTestReviewers(emailPattern = 'test-%@example.com'): Promise<number> {
  try {
    // Get test reviewers
    const { data: reviewers, error: fetchError } = await supabase
      .from('panel_reviewers')
      .select('id, user_id, email')
      .like('email', emailPattern);

    if (fetchError || !reviewers || reviewers.length === 0) {
      return 0;
    }

    // Delete reviewer records
    const reviewerIds = reviewers.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('panel_reviewers')
      .delete()
      .in('id', reviewerIds);

    if (deleteError) {
      console.error('Failed to delete test reviewers:', deleteError.message);
      return 0;
    }

    return reviewers.length;
  } catch (error) {
    console.error('Error cleaning up test reviewers:', error);
    return 0;
  }
}

/**
 * Get count of reviewers matching criteria
 */
export async function getReviewerCount(filters: {
  enrollmentSource?: string;
  invitationStatus?: string;
  approvalStatus?: string;
  isActive?: boolean;
}): Promise<number> {
  let query = supabase
    .from('panel_reviewers')
    .select('id', { count: 'exact', head: true });

  if (filters.enrollmentSource) {
    query = query.eq('enrollment_source', filters.enrollmentSource);
  }
  if (filters.invitationStatus) {
    query = query.eq('invitation_status', filters.invitationStatus);
  }
  if (filters.approvalStatus) {
    query = query.eq('approval_status', filters.approvalStatus);
  }
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Failed to get reviewer count:', error.message);
    return 0;
  }

  return count || 0;
}

// ============================================================================
// EDGE FUNCTION CALL HELPERS
// ============================================================================

/**
 * Call accept-reviewer-invitation edge function
 */
export async function callAcceptInvitation(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('accept-reviewer-invitation');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Call decline-reviewer-invitation edge function
 */
export async function callDeclineInvitation(
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('decline-reviewer-invitation', {
      body: { reason },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Call approve-reviewer-application edge function (admin only)
 */
export async function callApproveApplication(
  reviewerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('approve-reviewer-application', {
      body: { reviewer_id: reviewerId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Call reject-reviewer-application edge function (admin only)
 */
export async function callRejectApplication(
  reviewerId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('reject-reviewer-application', {
      body: { reviewer_id: reviewerId, reason },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
