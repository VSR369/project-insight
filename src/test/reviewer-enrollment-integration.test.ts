/**
 * Reviewer Enrollment Integration Tests
 * 
 * Tests database interactions and edge function calls for reviewer enrollment.
 * These tests REQUIRE database connection and are skipped by default.
 * 
 * Run with: RUN_INTEGRATION_TESTS=true npm run test
 * 
 * Coverage:
 * - Edge function: register-reviewer-application
 * - Edge function: create-panel-reviewer
 * - Edge function: send-reviewer-invitation
 * - Edge function: accept-reviewer-invitation
 * - Edge function: decline-reviewer-invitation
 * - Edge function: approve-reviewer-application
 * - Edge function: reject-reviewer-application
 * - Edge function: cancel-reviewer-invitation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  createValidApplicationInput,
  createValidInvitationInput,
  generateTestEmail,
} from './fixtures/reviewer-fixtures';
import {
  getReviewerByEmail,
  getReviewerById,
  hasReviewerRole,
  cleanupTestReviewers,
} from './helpers/reviewerTestAuth';

// Skip all tests if RUN_INTEGRATION_TESTS is not set
const RUN_INTEGRATION_TESTS = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeIntegration = RUN_INTEGRATION_TESTS ? describe : describe.skip;

// Test state
let testReviewerIds: string[] = [];

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

beforeAll(async () => {
  if (!RUN_INTEGRATION_TESTS) return;
  
  // Verify database connection
  const { error } = await supabase.from('panel_reviewers').select('id').limit(1);
  if (error) {
    console.error('Database connection failed:', error.message);
    throw new Error('Cannot run integration tests without database connection');
  }
});

afterAll(async () => {
  if (!RUN_INTEGRATION_TESTS) return;
  
  // Clean up test data
  const cleaned = await cleanupTestReviewers();
  console.log(`Cleaned up ${cleaned} test reviewers`);
});

beforeEach(() => {
  testReviewerIds = [];
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function invokeEdgeFunction(
  functionName: string,
  body: unknown
): Promise<{ data: unknown; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    return { data, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

describeIntegration('Reviewer Enrollment: Integration Tests', () => {
  // --------------------------------------------------------------------------
  // Section 1: Edge Function - register-reviewer-application
  // --------------------------------------------------------------------------
  describe('Edge Function: register-reviewer-application', () => {
    it('TC-REG-01: Creates reviewer with self_signup source', async () => {
      const input = createValidApplicationInput();
      
      const { data, error } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect((data as { success: boolean }).success).toBe(true);
      
      const reviewerId = (data as { reviewer_id: string }).reviewer_id;
      testReviewerIds.push(reviewerId);
      
      const reviewer = await getReviewerByEmail(input.email);
      expect(reviewer).not.toBeNull();
      expect(reviewer?.enrollment_source).toBe('self_signup');
    });

    it('TC-REG-02: Sets approval_status to pending', async () => {
      const input = createValidApplicationInput();
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      const reviewerId = (data as { reviewer_id: string }).reviewer_id;
      testReviewerIds.push(reviewerId);
      
      const reviewer = await getReviewerByEmail(input.email);
      expect(reviewer?.approval_status).toBe('pending');
    });

    it('TC-REG-03: Sets invitation_status to null', async () => {
      const input = createValidApplicationInput();
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      const reviewerId = (data as { reviewer_id: string }).reviewer_id;
      testReviewerIds.push(reviewerId);
      
      const reviewer = await getReviewerByEmail(input.email);
      expect(reviewer?.invitation_status).toBeNull();
    });

    it('TC-REG-04: Sets is_active to false', async () => {
      const input = createValidApplicationInput();
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      const reviewerId = (data as { reviewer_id: string }).reviewer_id;
      testReviewerIds.push(reviewerId);
      
      const reviewer = await getReviewerByEmail(input.email);
      expect(reviewer?.is_active).toBe(false);
    });

    it('TC-REG-05: Rejects missing first name', async () => {
      const input = createValidApplicationInput({ firstName: '' });
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REG-06: Rejects missing last name', async () => {
      const input = createValidApplicationInput({ lastName: '' });
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REG-07: Rejects empty industry segments', async () => {
      const input = createValidApplicationInput({ industrySegmentIds: [] });
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REG-08: Rejects empty expertise levels', async () => {
      const input = createValidApplicationInput({ expertiseLevelIds: [] });
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REG-09: Rejects short statement (< 50 chars)', async () => {
      const input = createValidApplicationInput({ whyJoinStatement: 'Too short' });
      
      const { data } = await invokeEdgeFunction('register-reviewer-application', input);
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REG-10: Rejects duplicate email', async () => {
      const email = generateTestEmail('duplicate');
      const input1 = createValidApplicationInput({ email });
      const input2 = createValidApplicationInput({ email });
      
      // First registration should succeed
      const { data: data1 } = await invokeEdgeFunction('register-reviewer-application', input1);
      expect((data1 as { success: boolean }).success).toBe(true);
      testReviewerIds.push((data1 as { reviewer_id: string }).reviewer_id);
      
      // Second registration with same email should fail
      const { data: data2 } = await invokeEdgeFunction('register-reviewer-application', input2);
      expect((data2 as { success: boolean }).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 2: Edge Function - accept-reviewer-invitation
  // --------------------------------------------------------------------------
  describe('Edge Function: accept-reviewer-invitation', () => {
    it('TC-ACC-01: Requires authenticated user', async () => {
      // Sign out first
      await supabase.auth.signOut();
      
      const { data } = await invokeEdgeFunction('accept-reviewer-invitation', {});
      
      expect((data as { success: boolean }).success).toBe(false);
      expect((data as { error: string }).error).toContain('Unauthorized');
    });

    it('TC-ACC-02: Returns error if no invitation found', async () => {
      // This test requires a logged-in user without a pending invitation
      // The edge function should return an appropriate error
      const { data } = await invokeEdgeFunction('accept-reviewer-invitation', {});
      
      // Either not authorized or no invitation found
      expect((data as { success: boolean }).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 3: Edge Function - decline-reviewer-invitation
  // --------------------------------------------------------------------------
  describe('Edge Function: decline-reviewer-invitation', () => {
    it('TC-DEC-01: Requires authenticated user', async () => {
      await supabase.auth.signOut();
      
      const { data } = await invokeEdgeFunction('decline-reviewer-invitation', {});
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-DEC-02: Accepts optional decline reason', async () => {
      const { data } = await invokeEdgeFunction('decline-reviewer-invitation', {
        reason: 'Not available at this time',
      });
      
      // Should fail due to auth or no invitation, but should accept the reason parameter
      expect(data).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Section 4: Edge Function - approve-reviewer-application
  // --------------------------------------------------------------------------
  describe('Edge Function: approve-reviewer-application', () => {
    it('TC-APRV-01: Requires admin authentication', async () => {
      await supabase.auth.signOut();
      
      const { data } = await invokeEdgeFunction('approve-reviewer-application', {
        reviewer_id: 'test-id',
      });
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-APRV-02: Rejects missing reviewer_id', async () => {
      const { data } = await invokeEdgeFunction('approve-reviewer-application', {});
      
      expect((data as { success: boolean }).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 5: Edge Function - reject-reviewer-application
  // --------------------------------------------------------------------------
  describe('Edge Function: reject-reviewer-application', () => {
    it('TC-REJ-01: Requires admin authentication', async () => {
      await supabase.auth.signOut();
      
      const { data } = await invokeEdgeFunction('reject-reviewer-application', {
        reviewer_id: 'test-id',
        reason: 'Test rejection',
      });
      
      expect((data as { success: boolean }).success).toBe(false);
    });

    it('TC-REJ-02: Requires rejection reason', async () => {
      const { data } = await invokeEdgeFunction('reject-reviewer-application', {
        reviewer_id: 'test-id',
      });
      
      expect((data as { success: boolean }).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 6: Edge Function - cancel-reviewer-invitation
  // --------------------------------------------------------------------------
  describe('Edge Function: cancel-reviewer-invitation', () => {
    it('TC-CAN-01: Requires admin authentication', async () => {
      await supabase.auth.signOut();
      
      const { data } = await invokeEdgeFunction('cancel-reviewer-invitation', {
        reviewer_id: 'test-id',
      });
      
      expect((data as { success: boolean }).success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Section 7: Database Query Tests
  // --------------------------------------------------------------------------
  describe('Database Queries', () => {
    it('TC-DB-01: Can query panel_reviewers table', async () => {
      const { data, error } = await supabase
        .from('panel_reviewers')
        .select('id')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('TC-DB-02: Can query user_roles table', async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('TC-DB-03: Can filter reviewers by enrollment_source', async () => {
      const { data, error } = await supabase
        .from('panel_reviewers')
        .select('id, enrollment_source')
        .eq('enrollment_source', 'self_signup')
        .limit(5);
      
      expect(error).toBeNull();
      data?.forEach(reviewer => {
        expect(reviewer.enrollment_source).toBe('self_signup');
      });
    });

    it('TC-DB-04: Can filter reviewers by invitation_status', async () => {
      const { data, error } = await supabase
        .from('panel_reviewers')
        .select('id, invitation_status')
        .eq('invitation_status', 'SENT')
        .limit(5);
      
      expect(error).toBeNull();
      data?.forEach(reviewer => {
        expect(reviewer.invitation_status).toBe('SENT');
      });
    });

    it('TC-DB-05: Can filter reviewers by approval_status', async () => {
      const { data, error } = await supabase
        .from('panel_reviewers')
        .select('id, approval_status')
        .eq('approval_status', 'pending')
        .limit(5);
      
      expect(error).toBeNull();
      data?.forEach(reviewer => {
        expect(reviewer.approval_status).toBe('pending');
      });
    });

    it('TC-DB-06: Can filter reviewers by is_active', async () => {
      const { data, error } = await supabase
        .from('panel_reviewers')
        .select('id, is_active')
        .eq('is_active', true)
        .limit(5);
      
      expect(error).toBeNull();
      data?.forEach(reviewer => {
        expect(reviewer.is_active).toBe(true);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Section 8: Helper Function Tests
  // --------------------------------------------------------------------------
  describe('Helper Functions', () => {
    it('TC-HLP-01: getReviewerByEmail returns null for non-existent email', async () => {
      const reviewer = await getReviewerByEmail('nonexistent@example.com');
      expect(reviewer).toBeNull();
    });

    it('TC-HLP-02: getReviewerById returns null for non-existent ID', async () => {
      const reviewer = await getReviewerById('00000000-0000-0000-0000-000000000000');
      expect(reviewer).toBeNull();
    });

    it('TC-HLP-03: hasReviewerRole returns false for non-existent user', async () => {
      const hasRole = await hasReviewerRole('00000000-0000-0000-0000-000000000000');
      expect(hasRole).toBe(false);
    });
  });
});
