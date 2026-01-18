/**
 * Reviewer Enrollment Smoke Tests
 * 
 * Read-only tests that verify the existence and basic structure of
 * reviewer enrollment components. Safe to run in production.
 * 
 * Coverage:
 * - Edge function existence
 * - Database schema validation
 * - RLS policy validation
 * - React hook exports
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// EDGE FUNCTION EXISTENCE TESTS
// ============================================================================

describe('Reviewer Edge Functions: Existence', () => {
  const edgeFunctions = [
    'register-reviewer-application',
    'create-panel-reviewer',
    'send-reviewer-invitation',
    'accept-reviewer-invitation',
    'decline-reviewer-invitation',
    'approve-reviewer-application',
    'reject-reviewer-application',
    'cancel-reviewer-invitation',
    'delete-panel-reviewer',
  ];

  edgeFunctions.forEach((functionName) => {
    it(`TC-EF-${functionName}: Edge function exists and responds`, async () => {
      // Invoke with empty body - we just want to verify the function exists
      // It should return an error (unauthorized or validation) but NOT 404
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {},
      });

      // The function should respond (even with an error)
      // A 404 would indicate the function doesn't exist
      const response = data || error;
      expect(response).toBeDefined();
      
      // If we got an error, it should NOT be a "function not found" error
      if (error) {
        expect(error.message).not.toContain('404');
        expect(error.message).not.toContain('not found');
      }
    });
  });
});

// ============================================================================
// DATABASE SCHEMA VALIDATION
// ============================================================================

describe('Reviewer Schema: Validation', () => {
  it('TC-SCH-01: panel_reviewers table exists', async () => {
    const { error } = await supabase
      .from('panel_reviewers')
      .select('id')
      .limit(0);
    
    expect(error).toBeNull();
  });

  it('TC-SCH-02: user_roles table exists', async () => {
    const { error } = await supabase
      .from('user_roles')
      .select('id')
      .limit(0);
    
    expect(error).toBeNull();
  });

  it('TC-SCH-03: panel_reviewers has required columns', async () => {
    const { data, error } = await supabase
      .from('panel_reviewers')
      .select('id, user_id, name, email, enrollment_source, invitation_status, approval_status, is_active')
      .limit(1);
    
    expect(error).toBeNull();
    // If there's data, verify the columns exist by checking the structure
    if (data && data.length > 0) {
      const reviewer = data[0];
      expect('id' in reviewer).toBe(true);
      expect('user_id' in reviewer).toBe(true);
      expect('name' in reviewer).toBe(true);
      expect('email' in reviewer).toBe(true);
      expect('enrollment_source' in reviewer).toBe(true);
      expect('invitation_status' in reviewer).toBe(true);
      expect('approval_status' in reviewer).toBe(true);
      expect('is_active' in reviewer).toBe(true);
    }
  });

  it('TC-SCH-04: panel_reviewers has invitation-related columns', async () => {
    const { data, error } = await supabase
      .from('panel_reviewers')
      .select('invitation_channel, invitation_message, invitation_sent_at, invitation_accepted_at, invitation_token_expires_at')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('TC-SCH-05: panel_reviewers has approval-related columns', async () => {
    const { data, error } = await supabase
      .from('panel_reviewers')
      .select('approved_at, approved_by, approval_notes')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('TC-SCH-06: panel_reviewers has audit columns', async () => {
    const { data, error } = await supabase
      .from('panel_reviewers')
      .select('created_at, created_by, updated_at, updated_by')
      .limit(1);
    
    expect(error).toBeNull();
  });

  it('TC-SCH-07: panel_reviewers has industry and expertise arrays', async () => {
    const { data, error } = await supabase
      .from('panel_reviewers')
      .select('industry_segment_ids, expertise_level_ids')
      .limit(1);
    
    expect(error).toBeNull();
  });
});

// ============================================================================
// ENROLLMENT SOURCE ENUM VALIDATION
// ============================================================================

describe('Reviewer Enrollment Source: Values', () => {
  it('TC-ENUM-01: Can query reviewers with invitation source', async () => {
    const { error } = await supabase
      .from('panel_reviewers')
      .select('id')
      .eq('enrollment_source', 'invitation')
      .limit(0);
    
    // Should not error - the enum value is valid
    expect(error).toBeNull();
  });

  it('TC-ENUM-02: Can query reviewers with self_signup source', async () => {
    const { error } = await supabase
      .from('panel_reviewers')
      .select('id')
      .eq('enrollment_source', 'self_signup')
      .limit(0);
    
    expect(error).toBeNull();
  });
});

// ============================================================================
// INVITATION STATUS ENUM VALIDATION
// ============================================================================

describe('Reviewer Invitation Status: Values', () => {
  const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'];

  validStatuses.forEach((status) => {
    it(`TC-INV-STATUS-${status}: Can query with status ${status}`, async () => {
      const { error } = await supabase
        .from('panel_reviewers')
        .select('id')
        .eq('invitation_status', status)
        .limit(0);
      
      expect(error).toBeNull();
    });
  });

  it('TC-INV-STATUS-NULL: Can query with null invitation_status', async () => {
    const { error } = await supabase
      .from('panel_reviewers')
      .select('id')
      .is('invitation_status', null)
      .limit(0);
    
    expect(error).toBeNull();
  });
});

// ============================================================================
// APPROVAL STATUS ENUM VALIDATION
// ============================================================================

describe('Reviewer Approval Status: Values', () => {
  const validStatuses = ['pending', 'approved', 'rejected'];

  validStatuses.forEach((status) => {
    it(`TC-APR-STATUS-${status}: Can query with status ${status}`, async () => {
      const { error } = await supabase
        .from('panel_reviewers')
        .select('id')
        .eq('approval_status', status)
        .limit(0);
      
      expect(error).toBeNull();
    });
  });
});

// ============================================================================
// REACT HOOK EXPORTS
// ============================================================================

describe('Reviewer Hooks: Exports', () => {
  it('TC-HK-01: usePanelReviewers hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.usePanelReviewers).toBeDefined();
    expect(typeof module.usePanelReviewers).toBe('function');
  });

  it('TC-HK-02: useCreatePanelReviewer hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useCreatePanelReviewer).toBeDefined();
    expect(typeof module.useCreatePanelReviewer).toBe('function');
  });

  it('TC-HK-03: useSendReviewerInvitation hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useSendReviewerInvitation).toBeDefined();
    expect(typeof module.useSendReviewerInvitation).toBe('function');
  });

  it('TC-HK-04: usePendingReviewers hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.usePendingReviewers).toBeDefined();
    expect(typeof module.usePendingReviewers).toBe('function');
  });

  it('TC-HK-05: useInvitedReviewers hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useInvitedReviewers).toBeDefined();
    expect(typeof module.useInvitedReviewers).toBe('function');
  });

  it('TC-HK-06: useInvitationStats hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useInvitationStats).toBeDefined();
    expect(typeof module.useInvitationStats).toBe('function');
  });

  it('TC-HK-07: useCancelReviewerInvitation hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useCancelReviewerInvitation).toBeDefined();
    expect(typeof module.useCancelReviewerInvitation).toBe('function');
  });

  it('TC-HK-08: useDeletePanelReviewer hook is exported', async () => {
    const module = await import('@/hooks/queries/usePanelReviewers');
    expect(module.useDeletePanelReviewer).toBeDefined();
    expect(typeof module.useDeletePanelReviewer).toBe('function');
  });
});

// ============================================================================
// FIXTURE IMPORTS
// ============================================================================

describe('Reviewer Fixtures: Imports', () => {
  it('TC-FIX-01: Fixture factories are importable', async () => {
    const fixtures = await import('./fixtures/reviewer-fixtures');
    
    expect(fixtures.createInvitedReviewerFixture).toBeDefined();
    expect(fixtures.createSelfSignupReviewerFixture).toBeDefined();
    expect(fixtures.createValidApplicationInput).toBeDefined();
    expect(fixtures.createValidInvitationInput).toBeDefined();
  });

  it('TC-FIX-02: State transitions are importable', async () => {
    const fixtures = await import('./fixtures/reviewer-fixtures');
    
    expect(fixtures.INVITATION_STATE_TRANSITIONS).toBeDefined();
    expect(fixtures.APPROVAL_STATE_TRANSITIONS).toBeDefined();
  });

  it('TC-FIX-03: Test scenarios are importable', async () => {
    const fixtures = await import('./fixtures/reviewer-fixtures');
    
    expect(fixtures.INVITATION_FLOW_SCENARIOS).toBeDefined();
    expect(fixtures.SELF_SIGNUP_FLOW_SCENARIOS).toBeDefined();
  });

  it('TC-FIX-04: Test cases are importable', async () => {
    const fixtures = await import('./fixtures/reviewer-fixtures');
    
    expect(fixtures.TOKEN_EXPIRATION_CASES).toBeDefined();
    expect(fixtures.ROLE_ASSIGNMENT_CASES).toBeDefined();
    expect(fixtures.IS_ACTIVE_CASES).toBeDefined();
    expect(fixtures.INVALID_APPLICATION_INPUTS).toBeDefined();
  });
});

// ============================================================================
// TEST HELPER IMPORTS
// ============================================================================

describe('Reviewer Test Helpers: Imports', () => {
  it('TC-TH-01: Authentication helpers are importable', async () => {
    const helpers = await import('./helpers/reviewerTestAuth');
    
    expect(helpers.authenticateTestReviewer).toBeDefined();
    expect(helpers.signOutTestUser).toBeDefined();
  });

  it('TC-TH-02: Lookup helpers are importable', async () => {
    const helpers = await import('./helpers/reviewerTestAuth');
    
    expect(helpers.getReviewerByEmail).toBeDefined();
    expect(helpers.getReviewerById).toBeDefined();
    expect(helpers.getReviewerByUserId).toBeDefined();
  });

  it('TC-TH-03: Edge function call helpers are importable', async () => {
    const helpers = await import('./helpers/reviewerTestAuth');
    
    expect(helpers.callAcceptInvitation).toBeDefined();
    expect(helpers.callDeclineInvitation).toBeDefined();
    expect(helpers.callApproveApplication).toBeDefined();
    expect(helpers.callRejectApplication).toBeDefined();
  });

  it('TC-TH-04: Utility helpers are importable', async () => {
    const helpers = await import('./helpers/reviewerTestAuth');
    
    expect(helpers.hasReviewerRole).toBeDefined();
    expect(helpers.cleanupTestReviewers).toBeDefined();
    expect(helpers.getReviewerCount).toBeDefined();
    expect(helpers.simulateInvitationExpiry).toBeDefined();
  });
});

// ============================================================================
// VALIDATION SCHEMA TESTS
// ============================================================================

describe('Reviewer Validation Schemas: Imports', () => {
  it('TC-VAL-01: Reviewer validation schemas are importable', async () => {
    const validations = await import('@/lib/validations/reviewer');
    
    expect(validations.panelReviewerSchema).toBeDefined();
    expect(validations.invitationSettingsSchema).toBeDefined();
    expect(validations.reviewerInviteSchema).toBeDefined();
  });

  it('TC-VAL-02: Validation types are exportable', async () => {
    const validations = await import('@/lib/validations/reviewer');
    
    // These are TypeScript types, so we can only verify the schema exists
    // The types are inferred from the schemas
    expect(validations.panelReviewerSchema.parse).toBeDefined();
    expect(validations.reviewerInviteSchema.parse).toBeDefined();
  });

  it('TC-VAL-03: Default values are exportable', async () => {
    const validations = await import('@/lib/validations/reviewer');
    
    expect(validations.DEFAULT_INVITATION_MESSAGE).toBeDefined();
    expect(typeof validations.DEFAULT_INVITATION_MESSAGE).toBe('string');
  });

  it('TC-VAL-04: Options arrays are exportable', async () => {
    const validations = await import('@/lib/validations/reviewer');
    
    expect(validations.TIMEZONE_OPTIONS).toBeDefined();
    expect(validations.EXPIRY_OPTIONS).toBeDefined();
    expect(validations.EXPERIENCE_OPTIONS).toBeDefined();
    expect(Array.isArray(validations.TIMEZONE_OPTIONS)).toBe(true);
    expect(Array.isArray(validations.EXPIRY_OPTIONS)).toBe(true);
    expect(Array.isArray(validations.EXPERIENCE_OPTIONS)).toBe(true);
  });
});
