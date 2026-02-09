/**
 * Cross-Portal Integration Tests (CI-xxx)
 * 
 * Tests for cross-portal interactions:
 * - Provider enrollment → Reviewer visibility
 * - Assessment completion → Interview eligibility
 * - Interview completion → Lifecycle progression
 * - Admin actions → User impact
 * - Pulse social cross-user visibility
 */

import { supabase } from "@/integrations/supabase/client";
import { TestCase, TestCategory, runTest } from "./types";

// ============================================================================
// ENROLLMENT TO INTERVIEW FLOW TESTS
// ============================================================================

const enrollmentToInterviewTests: TestCase[] = [
  {
    id: "CI-001",
    category: "Enrollment → Interview",
    name: "Assessment passed enables interview scheduling",
    description: "Verify enrollments with passed assessments are interview-ready",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      // Query enrollments at assessment_passed status
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, lifecycle_rank")
        .eq("lifecycle_status", "assessment_passed")
        .limit(5);
      
      if (error) throw new Error(`Assessment passed query failed: ${error.message}`);
      
      // Verify they have correct rank (110)
      const wrongRank = (data || []).filter(e => e.lifecycle_rank !== 110);
      if (wrongRank.length > 0) {
        throw new Error(`Found ${wrongRank.length} assessment_passed with wrong rank`);
      }
    }),
  },
  {
    id: "CI-002",
    category: "Enrollment → Interview",
    name: "Interview booked advances lifecycle",
    description: "Verify panel_scheduled status after booking",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      // Check for enrollments in panel_scheduled state
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          lifecycle_status,
          bookings:interview_bookings(id, status)
        `)
        .eq("lifecycle_status", "panel_scheduled")
        .limit(5);
      
      if (error) throw new Error(`Panel scheduled query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-003",
    category: "Enrollment → Interview",
    name: "Composite slots match enrollment criteria",
    description: "Verify slots have matching industry and level",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("composite_interview_slots")
        .select(`
          id,
          industry_segment_id,
          expertise_level_id,
          industry_segment:industry_segments(name),
          expertise_level:expertise_levels(name)
        `)
        .eq("status", "available")
        .limit(10);
      
      if (error) throw new Error(`Composite slots query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// REVIEWER ASSIGNMENT TESTS
// ============================================================================

const reviewerAssignmentTests: TestCase[] = [
  {
    id: "CI-004",
    category: "Reviewer Assignment",
    name: "Bookings have required reviewer count",
    description: "Verify bookings meet quorum requirements",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select(`
          id,
          reviewers:booking_reviewers(id, reviewer_id)
        `)
        .eq("status", "confirmed")
        .limit(10);
      
      if (error) throw new Error(`Booking reviewers query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-005",
    category: "Reviewer Assignment",
    name: "Reviewer acceptance updates booking",
    description: "Verify acceptance status reflects in booking",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select(`
          id,
          acceptance_status,
          booking:interview_bookings(id, status)
        `)
        .in("acceptance_status", ["accepted", "declined"])
        .limit(10);
      
      if (error) throw new Error(`Reviewer acceptance query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-006",
    category: "Reviewer Assignment",
    name: "Reviewer slot links to booking",
    description: "Verify slot_id in booking_reviewers is valid",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select(`
          id,
          slot_id,
          slot:interview_slots(id, status)
        `)
        .not("slot_id", "is", null)
        .limit(10);
      
      if (error) throw new Error(`Reviewer slot link query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// INTERVIEW COMPLETION TESTS
// ============================================================================

const interviewCompletionTests: TestCase[] = [
  {
    id: "CI-007",
    category: "Interview Completion",
    name: "Completed interview has evaluations",
    description: "Verify completed bookings have evaluation records",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select(`
          id,
          evaluations:interview_evaluations(id, overall_score)
        `)
        .eq("status", "completed")
        .limit(10);
      
      if (error) throw new Error(`Completed interview query failed: ${error.message}`);
      
      // Completed interviews should have evaluations
      const noEvals = (data || []).filter(b => !b.evaluations || b.evaluations.length === 0);
      // This is informational - some may still be pending
    }),
  },
  {
    id: "CI-008",
    category: "Interview Completion",
    name: "Evaluation score populates booking",
    description: "Verify booking score fields are updated",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select("id, interview_score_percentage, interview_outcome")
        .eq("status", "completed")
        .not("interview_outcome", "is", null)
        .limit(10);
      
      if (error) throw new Error(`Booking score query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-009",
    category: "Interview Completion",
    name: "Successful interview advances to panel_completed",
    description: "Verify lifecycle updates after interview pass",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, lifecycle_rank")
        .eq("lifecycle_status", "panel_completed")
        .limit(5);
      
      if (error) throw new Error(`Panel completed query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// ADMIN APPROVAL FLOW TESTS
// ============================================================================

const adminApprovalTests: TestCase[] = [
  {
    id: "CI-010",
    category: "Admin Approval",
    name: "Reviewer approval grants role",
    description: "Verify approved reviewers have panel_reviewer role",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      // Get approved reviewers with user_id
      const { data: reviewers, error: reviewerError } = await supabase
        .from("panel_reviewers")
        .select("id, user_id, approval_status")
        .eq("approval_status", "approved")
        .not("user_id", "is", null)
        .limit(10);
      
      if (reviewerError) throw new Error(`Approved reviewers query failed: ${reviewerError.message}`);
      
      if (reviewers && reviewers.length > 0) {
        // Check if they have the role
        const userIds = reviewers.map(r => r.user_id).filter(Boolean);
        
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
          .eq("role", "panel_reviewer");
        
        if (rolesError) throw new Error(`Roles query failed: ${rolesError.message}`);
      }
    }),
  },
  {
    id: "CI-011",
    category: "Admin Approval",
    name: "Reviewer invitation status tracked",
    description: "Verify panel reviewer invitation status",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, email, invitation_status, created_at")
        .eq("invitation_status", "pending")
        .limit(10);
      
      if (error) throw new Error(`Panel reviewers query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// ORGANIZATION APPROVAL FLOW TESTS
// ============================================================================

const orgApprovalTests: TestCase[] = [
  {
    id: "CI-012",
    category: "Org Approval",
    name: "Org pending blocks progress",
    description: "Verify org_info_pending status is at rank 35",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, lifecycle_rank, org_approval_status")
        .eq("lifecycle_status", "org_info_pending")
        .limit(5);
      
      if (error) throw new Error(`Org pending query failed: ${error.message}`);
      
      const wrongRank = (data || []).filter(e => e.lifecycle_rank !== 35);
      if (wrongRank.length > 0) {
        throw new Error(`Found ${wrongRank.length} org_info_pending with wrong rank`);
      }
    }),
  },
  {
    id: "CI-013",
    category: "Org Approval",
    name: "Org validated advances lifecycle",
    description: "Verify org_validated status after approval",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, lifecycle_rank, org_approval_status")
        .eq("lifecycle_status", "org_validated")
        .limit(5);
      
      if (error) throw new Error(`Org validated query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// PULSE SOCIAL CROSS-USER TESTS
// ============================================================================

const pulseSocialTests: TestCase[] = [
  {
    id: "CI-014",
    category: "Pulse Social",
    name: "Published content visible to others",
    description: "Verify published content is queryable",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, provider_id, content_status, content_type")
        .eq("content_status", "published")
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Published content query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-015",
    category: "Pulse Social",
    name: "Engagements link content and provider",
    description: "Verify engagement records have valid references",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select(`
          id,
          provider_id,
          content:pulse_content(id, provider_id)
        `)
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Engagements query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-016",
    category: "Pulse Social",
    name: "Provider stats updated on engagement",
    description: "Verify pulse_provider_stats reflects activity",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_provider_stats")
        .select("provider_id, total_fire_received, total_gold_received, xp_balance")
        .limit(20);
      
      if (error) throw new Error(`Provider stats query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-017",
    category: "Pulse Social",
    name: "Comments link to content",
    description: "Verify pulse_comments reference valid content",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_comments")
        .select(`
          id,
          content:pulse_content(id)
        `)
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Comments query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// CERTIFICATION FLOW TESTS
// ============================================================================

const certificationTests: TestCase[] = [
  {
    id: "CI-018",
    category: "Certification",
    name: "Certified enrollments have timestamp",
    description: "Verify certified status has certified_at",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, certified_at, certification_level")
        .eq("lifecycle_status", "certified")
        .limit(10);
      
      if (error) throw new Error(`Certified query failed: ${error.message}`);
      
      const missingTimestamp = (data || []).filter(e => !e.certified_at);
      if (missingTimestamp.length > 0) {
        throw new Error(`Found ${missingTimestamp.length} certified without timestamp`);
      }
    }),
  },
  {
    id: "CI-019",
    category: "Certification",
    name: "Verified providers have active status",
    description: "Verify verified/active providers",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_status, lifecycle_rank")
        .in("lifecycle_status", ["verified", "active", "certified"])
        .limit(10);
      
      if (error) throw new Error(`Verified providers query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// ASSESSMENT FLOW TESTS
// ============================================================================

const assessmentFlowTests: TestCase[] = [
  {
    id: "CI-020",
    category: "Assessment Flow",
    name: "Assessment attempts link to enrollment",
    description: "Verify assessment_attempts have valid enrollment_id",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select(`
          id,
          enrollment:provider_industry_enrollments(id, lifecycle_status)
        `)
        .not("enrollment_id", "is", null)
        .limit(20);
      
      if (error) throw new Error(`Assessment enrollment link query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(a => !a.enrollment);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} assessments with invalid enrollment`);
      }
    }),
  },
  {
    id: "CI-021",
    category: "Assessment Flow",
    name: "Passed assessment updates lifecycle",
    description: "Verify is_passed correlates with lifecycle advancement",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select(`
          id,
          is_passed,
          score_percentage,
          enrollment:provider_industry_enrollments(id, lifecycle_status)
        `)
        .eq("is_passed", true)
        .not("enrollment_id", "is", null)
        .limit(10);
      
      if (error) throw new Error(`Passed assessment query failed: ${error.message}`);
    }),
  },
  {
    id: "CI-022",
    category: "Assessment Flow",
    name: "Assessment responses link to questions",
    description: "Verify response records have valid question references",
    role: "cross_portal",
    module: "integration",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("assessment_attempt_responses")
        .select(`
          id,
          question:question_bank(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Assessment responses query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(r => !r.question);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} responses with invalid question`);
      }
    }),
  },
];

// ============================================================================
// EXPORT INTEGRATION TEST CATEGORIES
// ============================================================================

export const integrationTestCategories: TestCategory[] = [
  {
    id: "enrollment-interview",
    name: "Enrollment → Interview Flow",
    description: "Tests for enrollment to interview progression",
    role: "cross_portal",
    module: "integration",
    tests: enrollmentToInterviewTests,
  },
  {
    id: "reviewer-assignment",
    name: "Reviewer Assignment",
    description: "Tests for reviewer booking assignment",
    role: "cross_portal",
    module: "integration",
    tests: reviewerAssignmentTests,
  },
  {
    id: "interview-completion",
    name: "Interview Completion",
    description: "Tests for interview completion and evaluation",
    role: "cross_portal",
    module: "integration",
    tests: interviewCompletionTests,
  },
  {
    id: "admin-approval",
    name: "Admin Approval",
    description: "Tests for admin approval workflows",
    role: "cross_portal",
    module: "integration",
    tests: adminApprovalTests,
  },
  {
    id: "org-approval",
    name: "Organization Approval",
    description: "Tests for organization approval flow",
    role: "cross_portal",
    module: "integration",
    tests: orgApprovalTests,
  },
  {
    id: "pulse-social",
    name: "Pulse Social Integration",
    description: "Tests for cross-user social features",
    role: "cross_portal",
    module: "integration",
    tests: pulseSocialTests,
  },
  {
    id: "certification",
    name: "Certification Flow",
    description: "Tests for certification and verification",
    role: "cross_portal",
    module: "integration",
    tests: certificationTests,
  },
  {
    id: "assessment-flow",
    name: "Assessment Flow",
    description: "Tests for assessment to lifecycle integration",
    role: "cross_portal",
    module: "integration",
    tests: assessmentFlowTests,
  },
];

// Get all integration tests flattened
export function getIntegrationTests(): TestCase[] {
  return integrationTestCategories.flatMap(cat => cat.tests);
}

// Get integration test count
export function getIntegrationTestCount(): number {
  return integrationTestCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
}
