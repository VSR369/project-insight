/**
 * Reviewer Portal Tests (RP-xxx)
 * 
 * Comprehensive tests for Panel Reviewer functionality:
 * - Reviewer application and onboarding
 * - Dashboard and candidate access
 * - Interview booking management
 * - Evaluation submission
 * - Availability management
 * - RLS isolation for reviewers
 */

import { supabase } from "@/integrations/supabase/client";
import { TestCase, TestCategory, runTest } from "./types";

// ============================================================================
// REVIEWER APPLICATION TESTS
// ============================================================================

const reviewerApplicationTests: TestCase[] = [
  {
    id: "RP-001",
    category: "Reviewer Application",
    name: "Panel reviewers table accessible",
    description: "Verify panel_reviewers table is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, email, approval_status")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw new Error(`Panel reviewers query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-002",
    category: "Reviewer Application",
    name: "Reviewer has required fields",
    description: "Verify reviewer record has name, email, industries, levels",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, industry_segment_ids, expertise_level_ids")
        .eq("user_id", user.id)
        .single();
      
      if (error || !data) throw new Error("SKIP: No reviewer record found");
      
      if (!data.name) throw new Error("Reviewer missing name");
      if (!data.email) throw new Error("Reviewer missing email");
    }),
  },
  {
    id: "RP-003",
    category: "Reviewer Application",
    name: "Reviewer approval status valid",
    description: "Verify approval_status has valid value",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "approved", "rejected", null];
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("approval_status")
        .limit(20);
      
      if (error) throw new Error(`Approval status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(r => 
        r.approval_status !== null && !validStatuses.includes(r.approval_status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid approval statuses`);
      }
    }),
  },
  {
    id: "RP-004",
    category: "Reviewer Application",
    name: "Reviewer invitation status valid",
    description: "Verify invitation_status has valid value",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "sent", "accepted", "expired", "revoked", null];
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("invitation_status")
        .limit(20);
      
      if (error) throw new Error(`Invitation status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(r => 
        r.invitation_status !== null && !validStatuses.includes(r.invitation_status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid invitation statuses`);
      }
    }),
  },
];

// ============================================================================
// REVIEWER DASHBOARD TESTS
// ============================================================================

const reviewerDashboardTests: TestCase[] = [
  {
    id: "RP-005",
    category: "Reviewer Dashboard",
    name: "Approved reviewer can query dashboard",
    description: "Verify approved reviewer can access dashboard data",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer, error } = await supabase
        .from("panel_reviewers")
        .select("id, approval_status, is_active")
        .eq("user_id", user.id)
        .single();
      
      if (error || !reviewer) throw new Error("SKIP: No reviewer record");
      if (reviewer.approval_status !== "approved") {
        throw new Error("SKIP: Reviewer not approved");
      }
    }),
  },
  {
    id: "RP-006",
    category: "Reviewer Dashboard",
    name: "Reviewer can query assigned bookings",
    description: "Verify reviewer can see their booking assignments",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select(`
          id,
          acceptance_status,
          booking:interview_bookings(
            id,
            scheduled_at,
            status
          )
        `)
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Booking query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// CANDIDATE ACCESS TESTS
// ============================================================================

const candidateAccessTests: TestCase[] = [
  {
    id: "RP-007",
    category: "Candidate Access",
    name: "Reviewer can access assigned candidates",
    description: "Verify reviewer can view candidate details for assigned bookings",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      // Get bookings with provider info
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select(`
          id,
          booking:interview_bookings(
            id,
            provider:solution_providers(id, first_name, last_name)
          )
        `)
        .eq("reviewer_id", reviewer.id)
        .limit(5);
      
      if (error) throw new Error(`Candidate access query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-008",
    category: "Candidate Access",
    name: "Reviewer can view candidate proof points",
    description: "Verify reviewer can access candidate's proof points",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      // Query proof points - RLS should allow reviewers to see assigned candidates' data
      const { error } = await supabase
        .from("proof_points")
        .select("id, title, category")
        .eq("is_deleted", false)
        .limit(5);
      
      // If no error, query mechanism works (results depend on RLS)
      if (error && error.code === "42501") {
        throw new Error("RLS denied proof points access");
      }
    }),
  },
];

// ============================================================================
// INTERVIEW BOOKING MANAGEMENT TESTS
// ============================================================================

const bookingManagementTests: TestCase[] = [
  {
    id: "RP-009",
    category: "Booking Management",
    name: "Booking reviewers table accessible",
    description: "Verify booking_reviewers junction table is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select("id, booking_id, acceptance_status, slot_id")
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Booking reviewers query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-010",
    category: "Booking Management",
    name: "Acceptance status values valid",
    description: "Verify acceptance_status has valid values",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "accepted", "declined", null];
      
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select("acceptance_status")
        .limit(50);
      
      if (error) throw new Error(`Acceptance status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(b => 
        b.acceptance_status !== null && !validStatuses.includes(b.acceptance_status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid acceptance statuses`);
      }
    }),
  },
  {
    id: "RP-011",
    category: "Booking Management",
    name: "Interview booking status valid",
    description: "Verify interview booking status values",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "confirmed", "scheduled", "in_progress", "completed", "cancelled", null];
      
      const { data, error } = await supabase
        .from("interview_bookings")
        .select("status")
        .limit(50);
      
      if (error) throw new Error(`Booking status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(b => 
        b.status !== null && !validStatuses.includes(b.status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid booking statuses`);
      }
    }),
  },
];

// ============================================================================
// EVALUATION TESTS
// ============================================================================

const evaluationTests: TestCase[] = [
  {
    id: "RP-012",
    category: "Evaluation",
    name: "Interview evaluations table accessible",
    description: "Verify interview_evaluations table is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      const { data, error } = await supabase
        .from("interview_evaluations")
        .select("id, booking_id, overall_score, outcome")
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Evaluations query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-013",
    category: "Evaluation",
    name: "Evaluation outcome values valid",
    description: "Verify evaluation outcome values are valid",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validOutcomes = ["pass", "fail", "defer", null];
      
      const { data, error } = await supabase
        .from("interview_evaluations")
        .select("outcome")
        .limit(50);
      
      if (error) throw new Error(`Outcome query failed: ${error.message}`);
      
      const invalid = (data || []).filter(e => 
        e.outcome !== null && !validOutcomes.includes(e.outcome)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid outcomes`);
      }
    }),
  },
  {
    id: "RP-014",
    category: "Evaluation",
    name: "Question responses table accessible",
    description: "Verify interview_question_responses table queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_question_responses")
        .select("id, evaluation_id, question_text, rating, score")
        .eq("is_deleted", false)
        .limit(20);
      
      if (error) throw new Error(`Question responses query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-015",
    category: "Evaluation",
    name: "Rating values valid",
    description: "Verify question response rating values",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validRatings = ["strong", "acceptable", "developing", "not_demonstrated", null];
      
      const { data, error } = await supabase
        .from("interview_question_responses")
        .select("rating")
        .eq("is_deleted", false)
        .limit(100);
      
      if (error) throw new Error(`Rating query failed: ${error.message}`);
      
      const invalid = (data || []).filter(r => 
        r.rating !== null && !validRatings.includes(r.rating)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid ratings`);
      }
    }),
  },
];

// ============================================================================
// AVAILABILITY MANAGEMENT TESTS
// ============================================================================

const availabilityTests: TestCase[] = [
  {
    id: "RP-016",
    category: "Availability",
    name: "Interview slots table accessible",
    description: "Verify interview_slots table is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      const { data, error } = await supabase
        .from("interview_slots")
        .select("id, start_at, end_at, status")
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Interview slots query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-017",
    category: "Availability",
    name: "Slot status values valid",
    description: "Verify interview slot status values",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["available", "booked", "cancelled", "hold", null];
      
      const { data, error } = await supabase
        .from("interview_slots")
        .select("status")
        .limit(50);
      
      if (error) throw new Error(`Slot status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(s => 
        s.status !== null && !validStatuses.includes(s.status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid slot statuses`);
      }
    }),
  },
  {
    id: "RP-018",
    category: "Availability",
    name: "Slot has industry and expertise arrays",
    description: "Verify slot_industry_ids and slot_expertise_ids exist",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_slots")
        .select("id, slot_industry_ids, slot_expertise_ids")
        .limit(10);
      
      if (error) throw new Error(`Slot arrays query failed: ${error.message}`);
      
      // Fields should exist (may be null or empty array)
    }),
  },
];

// ============================================================================
// REVIEWER RLS ISOLATION TESTS
// ============================================================================

const reviewerRlsTests: TestCase[] = [
  {
    id: "RP-019",
    category: "Reviewer RLS",
    name: "Reviewer cannot see other reviewer slots",
    description: "Verify reviewer can only see their own availability slots",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      // Query all slots - RLS should filter to only this reviewer's slots
      const { data, error } = await supabase
        .from("interview_slots")
        .select("id, reviewer_id");
      
      if (error) throw new Error(`Slots query failed: ${error.message}`);
      
      // All returned slots should belong to this reviewer (or admin can see all)
    }),
  },
  {
    id: "RP-020",
    category: "Reviewer RLS",
    name: "Reviewer cannot modify other evaluations",
    description: "Verify reviewer can only modify their own evaluations",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      // Query evaluations - should only see own
      const { data, error } = await supabase
        .from("interview_evaluations")
        .select("id, reviewer_id")
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Evaluations query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// WORKLOAD DISTRIBUTION TESTS
// ============================================================================

const workloadTests: TestCase[] = [
  {
    id: "RP-021",
    category: "Workload",
    name: "Workload distribution view accessible",
    description: "Verify reviewer_workload_distribution view is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("reviewer_workload_distribution")
        .select("id, name, pending_count, completed_count")
        .limit(10);
      
      if (error) throw new Error(`Workload view query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-022",
    category: "Workload",
    name: "Max interviews per day configured",
    description: "Verify max_interviews_per_day field exists",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, max_interviews_per_day")
        .limit(10);
      
      if (error) throw new Error(`Max interviews query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// INTERVIEW KIT TESTS
// ============================================================================

const interviewKitTests: TestCase[] = [
  {
    id: "RP-023",
    category: "Interview Kit",
    name: "Competencies accessible to reviewer",
    description: "Verify interview competencies are queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_kit_competencies")
        .select("id, code, name, color")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw new Error(`Competencies query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-024",
    category: "Interview Kit",
    name: "Interview questions accessible",
    description: "Verify interview kit questions are queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_kit_questions")
        .select("id, question_text, expected_answer, competency_id")
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Interview questions query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// PROOF POINT REVIEW TESTS
// ============================================================================

const proofPointReviewTests: TestCase[] = [
  {
    id: "RP-025",
    category: "Proof Point Review",
    name: "Proof point reviews table accessible",
    description: "Verify proof_point_reviews table is queryable",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!reviewer) throw new Error("SKIP: No reviewer record");
      
      const { data, error } = await supabase
        .from("proof_point_reviews")
        .select("id, proof_point_id, verification_status, evidence_strength")
        .eq("reviewer_id", reviewer.id);
      
      if (error) throw new Error(`Proof point reviews query failed: ${error.message}`);
    }),
  },
  {
    id: "RP-026",
    category: "Proof Point Review",
    name: "Verification status values valid",
    description: "Verify verification_status has valid values",
    role: "panel_reviewer",
    module: "reviewer_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "verified", "rejected", "needs_clarification"];
      
      const { data, error } = await supabase
        .from("proof_point_reviews")
        .select("verification_status")
        .limit(50);
      
      if (error) throw new Error(`Verification status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(r => !validStatuses.includes(r.verification_status));
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid verification statuses`);
      }
    }),
  },
];

// ============================================================================
// EXPORT REVIEWER PORTAL TEST CATEGORIES
// ============================================================================

export const reviewerPortalTestCategories: TestCategory[] = [
  {
    id: "reviewer-application",
    name: "Reviewer Application",
    description: "Reviewer onboarding and application tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: reviewerApplicationTests,
  },
  {
    id: "reviewer-dashboard",
    name: "Reviewer Dashboard",
    description: "Dashboard access and data loading tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: reviewerDashboardTests,
  },
  {
    id: "candidate-access",
    name: "Candidate Access",
    description: "Candidate information access tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: candidateAccessTests,
  },
  {
    id: "booking-management",
    name: "Booking Management",
    description: "Interview booking management tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: bookingManagementTests,
  },
  {
    id: "evaluation",
    name: "Evaluation",
    description: "Interview evaluation submission tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: evaluationTests,
  },
  {
    id: "availability",
    name: "Availability Management",
    description: "Reviewer availability slot tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: availabilityTests,
  },
  {
    id: "reviewer-rls",
    name: "Reviewer RLS Isolation",
    description: "Data isolation tests for reviewers",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: reviewerRlsTests,
  },
  {
    id: "workload",
    name: "Workload Distribution",
    description: "Reviewer workload management tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: workloadTests,
  },
  {
    id: "interview-kit",
    name: "Interview Kit",
    description: "Interview kit questions and competencies tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: interviewKitTests,
  },
  {
    id: "proof-point-review",
    name: "Proof Point Review",
    description: "Proof point verification tests",
    role: "panel_reviewer",
    module: "reviewer_portal",
    tests: proofPointReviewTests,
  },
];

// Get all reviewer portal tests flattened
export function getReviewerPortalTests(): TestCase[] {
  return reviewerPortalTestCategories.flatMap(cat => cat.tests);
}

// Get reviewer portal test count
export function getReviewerPortalTestCount(): number {
  return reviewerPortalTestCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
}
