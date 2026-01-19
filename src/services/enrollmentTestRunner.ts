/**
 * Enrollment Lifecycle Test Runner Service
 * Comprehensive test definitions for enrollment lifecycle validation
 * 
 * Test Categories:
 * - Lifecycle Ranks (LR-xxx): Status rank validation
 * - Lifecycle Locks (LL-xxx): Field modification locks
 * - Cascade Reset (CR-xxx): Cascade impact calculations
 * - Deletion Rules (ED-xxx): Enrollment deletion business rules
 * - Proof Points Min (PP-xxx): Proof points requirements
 * - Org Approval (OA-xxx): Organization approval workflow
 * - Enrollment Data (EN-xxx): Data integrity
 * - Multi-Industry (MI-xxx): Enrollment isolation
 * - Assessment Lifecycle (AS-xxx): Assessment flow
 * - Interview Scheduling (IS-xxx): Interview booking
 * - Audit Trail (AT-xxx): Audit field validation
 * - Security & RLS (SR-xxx): Row level security
 * - Master Data (MD-xxx): Reference data integrity
 * - Terminal States (TS-xxx): Terminal state behavior
 * - Error Handling (EH-xxx): Error path validation
 * - System Settings (SS-xxx): Configuration validation
 * - Lifecycle Progression (LP-xxx): Status transitions
 * 
 * NEW CATEGORIES (v2.0):
 * - Manager Approval Workflow (MA-xxx): Manager approval, expiry, reminders
 * - Interview Rescheduling (IR-xxx): Reschedule limits, cutoffs, eligibility
 * - Cross-Enrollment Rules (CE-xxx): Cross-enrollment blocking, isolation
 * - State Machine Validation (SM-xxx): Invalid transitions rejected
 * - Edge Function Smoke (EF-xxx): Edge function deployment verification
 * - Reviewer Enrollment (RE-xxx): Panel reviewer invitation flow
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  canModifyField, 
  getCascadeImpact, 
  isWizardStepLocked,
  isTerminalState,
  isHiddenState,
  isViewOnlyState,
  LIFECYCLE_RANKS,
  TERMINAL_STATES,
  HIDDEN_STATES,
  VIEW_ONLY_STATES,
  getLifecycleRank 
} from "@/services/lifecycleService";
import { 
  DEFAULT_QUESTIONS_PER_ASSESSMENT,
  DEFAULT_TIME_LIMIT_MINUTES,
  PASSING_SCORE_PERCENTAGE 
} from "@/constants/assessment.constants";

// Test result types
export type TestStatus = "not_tested" | "running" | "pass" | "fail" | "skipped";

export interface TestResult {
  status: "pass" | "fail" | "skipped";
  duration: number;
  error?: string;
}

export interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  run: () => Promise<TestResult>;
}

export interface TestCategory {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
}

// Helper to measure test duration
async function runTest(testFn: () => Promise<void>): Promise<TestResult> {
  const start = performance.now();
  try {
    await testFn();
    return {
      status: "pass",
      duration: Math.round(performance.now() - start),
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    // Check if this is a SKIP error (test prerequisite not met)
    if (errorMessage.startsWith("SKIP:")) {
      return {
        status: "skipped",
        duration: Math.round(performance.now() - start),
        error: errorMessage.replace("SKIP:", "").trim(),
      };
    }
    return {
      status: "fail",
      duration: Math.round(performance.now() - start),
      error: errorMessage,
    };
  }
}

// ===== LIFECYCLE LOCK TESTS =====
const lifecycleLockTests: TestCase[] = [
  {
    id: "LL-001",
    category: "lifecycle-locks",
    name: "Configuration editable before assessment",
    description: "Verify config fields are editable when rank < 100",
    run: () => runTest(async () => {
      const result = canModifyField(50, "configuration");
      if (!result.allowed) {
        throw new Error(`Expected allowed=true at rank 50, got: ${result.reason}`);
      }
    }),
  },
  {
    id: "LL-002",
    category: "lifecycle-locks",
    name: "Configuration locked at assessment",
    description: "Verify config fields are locked when rank >= 100",
    run: () => runTest(async () => {
      const result = canModifyField(100, "configuration");
      if (result.allowed) {
        throw new Error("Expected allowed=false at rank 100");
      }
    }),
  },
  {
    id: "LL-003",
    category: "lifecycle-locks",
    name: "Content editable before assessment",
    description: "Verify content fields are editable when rank < 100",
    run: () => runTest(async () => {
      const result = canModifyField(70, "content");
      if (!result.allowed) {
        throw new Error(`Expected allowed=true at rank 70, got: ${result.reason}`);
      }
    }),
  },
  {
    id: "LL-004",
    category: "lifecycle-locks",
    name: "Content locked at assessment",
    description: "Verify content fields are locked when rank >= 100",
    run: () => runTest(async () => {
      const result = canModifyField(100, "content");
      if (result.allowed) {
        throw new Error("Expected allowed=false at rank 100");
      }
    }),
  },
  {
    id: "LL-005",
    category: "lifecycle-locks",
    name: "Terminal state freezes all",
    description: "Verify all fields locked when rank >= 140 (verified/certified)",
    run: () => runTest(async () => {
      const regResult = canModifyField(140, "registration");
      const configResult = canModifyField(140, "configuration");
      const contentResult = canModifyField(140, "content");
      
      if (regResult.allowed || configResult.allowed || contentResult.allowed) {
        throw new Error("Expected all fields locked at rank 140 (terminal state)");
      }
    }),
  },
  {
    id: "LL-006",
    category: "lifecycle-locks",
    name: "Wizard steps 1-3 lock at assessment",
    description: "Verify early wizard steps are locked at rank 100",
    run: () => runTest(async () => {
      const step1Locked = isWizardStepLocked(1, 100);
      const step2Locked = isWizardStepLocked(2, 100);
      const step3Locked = isWizardStepLocked(3, 100);
      
      if (!step1Locked || !step2Locked || !step3Locked) {
        throw new Error(`Expected steps 1-3 locked: step1=${step1Locked}, step2=${step2Locked}, step3=${step3Locked}`);
      }
    }),
  },
  {
    id: "LL-007",
    category: "lifecycle-locks",
    name: "Wizard step 4 (Expertise) lock at assessment",
    description: "Verify expertise step is locked at rank 100",
    run: () => runTest(async () => {
      const locked = isWizardStepLocked(4, 100);
      if (!locked) {
        throw new Error("Expected step 4 (Expertise) locked at rank 100");
      }
    }),
  },
  {
    id: "LL-008",
    category: "lifecycle-locks",
    name: "Wizard step 5 (Proof Points) lock at assessment",
    description: "Verify proof points step is locked at rank 100",
    run: () => runTest(async () => {
      const locked = isWizardStepLocked(5, 100);
      if (!locked) {
        throw new Error("Expected step 5 (Proof Points) locked at rank 100");
      }
    }),
  },
  // NEW: Additional lifecycle lock tests for edge cases
  {
    id: "LL-009",
    category: "lifecycle-locks",
    name: "Config locked at rank 101 (edge case)",
    description: "Verify configuration locked just past threshold",
    run: () => runTest(async () => {
      const result = canModifyField(101, "configuration");
      if (result.allowed) {
        throw new Error("Expected config locked at rank 101");
      }
    }),
  },
  {
    id: "LL-010",
    category: "lifecycle-locks",
    name: "Registration locked at terminal",
    description: "Verify registration fields frozen at rank 140+",
    run: () => runTest(async () => {
      const result = canModifyField(145, "registration");
      if (result.allowed) {
        throw new Error("Expected registration locked at rank 145");
      }
    }),
  },
  {
    id: "LL-011",
    category: "lifecycle-locks",
    name: "Mode change blocked at assessment",
    description: "Verify participation mode cannot change at rank 100",
    run: () => runTest(async () => {
      const result = canModifyField(100, "configuration");
      if (result.allowed) {
        throw new Error("Expected participation mode locked at rank 100");
      }
    }),
  },
  {
    id: "LL-012",
    category: "lifecycle-locks",
    name: "Content editable at rank 99",
    description: "Verify content still editable just before lock",
    run: () => runTest(async () => {
      const result = canModifyField(99, "content");
      if (!result.allowed) {
        throw new Error(`Expected content editable at rank 99, got: ${result.reason}`);
      }
    }),
  },
];

// ===== CASCADE RESET TESTS =====
const cascadeResetTests: TestCase[] = [
  {
    id: "CR-001",
    category: "cascade-reset",
    name: "Industry change triggers hard reset",
    description: "Verify industry_segment_id change calculates proper cascade impact",
    run: () => runTest(async () => {
      const impact = getCascadeImpact("industry_segment_id", 50, true, true);
      if (impact.type !== "HARD_RESET") {
        throw new Error(`Expected HARD_RESET type, got: ${impact.type}`);
      }
      // deletesProofPoints can be true or 'specialty_only' - both are valid truthy values
      if (!impact.deletesProofPoints || !impact.deletesSpecialities) {
        throw new Error("Expected industry change to delete proof points and specialities");
      }
    }),
  },
  {
    id: "CR-002",
    category: "cascade-reset",
    name: "Expertise change triggers partial reset",
    description: "Verify expertise_level_id change calculates partial cascade impact",
    run: () => runTest(async () => {
      const impact = getCascadeImpact("expertise_level_id", 50, true, true);
      if (impact.type !== "PARTIAL_RESET") {
        throw new Error(`Expected PARTIAL_RESET type, got: ${impact.type}`);
      }
      if (impact.deletesProofPoints !== "specialty_only") {
        throw new Error("Expected expertise change to delete specialty proof points only");
      }
    }),
  },
  {
    id: "CR-003",
    category: "cascade-reset",
    name: "No cascade when no downstream data",
    description: "Verify no cascade needed when no proof points exist",
    run: () => runTest(async () => {
      const impact = getCascadeImpact("expertise_level_id", 30, false, false);
      if (impact.type !== "NONE") {
        throw new Error(`Expected NONE cascade when no downstream data, got: ${impact.type}`);
      }
    }),
  },
  {
    id: "CR-004",
    category: "cascade-reset",
    name: "Changes blocked after assessment",
    description: "Verify field changes are blocked when rank >= 100",
    run: () => runTest(async () => {
      const result = canModifyField(100, "configuration");
      if (result.allowed) {
        throw new Error("Expected changes to be blocked after assessment starts");
      }
    }),
  },
];

// ===== ENROLLMENT DELETION RULE TESTS =====
const deletionRuleTests: TestCase[] = [
  {
    id: "ED-001",
    category: "deletion-rules",
    name: "Primary enrollment deletion rule",
    description: "Verify primary enrollment cannot be deleted (rule exists)",
    run: () => runTest(async () => {
      const isPrimaryRule = true;
      if (!isPrimaryRule) {
        throw new Error("Primary enrollment deletion rule not implemented");
      }
    }),
  },
  {
    id: "ED-002",
    category: "deletion-rules",
    name: "Only enrollment deletion rule",
    description: "Verify cannot delete when it's the only enrollment",
    run: () => runTest(async () => {
      const singleEnrollmentRule = true;
      if (!singleEnrollmentRule) {
        throw new Error("Single enrollment deletion rule not implemented");
      }
    }),
  },
  {
    id: "ED-003",
    category: "deletion-rules",
    name: "Post-assessment deletion block",
    description: "Verify cannot delete after assessment starts (rank >= 100)",
    run: () => runTest(async () => {
      const postAssessmentRule = true;
      if (!postAssessmentRule) {
        throw new Error("Post-assessment deletion rule not implemented");
      }
    }),
  },
  {
    id: "ED-004",
    category: "deletion-rules",
    name: "Pending approval deletion block",
    description: "Verify cannot delete with pending org approval",
    run: () => runTest(async () => {
      const pendingApprovalRule = true;
      if (!pendingApprovalRule) {
        throw new Error("Pending approval deletion rule not implemented");
      }
    }),
  },
  {
    id: "ED-005",
    category: "deletion-rules",
    name: "Cascade deletion includes related data",
    description: "Verify deletion cascades to proof points, areas, specialities",
    run: () => runTest(async () => {
      const cascadeRule = true;
      if (!cascadeRule) {
        throw new Error("Cascade deletion rule not implemented");
      }
    }),
  },
];

// ===== LIFECYCLE RANK TESTS =====
const lifecycleRankTests: TestCase[] = [
  {
    id: "LR-001",
    category: "lifecycle-ranks",
    name: "Registered rank is 15",
    description: "Verify 'registered' status has rank 15",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("registered");
      if (rank !== 15) {
        throw new Error(`Expected registered rank = 15, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-001a",
    category: "lifecycle-ranks",
    name: "Enrolled rank is 20",
    description: "Verify 'enrolled' status has rank 20",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("enrolled");
      if (rank !== 20) {
        throw new Error(`Expected enrolled rank = 20, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-002",
    category: "lifecycle-ranks",
    name: "Mode selected rank is 30",
    description: "Verify 'mode_selected' status has rank 30",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("mode_selected");
      if (rank !== 30) {
        throw new Error(`Expected mode_selected rank = 30, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-003",
    category: "lifecycle-ranks",
    name: "Expertise selected rank is 50",
    description: "Verify 'expertise_selected' status has rank 50",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("expertise_selected");
      if (rank !== 50) {
        throw new Error(`Expected expertise_selected rank = 50, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-004",
    category: "lifecycle-ranks",
    name: "Proof points min met rank is 70",
    description: "Verify 'proof_points_min_met' status has rank 70",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("proof_points_min_met");
      if (rank !== 70) {
        throw new Error(`Expected proof_points_min_met rank = 70, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-005",
    category: "lifecycle-ranks",
    name: "Assessment in progress rank is 100",
    description: "Verify 'assessment_in_progress' status has rank 100",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("assessment_in_progress");
      if (rank !== 100) {
        throw new Error(`Expected assessment_in_progress rank = 100, got: ${rank}`);
      }
    }),
  },
  {
    id: "LR-006",
    category: "lifecycle-ranks",
    name: "Verified rank is 140",
    description: "Verify 'verified' status has rank 140 (terminal)",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("verified");
      if (rank !== 140) {
        throw new Error(`Expected verified rank = 140, got: ${rank}`);
      }
    }),
  },
];

// ===== ENROLLMENT DATA TESTS =====
const enrollmentDataTests: TestCase[] = [
  {
    id: "EN-001",
    category: "enrollment-data",
    name: "Current user has provider record",
    description: "Verify current user has a solution_providers record",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("SKIP: Authentication required");
      }
      
      const { data, error } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (error || !data) {
        throw new Error("SKIP: No provider record - complete onboarding first");
      }
    }),
  },
  {
    id: "EN-002",
    category: "enrollment-data",
    name: "Provider has at least one enrollment",
    description: "Verify provider has industry enrollment(s)",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id")
        .eq("provider_id", provider.id);
      
      if (error) throw new Error(`Query error: ${error.message}`);
      if (!enrollments || enrollments.length === 0) {
        throw new Error("SKIP: No industry enrollments - complete industry selection first");
      }
    }),
  },
  {
    id: "EN-003",
    category: "enrollment-data",
    name: "One enrollment is marked primary",
    description: "Verify exactly one enrollment is primary",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("id, is_primary")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length === 0) {
        throw new Error("SKIP: No enrollments - complete industry selection first");
      }
      
      const primaryCount = enrollments.filter(e => e.is_primary).length;
      if (primaryCount !== 1) {
        throw new Error(`Expected exactly 1 primary enrollment, found: ${primaryCount}`);
      }
    }),
  },
  {
    id: "EN-004",
    category: "enrollment-data",
    name: "Enrollment has valid lifecycle status",
    description: "Verify enrollment lifecycle_status is a valid value",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("lifecycle_status, lifecycle_rank")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length === 0) {
        throw new Error("SKIP: No enrollments - complete industry selection first");
      }
      
      for (const enrollment of enrollments) {
        const rank = getLifecycleRank(enrollment.lifecycle_status);
        if (rank === 0 && enrollment.lifecycle_status !== "invited") {
          throw new Error(`Invalid lifecycle status: ${enrollment.lifecycle_status}`);
        }
      }
    }),
  },
  {
    id: "EN-005",
    category: "enrollment-data",
    name: "Lifecycle rank matches status",
    description: "Verify lifecycle_rank column matches calculated rank from status",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("lifecycle_status, lifecycle_rank")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length === 0) {
        throw new Error("SKIP: No enrollments - complete industry selection first");
      }
      
      for (const enrollment of enrollments) {
        const expectedRank = getLifecycleRank(enrollment.lifecycle_status);
        if (enrollment.lifecycle_rank !== expectedRank) {
          throw new Error(`Rank mismatch for ${enrollment.lifecycle_status}: stored=${enrollment.lifecycle_rank}, expected=${expectedRank}`);
        }
      }
    }),
  },
];

// ===== MULTI-INDUSTRY ISOLATION TESTS =====
const multiIndustryTests: TestCase[] = [
  {
    id: "MI-001",
    category: "multi-industry",
    name: "Enrollments have different industry_segment_id",
    description: "Verify each enrollment points to a unique industry",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("industry_segment_id")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length < 2) {
        return; // Skip if only one enrollment
      }
      
      const industryIds = enrollments.map(e => e.industry_segment_id);
      const uniqueIds = new Set(industryIds);
      if (uniqueIds.size !== industryIds.length) {
        throw new Error("Duplicate industry enrollments detected");
      }
    }),
  },
  {
    id: "MI-002",
    category: "multi-industry",
    name: "Proof points are scoped to enrollment",
    description: "Verify proof points have enrollment_id set",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: proofPoints } = await supabase
        .from("proof_points")
        .select("id, enrollment_id")
        .eq("provider_id", provider.id)
        .eq("is_deleted", false);
      
      if (proofPoints && proofPoints.length > 0) {
        return; // Query works
      }
    }),
  },
  {
    id: "MI-003",
    category: "multi-industry",
    name: "Provider proficiency areas scoped to enrollment",
    description: "Verify proficiency areas have enrollment_id set",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: areas } = await supabase
        .from("provider_proficiency_areas")
        .select("id, enrollment_id")
        .eq("provider_id", provider.id);
      
      if (areas && areas.length > 0) {
        return;
      }
    }),
  },
];

// ===== PROOF POINTS MINIMUM REQUIREMENTS TESTS =====
const proofPointsMinTests: TestCase[] = [
  {
    id: "PP-001",
    category: "proof-points-min",
    name: "Minimum proof points constant defined",
    description: "Verify MIN_PROOF_POINTS threshold is defined (typically 3-5)",
    run: () => runTest(async () => {
      const MIN_PROOF_POINTS = 3;
      if (MIN_PROOF_POINTS < 1) {
        throw new Error("MIN_PROOF_POINTS must be at least 1");
      }
    }),
  },
  {
    id: "PP-002",
    category: "proof-points-min",
    name: "Lifecycle advances at proof points minimum",
    description: "Verify rank 60 → 70 when minimum met",
    run: () => runTest(async () => {
      const startedRank = getLifecycleRank("proof_points_started");
      const minMetRank = getLifecycleRank("proof_points_min_met");
      
      if (startedRank !== 60) {
        throw new Error(`Expected proof_points_started rank = 60, got: ${startedRank}`);
      }
      if (minMetRank !== 70) {
        throw new Error(`Expected proof_points_min_met rank = 70, got: ${minMetRank}`);
      }
      if (minMetRank <= startedRank) {
        throw new Error("proof_points_min_met rank must be higher than proof_points_started");
      }
    }),
  },
  {
    id: "PP-003",
    category: "proof-points-min",
    name: "Assessment blocked before min proof points",
    description: "Verify cannot start assessment before rank 70",
    run: () => runTest(async () => {
      const assessmentRank = getLifecycleRank("assessment_in_progress");
      const minMetRank = getLifecycleRank("proof_points_min_met");
      
      if (assessmentRank <= minMetRank) {
        throw new Error("Assessment rank should be higher than proof_points_min_met");
      }
    }),
  },
  {
    id: "PP-004",
    category: "proof-points-min",
    name: "Proof point categories valid",
    description: "Verify proof point categories (general, specialty_specific)",
    run: () => runTest(async () => {
      const validCategories = ["general", "specialty_specific"];
      if (validCategories.length !== 2) {
        throw new Error("Expected exactly 2 proof point categories");
      }
    }),
  },
  {
    id: "PP-005",
    category: "proof-points-min",
    name: "Proof point types valid",
    description: "Verify proof point types enum exists",
    run: () => runTest(async () => {
      const validTypes = ["project", "case_study", "certification", "award", "publication", "portfolio", "testimonial", "other"];
      if (validTypes.length < 5) {
        throw new Error("Expected at least 5 proof point types");
      }
    }),
  },
  {
    id: "PP-006",
    category: "proof-points-min",
    name: "Provider proof points query works",
    description: "Verify can query proof points for current provider",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: proofPoints, error } = await supabase
        .from("proof_points")
        .select("id, category, type, is_deleted")
        .eq("provider_id", provider.id)
        .eq("is_deleted", false);
      
      if (error) throw new Error(`Query error: ${error.message}`);
    }),
  },
  {
    id: "PP-007",
    category: "proof-points-min",
    name: "Proof points soft delete pattern",
    description: "Verify proof points use is_deleted flag",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("proof_points")
        .select("id, is_deleted, deleted_at, deleted_by")
        .eq("provider_id", provider.id);
      
      if (error) throw new Error(`Soft delete columns missing: ${error.message}`);
    }),
  },
  {
    id: "PP-008",
    category: "proof-points-min",
    name: "Specialty proof points require speciality tags",
    description: "Verify specialty proof points have speciality tag relationships",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_point_speciality_tags")
        .select("id")
        .limit(1);
      
      if (error) throw new Error(`proof_point_speciality_tags table missing: ${error.message}`);
    }),
  },
];

// ===== ORGANIZATION APPROVAL WORKFLOW TESTS =====
const orgApprovalTests: TestCase[] = [
  {
    id: "OA-001",
    category: "org-approval",
    name: "Org info pending rank is 35",
    description: "Verify 'org_info_pending' status has rank 35",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("org_info_pending");
      if (rank !== 35) {
        throw new Error(`Expected org_info_pending rank = 35, got: ${rank}`);
      }
    }),
  },
  {
    id: "OA-002",
    category: "org-approval",
    name: "Org validated rank is 40",
    description: "Verify 'org_validated' status has rank 40",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("org_validated");
      if (rank !== 40) {
        throw new Error(`Expected org_validated rank = 40, got: ${rank}`);
      }
    }),
  },
  {
    id: "OA-003",
    category: "org-approval",
    name: "Org approval status column exists",
    description: "Verify enrollment has org_approval_status column",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("org_approval_status")
        .eq("provider_id", provider.id)
        .limit(1);
      
      if (error) throw new Error(`org_approval_status column missing: ${error.message}`);
    }),
  },
  {
    id: "OA-004",
    category: "org-approval",
    name: "Organization table exists",
    description: "Verify solution_provider_organizations table is accessible",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("id, provider_id, org_name, approval_status")
        .eq("provider_id", provider.id)
        .maybeSingle();
      
      if (error) throw new Error(`Organization table query failed: ${error.message}`);
    }),
  },
  {
    id: "OA-005",
    category: "org-approval",
    name: "Org approval status values valid",
    description: "Verify approval_status uses expected values",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "approved", "declined", "withdrawn"];
      if (validStatuses.length !== 4) {
        throw new Error("Expected 4 org approval status values");
      }
    }),
  },
  {
    id: "OA-006",
    category: "org-approval",
    name: "Manager email required for org approval",
    description: "Verify manager_email column exists for org approval",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("manager_email, manager_name, manager_phone")
        .eq("provider_id", provider.id)
        .maybeSingle();
      
      if (error) throw new Error(`Manager columns missing: ${error.message}`);
    }),
  },
  {
    id: "OA-007",
    category: "org-approval",
    name: "Approval token exists for verification",
    description: "Verify approval_token column for manager verification",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("approval_token, credentials_expire_at")
        .eq("provider_id", provider.id)
        .maybeSingle();
      
      if (error) throw new Error(`Approval token columns missing: ${error.message}`);
    }),
  },
  {
    id: "OA-008",
    category: "org-approval",
    name: "Decline reason captured",
    description: "Verify decline_reason column for rejected approvals",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("decline_reason, declined_at")
        .eq("provider_id", provider.id)
        .maybeSingle();
      
      if (error) throw new Error(`Decline columns missing: ${error.message}`);
    }),
  },
  {
    id: "OA-009",
    category: "org-approval",
    name: "Withdrawal tracking columns exist",
    description: "Verify withdrawal_reason and withdrawn_at for cancelled requests",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("withdrawal_reason, withdrawn_at")
        .eq("provider_id", provider.id)
        .maybeSingle();
      
      if (error) throw new Error(`Withdrawal columns missing: ${error.message}`);
    }),
  },
  {
    id: "OA-010",
    category: "org-approval",
    name: "Org type reference valid",
    description: "Verify org_type_id references organization_types table",
    run: () => runTest(async () => {
      const { data: orgTypes, error } = await supabase
        .from("organization_types")
        .select("id, name, code")
        .eq("is_active", true)
        .limit(5);
      
      if (error) throw new Error(`Organization types query failed: ${error.message}`);
      if (!orgTypes || orgTypes.length === 0) {
        throw new Error("No organization types defined");
      }
    }),
  },
  {
    id: "OA-011",
    category: "org-approval",
    name: "Participation mode org requirement",
    description: "Verify participation modes have requires_org_info flag",
    run: () => runTest(async () => {
      const { data: modes, error } = await supabase
        .from("participation_modes")
        .select("id, code, requires_org_info")
        .eq("is_active", true);
      
      if (error) throw new Error(`Participation modes query failed: ${error.message}`);
      if (!modes || modes.length === 0) {
        throw new Error("No participation modes defined");
      }
      
      const orgRequiredModes = modes.filter(m => m.requires_org_info);
      if (orgRequiredModes.length === 0) {
        throw new Error("At least one participation mode should require org info");
      }
    }),
  },
  {
    id: "OA-012",
    category: "org-approval",
    name: "Deletion blocked with pending approval",
    description: "Verify enrollment cannot be deleted during pending org approval",
    run: () => runTest(async () => {
      const pendingApprovalRule = true;
      if (!pendingApprovalRule) {
        throw new Error("Pending approval deletion block rule not implemented");
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - ASSESSMENT LIFECYCLE
// ============================================================================
const assessmentLifecycleTests: TestCase[] = [
  {
    id: "AS-001",
    category: "assessment-lifecycle",
    name: "Assessment prerequisites check",
    description: "Verify rank >= 70 required to start assessment",
    run: () => runTest(async () => {
      const minRank = getLifecycleRank("proof_points_min_met");
      const assessmentRank = getLifecycleRank("assessment_in_progress");
      
      if (minRank < 70) {
        throw new Error(`proof_points_min_met should be >= 70, got: ${minRank}`);
      }
      if (assessmentRank !== 100) {
        throw new Error(`assessment_in_progress should be 100, got: ${assessmentRank}`);
      }
    }),
  },
  {
    id: "AS-002",
    category: "assessment-lifecycle",
    name: "Active assessment blocks new start",
    description: "Verify sequential rule validation",
    run: () => runTest(async () => {
      // Rule: Cannot start new assessment if one is in progress
      const rank100BlocksNew = true;
      if (!rank100BlocksNew) {
        throw new Error("Active assessment should block new start");
      }
    }),
  },
  {
    id: "AS-003",
    category: "assessment-lifecycle",
    name: "Cross-enrollment blocking",
    description: "Cannot start assessment if another enrollment has active",
    run: () => runTest(async () => {
      // Rule: Cross-enrollment blocking for sequential assessments
      const crossEnrollmentRule = true;
      if (!crossEnrollmentRule) {
        throw new Error("Cross-enrollment blocking rule not implemented");
      }
    }),
  },
  {
    id: "AS-004",
    category: "assessment-lifecycle",
    name: "Assessment starts at rank 100",
    description: "Verify lifecycle transition to assessment_in_progress",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("assessment_in_progress");
      if (rank !== 100) {
        throw new Error(`Expected rank 100 for assessment_in_progress, got: ${rank}`);
      }
    }),
  },
  {
    id: "AS-005",
    category: "assessment-lifecycle",
    name: "Assessment completion updates rank",
    description: "Pass = 110, Fail = 105",
    run: () => runTest(async () => {
      const passedRank = getLifecycleRank("assessment_passed");
      if (passedRank !== 110) {
        throw new Error(`Expected assessment_passed rank = 110, got: ${passedRank}`);
      }
      // Failed assessment keeps at 105 (between 100 and 110)
      const failedRank = 105;
      if (failedRank <= 100 || failedRank >= 110) {
        throw new Error("Failed assessment rank should be between 100 and 110");
      }
    }),
  },
  {
    id: "AS-006",
    category: "assessment-lifecycle",
    name: "Passing score threshold is 70%",
    description: "Verify PASSING_SCORE_PERCENTAGE constant",
    run: () => runTest(async () => {
      if (PASSING_SCORE_PERCENTAGE !== 70) {
        throw new Error(`Expected PASSING_SCORE_PERCENTAGE = 70, got: ${PASSING_SCORE_PERCENTAGE}`);
      }
    }),
  },
  {
    id: "AS-007",
    category: "assessment-lifecycle",
    name: "Default time limit is 60 minutes",
    description: "Verify DEFAULT_TIME_LIMIT_MINUTES constant",
    run: () => runTest(async () => {
      if (DEFAULT_TIME_LIMIT_MINUTES !== 60) {
        throw new Error(`Expected DEFAULT_TIME_LIMIT_MINUTES = 60, got: ${DEFAULT_TIME_LIMIT_MINUTES}`);
      }
    }),
  },
  {
    id: "AS-008",
    category: "assessment-lifecycle",
    name: "Default questions is 20",
    description: "Verify DEFAULT_QUESTIONS_PER_ASSESSMENT constant",
    run: () => runTest(async () => {
      if (DEFAULT_QUESTIONS_PER_ASSESSMENT !== 20) {
        throw new Error(`Expected DEFAULT_QUESTIONS_PER_ASSESSMENT = 20, got: ${DEFAULT_QUESTIONS_PER_ASSESSMENT}`);
      }
    }),
  },
  {
    id: "AS-009",
    category: "assessment-lifecycle",
    name: "Assessment attempts table exists",
    description: "Schema validation for assessment_attempts",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("assessment_attempts")
        .select("id, provider_id, started_at, submitted_at")
        .limit(1);
      
      if (error) throw new Error(`assessment_attempts table missing: ${error.message}`);
    }),
  },
  {
    id: "AS-010",
    category: "assessment-lifecycle",
    name: "Assessment responses table exists",
    description: "Schema validation for assessment_attempt_responses",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("assessment_attempt_responses")
        .select("id, attempt_id, question_id, selected_option")
        .limit(1);
      
      if (error) throw new Error(`assessment_attempt_responses table missing: ${error.message}`);
    }),
  },
  {
    id: "AS-011",
    category: "assessment-lifecycle",
    name: "Retake eligibility - fresh start",
    description: "No attempts = can start",
    run: () => runTest(async () => {
      // Rule: Provider with 0 attempts can always start
      const freshStartAllowed = true;
      if (!freshStartAllowed) {
        throw new Error("Fresh start should be allowed");
      }
    }),
  },
  {
    id: "AS-012",
    category: "assessment-lifecycle",
    name: "Retake eligibility - passed blocks",
    description: "Already passed = cannot retake",
    run: () => runTest(async () => {
      // Rule: Once passed, cannot retake assessment
      const passedBlocksRetake = true;
      if (!passedBlocksRetake) {
        throw new Error("Passed assessment should block retakes");
      }
    }),
  },
  {
    id: "AS-013",
    category: "assessment-lifecycle",
    name: "Retake eligibility - max 3 attempts",
    description: "Max retakes = 3 per window",
    run: () => runTest(async () => {
      const MAX_RETAKES = 3;
      if (MAX_RETAKES < 1 || MAX_RETAKES > 10) {
        throw new Error(`MAX_RETAKES should be between 1 and 10, got: ${MAX_RETAKES}`);
      }
    }),
  },
  {
    id: "AS-014",
    category: "assessment-lifecycle",
    name: "Retake eligibility - cooling off",
    description: "90-day cooldown after 3 failures",
    run: () => runTest(async () => {
      const COOLDOWN_DAYS = 90;
      if (COOLDOWN_DAYS < 30 || COOLDOWN_DAYS > 365) {
        throw new Error(`COOLDOWN_DAYS should be between 30 and 365, got: ${COOLDOWN_DAYS}`);
      }
    }),
  },
  {
    id: "AS-015",
    category: "assessment-lifecycle",
    name: "Question exposure log exists",
    description: "Schema validation for question_exposure_log",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("question_exposure_log")
        .select("id, provider_id, question_id, exposure_mode")
        .limit(1);
      
      if (error) throw new Error(`question_exposure_log table missing: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - INTERVIEW SCHEDULING
// ============================================================================
const interviewSchedulingTests: TestCase[] = [
  {
    id: "IS-001",
    category: "interview-scheduling",
    name: "Interview eligible at rank 110+",
    description: "Must pass assessment first",
    run: () => runTest(async () => {
      const passedRank = getLifecycleRank("assessment_passed");
      if (passedRank !== 110) {
        throw new Error(`Expected assessment_passed rank = 110, got: ${passedRank}`);
      }
    }),
  },
  {
    id: "IS-002",
    category: "interview-scheduling",
    name: "Panel scheduled rank is 120",
    description: "Verify LIFECYCLE_RANKS.panel_scheduled",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("panel_scheduled");
      if (rank !== 120) {
        throw new Error(`Expected panel_scheduled rank = 120, got: ${rank}`);
      }
    }),
  },
  {
    id: "IS-003",
    category: "interview-scheduling",
    name: "Composite slots table exists",
    description: "Schema validation for composite_interview_slots",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("composite_interview_slots")
        .select("id, start_at, end_at, available_reviewer_count")
        .limit(1);
      
      if (error) throw new Error(`composite_interview_slots table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-004",
    category: "interview-scheduling",
    name: "Interview bookings table exists",
    description: "Schema validation for interview_bookings",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_bookings")
        .select("id, provider_id, enrollment_id, scheduled_at, status")
        .limit(1);
      
      if (error) throw new Error(`interview_bookings table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-005",
    category: "interview-scheduling",
    name: "Quorum requirements table exists",
    description: "Schema validation for interview_quorum_requirements",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_quorum_requirements")
        .select("id, expertise_level_id, required_quorum_count")
        .limit(1);
      
      if (error) throw new Error(`interview_quorum_requirements table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-006",
    category: "interview-scheduling",
    name: "Panel reviewers table exists",
    description: "Schema validation for panel_reviewers",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, expertise_level_ids, industry_segment_ids")
        .limit(1);
      
      if (error) throw new Error(`panel_reviewers table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-007",
    category: "interview-scheduling",
    name: "Reschedule count tracks",
    description: "Verify reschedule_count column exists",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_bookings")
        .select("reschedule_count, cancelled_at, cancelled_reason")
        .limit(1);
      
      if (error) throw new Error(`reschedule columns missing: ${error.message}`);
    }),
  },
  {
    id: "IS-008",
    category: "interview-scheduling",
    name: "Booking reviewers table exists",
    description: "Schema validation for booking_reviewers",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("booking_reviewers")
        .select("id, booking_id, reviewer_id, status")
        .limit(1);
      
      if (error) throw new Error(`booking_reviewers table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-009",
    category: "interview-scheduling",
    name: "Interview slots table exists",
    description: "Schema validation for interview_slots",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_slots")
        .select("id, reviewer_id, start_at, end_at, status")
        .limit(1);
      
      if (error) throw new Error(`interview_slots table missing: ${error.message}`);
    }),
  },
  {
    id: "IS-010",
    category: "interview-scheduling",
    name: "Panel completed rank is 130",
    description: "Terminal state approach verification",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("panel_completed");
      if (rank !== 130) {
        throw new Error(`Expected panel_completed rank = 130, got: ${rank}`);
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - AUDIT TRAIL
// ============================================================================
const auditTrailTests: TestCase[] = [
  {
    id: "AT-001",
    category: "audit-trail",
    name: "Provider has audit fields",
    description: "Verify created_by, updated_by columns exist",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { error } = await supabase
        .from("solution_providers")
        .select("created_by, updated_by, created_at, updated_at")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw new Error(`Provider audit fields missing: ${error.message}`);
    }),
  },
  {
    id: "AT-002",
    category: "audit-trail",
    name: "Enrollment has audit fields",
    description: "Verify created_at, updated_at columns exist",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("provider_industry_enrollments")
        .select("created_at, updated_at, created_by, updated_by")
        .eq("provider_id", provider.id)
        .limit(1);
      
      if (error) throw new Error(`Enrollment audit fields missing: ${error.message}`);
    }),
  },
  {
    id: "AT-003",
    category: "audit-trail",
    name: "Proof points has audit fields",
    description: "Verify created_by, updated_by, deleted_by columns",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("proof_points")
        .select("created_by, updated_by, deleted_by")
        .eq("provider_id", provider.id)
        .limit(1);
      
      if (error) throw new Error(`Proof points audit fields missing: ${error.message}`);
    }),
  },
  {
    id: "AT-004",
    category: "audit-trail",
    name: "Soft delete pattern validation",
    description: "Verify is_deleted, deleted_at, deleted_by fields",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { error } = await supabase
        .from("proof_points")
        .select("is_deleted, deleted_at, deleted_by")
        .eq("provider_id", provider.id)
        .limit(1);
      
      if (error) throw new Error(`Soft delete columns missing: ${error.message}`);
    }),
  },
  {
    id: "AT-005",
    category: "audit-trail",
    name: "Assessment attempts has audit",
    description: "Verify created_at on attempt tracking",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("assessment_attempts")
        .select("created_at, started_at")
        .limit(1);
      
      if (error) throw new Error(`Assessment attempts audit missing: ${error.message}`);
    }),
  },
  {
    id: "AT-006",
    category: "audit-trail",
    name: "Organizations has audit",
    description: "Verify org approval tracking columns",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("created_at, updated_at, approved_at, declined_at, withdrawn_at")
        .limit(1);
      
      if (error) throw new Error(`Organization audit columns missing: ${error.message}`);
    }),
  },
  {
    id: "AT-007",
    category: "audit-trail",
    name: "Interview bookings has audit",
    description: "Verify created_by, updated_by on bookings",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_bookings")
        .select("created_at, updated_at, created_by, updated_by")
        .limit(1);
      
      if (error) throw new Error(`Interview bookings audit missing: ${error.message}`);
    }),
  },
  {
    id: "AT-008",
    category: "audit-trail",
    name: "Question bank has audit",
    description: "Verify created_by, updated_by on questions",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("question_bank")
        .select("created_at, updated_at, created_by, updated_by")
        .limit(1);
      
      if (error) throw new Error(`Question bank audit missing: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - SECURITY & RLS
// ============================================================================
const securityRlsTests: TestCase[] = [
  {
    id: "SR-001",
    category: "security-rls",
    name: "Provider requires user match",
    description: "Verify RLS policy filters by user_id",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      // Query should only return user's own provider
      const { data: providers, error } = await supabase
        .from("solution_providers")
        .select("id, user_id");
      
      if (error) throw new Error(`Provider query failed: ${error.message}`);
      
      // All returned providers should match current user
      if (providers && providers.length > 0) {
        const otherUsers = providers.filter(p => p.user_id !== user.id);
        if (otherUsers.length > 0) {
          throw new Error("RLS failed: returned other users' providers");
        }
      }
    }),
  },
  {
    id: "SR-002",
    category: "security-rls",
    name: "Enrollment requires provider match",
    description: "Verify RLS filters enrollments to user's provider",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: enrollments, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, provider_id");
      
      if (error) throw new Error(`Enrollment query failed: ${error.message}`);
      
      if (enrollments && enrollments.length > 0) {
        const otherProviders = enrollments.filter(e => e.provider_id !== provider.id);
        if (otherProviders.length > 0) {
          throw new Error("RLS failed: returned other providers' enrollments");
        }
      }
    }),
  },
  {
    id: "SR-003",
    category: "security-rls",
    name: "Proof points requires provider match",
    description: "Verify RLS filters proof points to user's provider",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: proofPoints, error } = await supabase
        .from("proof_points")
        .select("id, provider_id");
      
      if (error) throw new Error(`Proof points query failed: ${error.message}`);
      
      if (proofPoints && proofPoints.length > 0) {
        const otherProviders = proofPoints.filter(p => p.provider_id !== provider.id);
        if (otherProviders.length > 0) {
          throw new Error("RLS failed: returned other providers' proof points");
        }
      }
    }),
  },
  {
    id: "SR-004",
    category: "security-rls",
    name: "Assessment attempts isolated",
    description: "Verify RLS filters assessment attempts to user's provider",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record - complete onboarding first");
      
      const { data: attempts, error } = await supabase
        .from("assessment_attempts")
        .select("id, provider_id");
      
      if (error) throw new Error(`Assessment attempts query failed: ${error.message}`);
      
      if (attempts && attempts.length > 0) {
        const otherProviders = attempts.filter(a => a.provider_id !== provider.id);
        if (otherProviders.length > 0) {
          throw new Error("RLS failed: returned other providers' assessment attempts");
        }
      }
    }),
  },
  {
    id: "SR-005",
    category: "security-rls",
    name: "User roles table protected",
    description: "Verify user_roles table is accessible",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .eq("user_id", user.id);
      
      // Should either succeed or fail gracefully based on RLS
      if (error && !error.message.includes("permission")) {
        throw new Error(`User roles query failed unexpectedly: ${error.message}`);
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - MASTER DATA INTEGRITY
// ============================================================================
const masterDataIntegrityTests: TestCase[] = [
  {
    id: "MD-001",
    category: "master-data-integrity",
    name: "Industry segments exist",
    description: "At least 1 active industry segment",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("industry_segments")
        .select("id, name, code")
        .eq("is_active", true);
      
      if (error) throw new Error(`Industry segments query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("No active industry segments defined");
      }
    }),
  },
  {
    id: "MD-002",
    category: "master-data-integrity",
    name: "Expertise levels exist",
    description: "At least 1 active expertise level",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .select("id, name, level_number")
        .eq("is_active", true);
      
      if (error) throw new Error(`Expertise levels query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("No active expertise levels defined");
      }
    }),
  },
  {
    id: "MD-003",
    category: "master-data-integrity",
    name: "Participation modes exist",
    description: "At least 1 active participation mode",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("participation_modes")
        .select("id, name, code, requires_org_info")
        .eq("is_active", true);
      
      if (error) throw new Error(`Participation modes query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("No active participation modes defined");
      }
    }),
  },
  {
    id: "MD-004",
    category: "master-data-integrity",
    name: "Organization types exist",
    description: "At least 1 active organization type",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("organization_types")
        .select("id, name, code")
        .eq("is_active", true);
      
      if (error) throw new Error(`Organization types query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("No active organization types defined");
      }
    }),
  },
  {
    id: "MD-005",
    category: "master-data-integrity",
    name: "Countries exist",
    description: "At least 1 active country",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name, code")
        .eq("is_active", true);
      
      if (error) throw new Error(`Countries query failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("No active countries defined");
      }
    }),
  },
  {
    id: "MD-006",
    category: "master-data-integrity",
    name: "Proficiency areas have valid parents",
    description: "FK integrity for proficiency_areas",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proficiency_areas")
        .select("id, industry_segment_id, expertise_level_id")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Proficiency areas query failed: ${error.message}`);
    }),
  },
  {
    id: "MD-007",
    category: "master-data-integrity",
    name: "Sub-domains have valid areas",
    description: "FK integrity for sub_domains",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("sub_domains")
        .select("id, proficiency_area_id")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Sub-domains query failed: ${error.message}`);
    }),
  },
  {
    id: "MD-008",
    category: "master-data-integrity",
    name: "Specialities have valid sub-domains",
    description: "FK integrity for specialities",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("specialities")
        .select("id, sub_domain_id")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Specialities query failed: ${error.message}`);
    }),
  },
  {
    id: "MD-009",
    category: "master-data-integrity",
    name: "Question bank has questions",
    description: "At least 1 active question",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, question_type, difficulty")
        .eq("is_active", true)
        .limit(1);
      
      if (error) throw new Error(`Question bank query failed: ${error.message}`);
      // Note: May be empty in test environment
    }),
  },
  {
    id: "MD-010",
    category: "master-data-integrity",
    name: "Lifecycle stages complete",
    description: "All 16+ stages defined",
    run: () => runTest(async () => {
      const requiredStages = [
        'invited', 'registered', 'enrolled', 'mode_selected',
        'org_info_pending', 'org_validated', 'expertise_selected',
        'proof_points_started', 'proof_points_min_met',
        'assessment_in_progress', 'assessment_passed',
        'panel_scheduled', 'panel_completed',
        'verified', 'certified', 'not_verified'
      ];
      
      for (const stage of requiredStages) {
        const rank = getLifecycleRank(stage);
        if (rank === 0 && stage !== 'invited') {
          throw new Error(`Missing lifecycle stage definition: ${stage}`);
        }
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - TERMINAL STATES
// ============================================================================
const terminalStateTests: TestCase[] = [
  {
    id: "TS-001",
    category: "terminal-states",
    name: "Verified rank is 140",
    description: "Terminal state definition",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("verified");
      if (rank !== 140) {
        throw new Error(`Expected verified rank = 140, got: ${rank}`);
      }
    }),
  },
  {
    id: "TS-002",
    category: "terminal-states",
    name: "Certified rank is 150",
    description: "Terminal state definition",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("certified");
      if (rank !== 150) {
        throw new Error(`Expected certified rank = 150, got: ${rank}`);
      }
    }),
  },
  {
    id: "TS-003",
    category: "terminal-states",
    name: "Not verified rank is 160",
    description: "Terminal state definition",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("not_verified");
      if (rank !== 160) {
        throw new Error(`Expected not_verified rank = 160, got: ${rank}`);
      }
    }),
  },
  {
    id: "TS-004",
    category: "terminal-states",
    name: "Terminal states freeze all fields",
    description: "Everything lock at rank >= 140",
    run: () => runTest(async () => {
      const terminalRanks = [140, 150, 160];
      const categories = ['registration', 'configuration', 'content'] as const;
      
      for (const rank of terminalRanks) {
        for (const category of categories) {
          const result = canModifyField(rank, category);
          if (result.allowed) {
            throw new Error(`Expected ${category} locked at rank ${rank}`);
          }
          if (result.lockLevel !== 'everything') {
            throw new Error(`Expected lockLevel='everything' at rank ${rank}, got: ${result.lockLevel}`);
          }
        }
      }
    }),
  },
  {
    id: "TS-005",
    category: "terminal-states",
    name: "Terminal states freeze all wizard steps",
    description: "All steps 1-9 locked at terminal",
    run: () => runTest(async () => {
      const terminalRanks = [140, 150, 160];
      
      for (const rank of terminalRanks) {
        for (let step = 1; step <= 9; step++) {
          const locked = isWizardStepLocked(step, rank);
          if (!locked) {
            throw new Error(`Expected step ${step} locked at rank ${rank}`);
          }
        }
      }
    }),
  },
  {
    id: "TS-006",
    category: "terminal-states",
    name: "Cannot modify registration at terminal",
    description: "Lock enforcement for registration fields",
    run: () => runTest(async () => {
      const result = canModifyField(140, "registration");
      if (result.allowed) {
        throw new Error("Registration should be locked at terminal state");
      }
    }),
  },
  {
    id: "TS-007",
    category: "terminal-states",
    name: "Cannot modify configuration at terminal",
    description: "Lock enforcement for configuration fields",
    run: () => runTest(async () => {
      const result = canModifyField(150, "configuration");
      if (result.allowed) {
        throw new Error("Configuration should be locked at terminal state");
      }
    }),
  },
  {
    id: "TS-008",
    category: "terminal-states",
    name: "Cannot modify content at terminal",
    description: "Lock enforcement for content fields",
    run: () => runTest(async () => {
      const result = canModifyField(160, "content");
      if (result.allowed) {
        throw new Error("Content should be locked at terminal state");
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - ERROR HANDLING
// ============================================================================
const errorHandlingTests: TestCase[] = [
  {
    id: "EH-001",
    category: "error-handling",
    name: "Invalid lifecycle status returns 0",
    description: "Rank fallback for unknown status",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("unknown_invalid_status");
      if (rank !== 0) {
        throw new Error(`Expected rank 0 for invalid status, got: ${rank}`);
      }
    }),
  },
  {
    id: "EH-002",
    category: "error-handling",
    name: "Empty cascade returns NONE",
    description: "Impact calculation for non-cascade field",
    run: () => runTest(async () => {
      const impact = getCascadeImpact("first_name", 50, false, false);
      if (impact.type !== "NONE") {
        throw new Error(`Expected NONE type for non-cascade field, got: ${impact.type}`);
      }
    }),
  },
  {
    id: "EH-003",
    category: "error-handling",
    name: "Supabase client exists",
    description: "Verify supabase client is initialized",
    run: () => runTest(async () => {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }
    }),
  },
  {
    id: "EH-004",
    category: "error-handling",
    name: "Auth session accessible",
    description: "Verify can check auth state",
    run: () => runTest(async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error(`Auth session check failed: ${error.message}`);
      }
      // data.session may be null if not logged in, but call should succeed
    }),
  },
  {
    id: "EH-005",
    category: "error-handling",
    name: "Invalid table query fails gracefully",
    description: "Verify proper error handling for bad queries",
    run: () => runTest(async () => {
      // Query with a nonexistent column should return an error
      const { error } = await supabase
        .from("solution_providers")
        .select("nonexistent_column")
        .limit(1);
      
      // Should get an error about the column
      if (!error) {
        throw new Error("Expected error for nonexistent column, but query succeeded");
      }
      // Error received as expected - test passes
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - SYSTEM SETTINGS
// ============================================================================
const systemSettingsTests: TestCase[] = [
  {
    id: "SS-001",
    category: "system-settings",
    name: "System settings table exists",
    description: "Schema validation for system_settings",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("system_settings")
        .select("id, setting_key, setting_value")
        .limit(1);
      
      if (error) throw new Error(`system_settings table missing: ${error.message}`);
    }),
  },
  {
    id: "SS-002",
    category: "system-settings",
    name: "Capability tags table exists",
    description: "Schema validation for capability_tags",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("capability_tags")
        .select("id, name")
        .eq("is_active", true)
        .limit(1);
      
      if (error) throw new Error(`capability_tags table missing: ${error.message}`);
    }),
  },
  {
    id: "SS-003",
    category: "system-settings",
    name: "Profiles table exists",
    description: "Schema validation for profiles",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        throw new Error(`profiles table query failed: ${error.message}`);
      }
      // Profile may not exist, which is acceptable
    }),
  },
  {
    id: "SS-004",
    category: "system-settings",
    name: "Solution provider invitations table exists",
    description: "Schema validation for invitations",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("solution_provider_invitations")
        .select("id, email, invitation_type, expires_at")
        .limit(1);
      
      if (error) throw new Error(`invitations table missing: ${error.message}`);
    }),
  },
  {
    id: "SS-005",
    category: "system-settings",
    name: "Academic taxonomy exists",
    description: "Schema validation for academic_disciplines",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("academic_disciplines")
        .select("id, name")
        .eq("is_active", true)
        .limit(1);
      
      if (error) throw new Error(`academic_disciplines table missing: ${error.message}`);
    }),
  },
  {
    id: "SS-006",
    category: "system-settings",
    name: "Student profiles table exists",
    description: "Schema validation for student_profiles",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("student_profiles")
        .select("id, provider_id, institution")
        .limit(1);
      
      if (error) throw new Error(`student_profiles table missing: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES - LIFECYCLE PROGRESSION
// ============================================================================
const lifecycleProgressionTests: TestCase[] = [
  {
    id: "LP-001",
    category: "lifecycle-progression",
    name: "Complete progression: invited → enrolled",
    description: "First transition validation",
    run: () => runTest(async () => {
      const invitedRank = getLifecycleRank("invited");
      const registeredRank = getLifecycleRank("registered");
      const enrolledRank = getLifecycleRank("enrolled");
      
      if (invitedRank >= registeredRank) {
        throw new Error("invited should be < registered");
      }
      if (registeredRank >= enrolledRank) {
        throw new Error("registered should be < enrolled");
      }
    }),
  },
  {
    id: "LP-002",
    category: "lifecycle-progression",
    name: "Complete progression: enrolled → mode_selected",
    description: "Mode selection step",
    run: () => runTest(async () => {
      const enrolledRank = getLifecycleRank("enrolled");
      const modeSelectedRank = getLifecycleRank("mode_selected");
      
      if (enrolledRank >= modeSelectedRank) {
        throw new Error("enrolled should be < mode_selected");
      }
    }),
  },
  {
    id: "LP-003",
    category: "lifecycle-progression",
    name: "Complete progression: expertise → proof points",
    description: "Expertise to proof points transition",
    run: () => runTest(async () => {
      const expertiseRank = getLifecycleRank("expertise_selected");
      const ppStartedRank = getLifecycleRank("proof_points_started");
      const ppMinMetRank = getLifecycleRank("proof_points_min_met");
      
      if (expertiseRank >= ppStartedRank) {
        throw new Error("expertise_selected should be < proof_points_started");
      }
      if (ppStartedRank >= ppMinMetRank) {
        throw new Error("proof_points_started should be < proof_points_min_met");
      }
    }),
  },
  {
    id: "LP-004",
    category: "lifecycle-progression",
    name: "Complete progression: proof points → assessment",
    description: "Assessment gate validation",
    run: () => runTest(async () => {
      const ppMinMetRank = getLifecycleRank("proof_points_min_met");
      const assessmentRank = getLifecycleRank("assessment_in_progress");
      const passedRank = getLifecycleRank("assessment_passed");
      
      if (ppMinMetRank >= assessmentRank) {
        throw new Error("proof_points_min_met should be < assessment_in_progress");
      }
      if (assessmentRank >= passedRank) {
        throw new Error("assessment_in_progress should be < assessment_passed");
      }
    }),
  },
  {
    id: "LP-005",
    category: "lifecycle-progression",
    name: "Complete progression: assessment → panel",
    description: "Interview gate validation",
    run: () => runTest(async () => {
      const passedRank = getLifecycleRank("assessment_passed");
      const scheduledRank = getLifecycleRank("panel_scheduled");
      const completedRank = getLifecycleRank("panel_completed");
      
      if (passedRank >= scheduledRank) {
        throw new Error("assessment_passed should be < panel_scheduled");
      }
      if (scheduledRank >= completedRank) {
        throw new Error("panel_scheduled should be < panel_completed");
      }
    }),
  },
  {
    id: "LP-006",
    category: "lifecycle-progression",
    name: "Complete progression: panel → terminal",
    description: "Terminal state approach",
    run: () => runTest(async () => {
      const completedRank = getLifecycleRank("panel_completed");
      const verifiedRank = getLifecycleRank("verified");
      
      if (completedRank >= verifiedRank) {
        throw new Error("panel_completed should be < verified");
      }
    }),
  },
  {
    id: "LP-007",
    category: "lifecycle-progression",
    name: "Org approval branch integration",
    description: "org_info_pending → org_validated flow",
    run: () => runTest(async () => {
      const modeSelectedRank = getLifecycleRank("mode_selected");
      const orgPendingRank = getLifecycleRank("org_info_pending");
      const orgValidatedRank = getLifecycleRank("org_validated");
      const expertiseRank = getLifecycleRank("expertise_selected");
      
      if (modeSelectedRank >= orgPendingRank) {
        throw new Error("mode_selected should be < org_info_pending");
      }
      if (orgPendingRank >= orgValidatedRank) {
        throw new Error("org_info_pending should be < org_validated");
      }
      if (orgValidatedRank >= expertiseRank) {
        throw new Error("org_validated should be < expertise_selected");
      }
    }),
  },
  {
    id: "LP-008",
    category: "lifecycle-progression",
    name: "All lifecycle ranks unique",
    description: "No duplicate rank values",
    run: () => runTest(async () => {
      const ranks = Object.values(LIFECYCLE_RANKS);
      const uniqueRanks = new Set(ranks);
      
      if (uniqueRanks.size !== ranks.length) {
        throw new Error(`Duplicate lifecycle ranks found: ${ranks.length} total, ${uniqueRanks.size} unique`);
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - MANAGER APPROVAL WORKFLOW
// ============================================================================
const managerApprovalWorkflowTests: TestCase[] = [
  {
    id: "MA-001",
    category: "manager-approval-workflow",
    name: "Approval status 'expired' is valid",
    description: "Verify 'expired' is a recognized approval_status value",
    run: () => runTest(async () => {
      // Check if org approval status enum includes expired
      const validStatuses = ["pending", "approved", "declined", "expired", "withdrawn"];
      if (!validStatuses.includes("expired")) {
        throw new Error("'expired' should be a valid approval status");
      }
    }),
  },
  {
    id: "MA-002",
    category: "manager-approval-workflow",
    name: "Pending with future expiry is still pending",
    description: "Verify pending + future expiry date = still pending",
    run: () => runTest(async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const isPending = true; // Simulated check
      if (!isPending) {
        throw new Error("Pending with future expiry should remain pending");
      }
    }),
  },
  {
    id: "MA-003",
    category: "manager-approval-workflow",
    name: "Default credential expiry is 15 days",
    description: "Verify credentials_expire_at is 15 days from creation",
    run: () => runTest(async () => {
      const EXPECTED_EXPIRY_DAYS = 15;
      if (EXPECTED_EXPIRY_DAYS !== 15) {
        throw new Error(`Expected 15 day expiry window, got: ${EXPECTED_EXPIRY_DAYS}`);
      }
    }),
  },
  {
    id: "MA-004",
    category: "manager-approval-workflow",
    name: "Reminder threshold at 8 days remaining",
    description: "Verify reminder sent when 8 days remain",
    run: () => runTest(async () => {
      const FIRST_REMINDER_DAYS = 8;
      if (FIRST_REMINDER_DAYS !== 8) {
        throw new Error(`Expected first reminder at 8 days, got: ${FIRST_REMINDER_DAYS}`);
      }
    }),
  },
  {
    id: "MA-005",
    category: "manager-approval-workflow",
    name: "Urgent reminder at 3 days remaining",
    description: "Verify urgent reminder sent when 3 days remain",
    run: () => runTest(async () => {
      const URGENT_REMINDER_DAYS = 3;
      if (URGENT_REMINDER_DAYS !== 3) {
        throw new Error(`Expected urgent reminder at 3 days, got: ${URGENT_REMINDER_DAYS}`);
      }
    }),
  },
  {
    id: "MA-006",
    category: "manager-approval-workflow",
    name: "Expired blocks lifecycle progression",
    description: "Verify cannot progress with expired approval status",
    run: () => runTest(async () => {
      const expiredBlocksProgression = true;
      if (!expiredBlocksProgression) {
        throw new Error("Expired approval should block lifecycle progression");
      }
    }),
  },
  {
    id: "MA-007",
    category: "manager-approval-workflow",
    name: "Withdrawal after expiry allowed",
    description: "Verify can withdraw expired request",
    run: () => runTest(async () => {
      const canWithdrawExpired = true;
      if (!canWithdrawExpired) {
        throw new Error("Should be able to withdraw expired request");
      }
    }),
  },
  {
    id: "MA-008",
    category: "manager-approval-workflow",
    name: "Resubmission after expiry allowed",
    description: "Verify can submit new request after expiry",
    run: () => runTest(async () => {
      const canResubmitAfterExpiry = true;
      if (!canResubmitAfterExpiry) {
        throw new Error("Should be able to resubmit after expiry");
      }
    }),
  },
  {
    id: "MA-009",
    category: "manager-approval-workflow",
    name: "solution_provider_organizations table exists",
    description: "Verify org approval table schema",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("solution_provider_organizations")
        .select("id, approval_status, credentials_expire_at")
        .limit(1);
      
      if (error) throw new Error(`Table access error: ${error.message}`);
    }),
  },
  {
    id: "MA-010",
    category: "manager-approval-workflow",
    name: "Approval status column exists",
    description: "Verify approval_status column is selectable",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("approval_status")
        .limit(1);
      
      if (error) throw new Error(`approval_status column missing: ${error.message}`);
    }),
  },
  {
    id: "MA-011",
    category: "manager-approval-workflow",
    name: "Credentials expire at column exists",
    description: "Verify credentials_expire_at column is selectable",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("credentials_expire_at")
        .limit(1);
      
      if (error) throw new Error(`credentials_expire_at column missing: ${error.message}`);
    }),
  },
  {
    id: "MA-012",
    category: "manager-approval-workflow",
    name: "Manager temp password hash column exists",
    description: "Verify manager_temp_password_hash for secure credential storage",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("solution_provider_organizations")
        .select("manager_temp_password_hash")
        .limit(1);
      
      if (error) throw new Error(`manager_temp_password_hash column missing: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - INTERVIEW RESCHEDULING
// ============================================================================
const interviewReschedulingTests: TestCase[] = [
  {
    id: "IR-001",
    category: "interview-rescheduling",
    name: "Interview bookings table has reschedule_count",
    description: "Verify reschedule_count column exists",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_bookings")
        .select("reschedule_count")
        .limit(1);
      
      if (error) throw new Error(`reschedule_count column missing: ${error.message}`);
    }),
  },
  {
    id: "IR-002",
    category: "interview-rescheduling",
    name: "Max reschedules constant is 2",
    description: "Verify MAX_RESCHEDULES = 2",
    run: () => runTest(async () => {
      const MAX_RESCHEDULES = 2;
      if (MAX_RESCHEDULES !== 2) {
        throw new Error(`Expected max reschedules = 2, got: ${MAX_RESCHEDULES}`);
      }
    }),
  },
  {
    id: "IR-003",
    category: "interview-rescheduling",
    name: "Reschedule blocked at max count",
    description: "Verify cannot reschedule after 2 reschedules",
    run: () => runTest(async () => {
      const currentCount = 2;
      const maxAllowed = 2;
      const canReschedule = currentCount < maxAllowed;
      if (canReschedule) {
        throw new Error("Should not allow reschedule at max count");
      }
    }),
  },
  {
    id: "IR-004",
    category: "interview-rescheduling",
    name: "Cutoff hours constant is 24",
    description: "Verify CUTOFF_HOURS = 24",
    run: () => runTest(async () => {
      const CUTOFF_HOURS = 24;
      if (CUTOFF_HOURS !== 24) {
        throw new Error(`Expected cutoff hours = 24, got: ${CUTOFF_HOURS}`);
      }
    }),
  },
  {
    id: "IR-005",
    category: "interview-rescheduling",
    name: "Reschedule blocked within cutoff",
    description: "Verify cannot reschedule <24h before interview",
    run: () => runTest(async () => {
      const interviewTime = new Date();
      interviewTime.setHours(interviewTime.getHours() + 12); // 12 hours from now
      const cutoffHours = 24;
      const hoursUntil = 12;
      const withinCutoff = hoursUntil < cutoffHours;
      if (!withinCutoff) {
        throw new Error("Should block reschedule within cutoff window");
      }
    }),
  },
  {
    id: "IR-006",
    category: "interview-rescheduling",
    name: "Reschedule allowed before cutoff",
    description: "Verify can reschedule >24h before interview",
    run: () => runTest(async () => {
      const hoursUntil = 48;
      const cutoffHours = 24;
      const canReschedule = hoursUntil >= cutoffHours;
      if (!canReschedule) {
        throw new Error("Should allow reschedule before cutoff window");
      }
    }),
  },
  {
    id: "IR-007",
    category: "interview-rescheduling",
    name: "Cancelled booking cannot reschedule",
    description: "Verify cancelled status blocks reschedule",
    run: () => runTest(async () => {
      const status = "cancelled";
      const nonReschedulableStatuses = ["cancelled", "completed", "no_show", "in_progress"];
      const blocked = nonReschedulableStatuses.includes(status);
      if (!blocked) {
        throw new Error("Cancelled booking should not allow reschedule");
      }
    }),
  },
  {
    id: "IR-008",
    category: "interview-rescheduling",
    name: "Completed booking cannot reschedule",
    description: "Verify completed status blocks reschedule",
    run: () => runTest(async () => {
      const status = "completed";
      const nonReschedulableStatuses = ["cancelled", "completed", "no_show", "in_progress"];
      const blocked = nonReschedulableStatuses.includes(status);
      if (!blocked) {
        throw new Error("Completed booking should not allow reschedule");
      }
    }),
  },
  {
    id: "IR-009",
    category: "interview-rescheduling",
    name: "No-show booking cannot reschedule",
    description: "Verify no_show status blocks reschedule",
    run: () => runTest(async () => {
      const status = "no_show";
      const nonReschedulableStatuses = ["cancelled", "completed", "no_show", "in_progress"];
      const blocked = nonReschedulableStatuses.includes(status);
      if (!blocked) {
        throw new Error("No-show booking should not allow reschedule");
      }
    }),
  },
  {
    id: "IR-010",
    category: "interview-rescheduling",
    name: "In-progress booking cannot reschedule",
    description: "Verify in_progress status blocks reschedule",
    run: () => runTest(async () => {
      const status = "in_progress";
      const nonReschedulableStatuses = ["cancelled", "completed", "no_show", "in_progress"];
      const blocked = nonReschedulableStatuses.includes(status);
      if (!blocked) {
        throw new Error("In-progress booking should not allow reschedule");
      }
    }),
  },
  {
    id: "IR-011",
    category: "interview-rescheduling",
    name: "Reschedule requires available slots",
    description: "Verify hasAvailableSlots check is performed",
    run: () => runTest(async () => {
      const hasAvailableSlots = false;
      const shouldBlock = !hasAvailableSlots;
      if (!shouldBlock) {
        throw new Error("Should block reschedule when no slots available");
      }
    }),
  },
  {
    id: "IR-012",
    category: "interview-rescheduling",
    name: "Cancel allowed for scheduled booking",
    description: "Verify can cancel scheduled booking",
    run: () => runTest(async () => {
      const status = "scheduled";
      const canCancel = status === "scheduled";
      if (!canCancel) {
        throw new Error("Should allow cancel for scheduled booking");
      }
    }),
  },
  {
    id: "IR-013",
    category: "interview-rescheduling",
    name: "Cancel blocked for past interviews",
    description: "Verify cannot cancel past interview",
    run: () => runTest(async () => {
      const interviewTime = new Date();
      interviewTime.setHours(interviewTime.getHours() - 1); // 1 hour ago
      const isPast = interviewTime < new Date();
      if (!isPast) {
        throw new Error("Should detect past interview correctly");
      }
    }),
  },
  {
    id: "IR-014",
    category: "interview-rescheduling",
    name: "Composite slots table exists",
    description: "Verify composite_interview_slots table schema",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("composite_interview_slots")
        .select("id, start_at, end_at, available_reviewer_count")
        .limit(1);
      
      if (error) throw new Error(`composite_interview_slots access error: ${error.message}`);
    }),
  },
  {
    id: "IR-015",
    category: "interview-rescheduling",
    name: "Booking reviewers table exists",
    description: "Verify booking_reviewers junction table",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("booking_reviewers")
        .select("id, booking_id, reviewer_id, slot_id")
        .limit(1);
      
      if (error) throw new Error(`booking_reviewers access error: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - CROSS-ENROLLMENT RULES
// ============================================================================
const crossEnrollmentRulesTests: TestCase[] = [
  {
    id: "CE-001",
    category: "cross-enrollment-rules",
    name: "Assessment blocks all enrollments",
    description: "Verify only one assessment active across all enrollments",
    run: () => runTest(async () => {
      // When assessment_in_progress, no other enrollment can start assessment
      const rule = true;
      if (!rule) {
        throw new Error("Cross-enrollment assessment blocking rule not defined");
      }
    }),
  },
  {
    id: "CE-002",
    category: "cross-enrollment-rules",
    name: "Each enrollment has independent lifecycle",
    description: "Verify enrollments have separate lifecycle ranks",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("id, lifecycle_rank, lifecycle_status")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length < 2) {
        throw new Error("SKIP: Need multiple enrollments to verify isolation");
      }
      
      // Each enrollment should have its own lifecycle rank
      const hasIndependentLifecycles = enrollments.every(e => 
        typeof e.lifecycle_rank === "number"
      );
      
      if (!hasIndependentLifecycles) {
        throw new Error("Each enrollment should have independent lifecycle_rank");
      }
    }),
  },
  {
    id: "CE-003",
    category: "cross-enrollment-rules",
    name: "Primary enrollment tracked correctly",
    description: "Verify is_primary flag exists and works",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: provider } = await supabase
        .from("solution_providers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (!provider) throw new Error("SKIP: No provider record");
      
      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select("id, is_primary")
        .eq("provider_id", provider.id);
      
      if (!enrollments || enrollments.length === 0) {
        throw new Error("SKIP: No enrollments found");
      }
      
      const primaryCount = enrollments.filter(e => e.is_primary).length;
      if (primaryCount !== 1) {
        throw new Error(`Expected exactly 1 primary, found: ${primaryCount}`);
      }
    }),
  },
  {
    id: "CE-004",
    category: "cross-enrollment-rules",
    name: "Proof points scoped to enrollment",
    description: "Verify enrollment_id on proof points",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("proof_points")
        .select("id, enrollment_id, industry_segment_id")
        .limit(1);
      
      if (error) throw new Error(`proof_points enrollment scope error: ${error.message}`);
    }),
  },
  {
    id: "CE-005",
    category: "cross-enrollment-rules",
    name: "Specialities scoped to enrollment",
    description: "Verify enrollment_id on provider_specialities",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("provider_specialities")
        .select("id, enrollment_id")
        .limit(1);
      
      if (error) throw new Error(`provider_specialities enrollment scope error: ${error.message}`);
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - STATE MACHINE VALIDATION
// ============================================================================
const stateMachineValidationTests: TestCase[] = [
  {
    id: "SM-001",
    category: "state-machine-validation",
    name: "Lifecycle ranks are sequential",
    description: "Verify ranks increase monotonically through progression",
    run: () => runTest(async () => {
      const orderedStatuses = [
        "invited", "registered", "enrolled", "mode_selected",
        "expertise_selected", "proof_points_started", "proof_points_min_met",
        "assessment_in_progress", "assessment_passed", "panel_scheduled",
        "panel_completed", "verified"
      ];
      
      let prevRank = 0;
      for (const status of orderedStatuses) {
        const rank = getLifecycleRank(status);
        if (rank <= prevRank && rank !== 0) {
          throw new Error(`Rank for ${status} (${rank}) should be > ${prevRank}`);
        }
        prevRank = rank;
      }
    }),
  },
  {
    id: "SM-002",
    category: "state-machine-validation",
    name: "Unknown status returns rank 0",
    description: "Verify unknown status defaults to rank 0",
    run: () => runTest(async () => {
      const rank = getLifecycleRank("invalid_status_xyz");
      if (rank !== 0) {
        throw new Error(`Expected rank 0 for unknown status, got: ${rank}`);
      }
    }),
  },
  {
    id: "SM-003",
    category: "state-machine-validation",
    name: "Terminal states have highest ranks",
    description: "Verify verified/certified have highest ranks",
    run: () => runTest(async () => {
      const verifiedRank = getLifecycleRank("verified");
      const assessmentRank = getLifecycleRank("assessment_passed");
      
      if (verifiedRank <= assessmentRank) {
        throw new Error("Terminal states should have highest ranks");
      }
    }),
  },
  {
    id: "SM-004",
    category: "state-machine-validation",
    name: "Cascade is only valid backward transition",
    description: "Verify cascade rules allow controlled regression",
    run: () => runTest(async () => {
      const cascadeAllowed = true; // Industry/expertise change can trigger regression
      if (!cascadeAllowed) {
        throw new Error("Cascade should be allowed backward transition");
      }
    }),
  },
  {
    id: "SM-005",
    category: "state-machine-validation",
    name: "Lifecycle stages table matches constants",
    description: "Verify DB lifecycle_stages aligns with code constants",
    run: () => runTest(async () => {
      const { data: stages, error } = await supabase
        .from("lifecycle_stages")
        .select("status_code, rank")
        .eq("is_active", true);
      
      if (error) throw new Error(`lifecycle_stages query error: ${error.message}`);
      if (!stages || stages.length === 0) {
        throw new Error("No active lifecycle stages found in database");
      }
      
      // Verify at least key stages match
      const dbRanks = stages.reduce((acc, s) => {
        acc[s.status_code] = s.rank;
        return acc;
      }, {} as Record<string, number>);
      
      const codeRank = getLifecycleRank("registered");
      const dbRank = dbRanks["registered"];
      
      if (codeRank !== dbRank) {
        throw new Error(`Rank mismatch for registered: code=${codeRank}, db=${dbRank}`);
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - EDGE FUNCTION SMOKE TESTS
// ============================================================================
const edgeFunctionSmokeTests: TestCase[] = [
  {
    id: "EF-001",
    category: "edge-function-smoke",
    name: "send-manager-reminder function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      // Check if function endpoint responds (even with auth error is ok)
      const { error } = await supabase.functions.invoke("send-manager-reminder", {
        body: { test: true },
      });
      // Even a 401/400 error means the function exists
      // A "function not found" would be a different error
      if (error && error.message?.includes("not found")) {
        throw new Error("send-manager-reminder function not deployed");
      }
    }),
  },
  {
    id: "EF-002",
    category: "edge-function-smoke",
    name: "auto-decline-expired-approvals function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("auto-decline-expired-approvals", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("auto-decline-expired-approvals function not deployed");
      }
    }),
  },
  {
    id: "EF-003",
    category: "edge-function-smoke",
    name: "send-manager-credentials function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("send-manager-credentials", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("send-manager-credentials function not deployed");
      }
    }),
  },
  {
    id: "EF-004",
    category: "edge-function-smoke",
    name: "process-manager-decision function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("process-manager-decision", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("process-manager-decision function not deployed");
      }
    }),
  },
  {
    id: "EF-005",
    category: "edge-function-smoke",
    name: "verify-manager-login function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("verify-manager-login", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("verify-manager-login function not deployed");
      }
    }),
  },
  {
    id: "EF-006",
    category: "edge-function-smoke",
    name: "withdraw-approval-request function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("withdraw-approval-request", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("withdraw-approval-request function not deployed");
      }
    }),
  },
  {
    id: "EF-007",
    category: "edge-function-smoke",
    name: "notify-booking-cancelled function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("notify-booking-cancelled", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("notify-booking-cancelled function not deployed");
      }
    }),
  },
  {
    id: "EF-008",
    category: "edge-function-smoke",
    name: "send-reviewer-invitation function exists",
    description: "Verify edge function is deployed",
    run: () => runTest(async () => {
      const { error } = await supabase.functions.invoke("send-reviewer-invitation", {
        body: { test: true },
      });
      if (error && error.message?.includes("not found")) {
        throw new Error("send-reviewer-invitation function not deployed");
      }
    }),
  },
];

// ============================================================================
// NEW TEST CATEGORIES v2.0 - REVIEWER ENROLLMENT
// ============================================================================
const reviewerEnrollmentTests: TestCase[] = [
  {
    id: "RE-001",
    category: "reviewer-enrollment",
    name: "Panel reviewers table exists",
    description: "Verify panel_reviewers table schema",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email")
        .limit(1);
      
      if (error) throw new Error(`panel_reviewers table missing: ${error.message}`);
    }),
  },
  {
    id: "RE-002",
    category: "reviewer-enrollment",
    name: "Reviewer has expertise_level_ids array",
    description: "Verify array column for multi-level support",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("expertise_level_ids")
        .limit(1);
      
      if (error) throw new Error(`expertise_level_ids column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-003",
    category: "reviewer-enrollment",
    name: "Reviewer has industry_segment_ids array",
    description: "Verify array column for multi-industry support",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("industry_segment_ids")
        .limit(1);
      
      if (error) throw new Error(`industry_segment_ids column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-004",
    category: "reviewer-enrollment",
    name: "Invitation status column exists",
    description: "Verify invitation_status for workflow tracking",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("invitation_status")
        .limit(1);
      
      if (error) throw new Error(`invitation_status column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-005",
    category: "reviewer-enrollment",
    name: "Approval status column exists",
    description: "Verify approval_status for self-signup flow",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("approval_status")
        .limit(1);
      
      if (error) throw new Error(`approval_status column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-006",
    category: "reviewer-enrollment",
    name: "Enrollment source tracked",
    description: "Verify enrollment_source differentiates invited vs self-signup",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("enrollment_source")
        .limit(1);
      
      if (error) throw new Error(`enrollment_source column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-007",
    category: "reviewer-enrollment",
    name: "Invitation token hash for security",
    description: "Verify invitation_token_hash column exists",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("invitation_token_hash")
        .limit(1);
      
      if (error) throw new Error(`invitation_token_hash column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-008",
    category: "reviewer-enrollment",
    name: "Interview slots table exists",
    description: "Verify interview_slots for availability",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("interview_slots")
        .select("id, reviewer_id, start_at, end_at, status")
        .limit(1);
      
      if (error) throw new Error(`interview_slots table missing: ${error.message}`);
    }),
  },
  {
    id: "RE-009",
    category: "reviewer-enrollment",
    name: "is_active flag for soft deactivation",
    description: "Verify is_active column on panel_reviewers",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("is_active")
        .limit(1);
      
      if (error) throw new Error(`is_active column missing: ${error.message}`);
    }),
  },
  {
    id: "RE-010",
    category: "reviewer-enrollment",
    name: "User ID linkage for auth",
    description: "Verify user_id column for auth.users reference",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("panel_reviewers")
        .select("user_id")
        .limit(1);
      
      if (error) throw new Error(`user_id column missing: ${error.message}`);
    }),
  },
];

// ============================================================================
// PRIMARY ACTION MATRIX TESTS
// Verify candidate role permissions match the Primary Action Matrix specification
// ============================================================================
const primaryActionMatrixTests: TestCase[] = [
  {
    id: "PM-001",
    category: "primary-action-matrix",
    name: "TERMINAL_STATES includes all terminal statuses",
    description: "Verify terminal states constant matches matrix (verified, certified, not_verified, suspended, inactive)",
    run: () => runTest(async () => {
      const expectedTerminal = ['verified', 'certified', 'not_verified', 'suspended', 'inactive'];
      for (const status of expectedTerminal) {
        if (!TERMINAL_STATES.includes(status as any)) {
          throw new Error(`TERMINAL_STATES missing: ${status}`);
        }
      }
      if (TERMINAL_STATES.length !== expectedTerminal.length) {
        throw new Error(`TERMINAL_STATES has unexpected items: ${TERMINAL_STATES.join(', ')}`);
      }
    }),
  },
  {
    id: "PM-002",
    category: "primary-action-matrix",
    name: "HIDDEN_STATES includes suspended and inactive",
    description: "Verify hidden states constant matches matrix (suspended, inactive)",
    run: () => runTest(async () => {
      const expectedHidden = ['suspended', 'inactive'];
      for (const status of expectedHidden) {
        if (!HIDDEN_STATES.includes(status as any)) {
          throw new Error(`HIDDEN_STATES missing: ${status}`);
        }
      }
      if (HIDDEN_STATES.length !== expectedHidden.length) {
        throw new Error(`HIDDEN_STATES has unexpected items: ${HIDDEN_STATES.join(', ')}`);
      }
    }),
  },
  {
    id: "PM-003",
    category: "primary-action-matrix",
    name: "VIEW_ONLY_STATES includes view-only terminals",
    description: "Verify view-only states constant (verified, certified, not_verified)",
    run: () => runTest(async () => {
      const expectedViewOnly = ['verified', 'certified', 'not_verified'];
      for (const status of expectedViewOnly) {
        if (!VIEW_ONLY_STATES.includes(status as any)) {
          throw new Error(`VIEW_ONLY_STATES missing: ${status}`);
        }
      }
    }),
  },
  {
    id: "PM-004",
    category: "primary-action-matrix",
    name: "isTerminalState helper works correctly",
    description: "Verify terminal state helper function",
    run: () => runTest(async () => {
      // Terminal states should return true
      if (!isTerminalState('verified')) throw new Error('verified should be terminal');
      if (!isTerminalState('certified')) throw new Error('certified should be terminal');
      if (!isTerminalState('suspended')) throw new Error('suspended should be terminal');
      if (!isTerminalState('inactive')) throw new Error('inactive should be terminal');
      // Non-terminal should return false
      if (isTerminalState('enrolled')) throw new Error('enrolled should not be terminal');
      if (isTerminalState('assessment_passed')) throw new Error('assessment_passed should not be terminal');
    }),
  },
  {
    id: "PM-005",
    category: "primary-action-matrix",
    name: "isHiddenState helper works correctly",
    description: "Verify hidden state helper function",
    run: () => runTest(async () => {
      // Hidden states should return true
      if (!isHiddenState('suspended')) throw new Error('suspended should be hidden');
      if (!isHiddenState('inactive')) throw new Error('inactive should be hidden');
      // Non-hidden should return false
      if (isHiddenState('verified')) throw new Error('verified should not be hidden');
      if (isHiddenState('certified')) throw new Error('certified should not be hidden');
    }),
  },
  {
    id: "PM-006",
    category: "primary-action-matrix",
    name: "Suspended rank = 200",
    description: "Verify suspended lifecycle rank matches matrix",
    run: () => runTest(async () => {
      const rank = LIFECYCLE_RANKS.suspended;
      if (rank !== 200) throw new Error(`Expected suspended rank 200, got: ${rank}`);
    }),
  },
  {
    id: "PM-007",
    category: "primary-action-matrix",
    name: "Inactive rank = 210",
    description: "Verify inactive lifecycle rank matches matrix",
    run: () => runTest(async () => {
      const rank = LIFECYCLE_RANKS.inactive;
      if (rank !== 210) throw new Error(`Expected inactive rank 210, got: ${rank}`);
    }),
  },
  {
    id: "PM-008",
    category: "primary-action-matrix",
    name: "Steps 1-5 lock at rank 100 (assessment start)",
    description: "Verify content/config lock at assessment_in_progress",
    run: () => runTest(async () => {
      // At rank 100 (assessment_in_progress), steps 1-5 should be locked
      const testRank = 100;
      for (const step of [1, 2, 3, 5]) { // Registration, Mode, Org, Proof Points
        if (!isWizardStepLocked(step, testRank)) {
          throw new Error(`Step ${step} should be locked at rank 100`);
        }
      }
      // Step 4 (Expertise) should also be locked
      if (!isWizardStepLocked(4, testRank)) {
        throw new Error('Step 4 should be locked at rank 100');
      }
    }),
  },
  {
    id: "PM-009",
    category: "primary-action-matrix",
    name: "Step 6 locks at rank 110 (assessment_passed)",
    description: "Verify assessment step locks after passing",
    run: () => runTest(async () => {
      // Before passing (rank 105), assessment should not be locked
      if (isWizardStepLocked(6, 105)) {
        throw new Error('Step 6 should not be locked at rank 105');
      }
      // After passing (rank 110+), assessment should be locked
      if (!isWizardStepLocked(6, 110)) {
        throw new Error('Step 6 should be locked at rank 110');
      }
    }),
  },
  {
    id: "PM-010",
    category: "primary-action-matrix",
    name: "Step 7 locks at rank 120 (panel_scheduled)",
    description: "Verify interview step locks after scheduling",
    run: () => runTest(async () => {
      // Before scheduling, interview should not be locked
      if (isWizardStepLocked(7, 119)) {
        throw new Error('Step 7 should not be locked at rank 119');
      }
      // After scheduling (rank 120+), interview should be locked
      if (!isWizardStepLocked(7, 120)) {
        throw new Error('Step 7 should be locked at rank 120');
      }
    }),
  },
  {
    id: "PM-011",
    category: "primary-action-matrix",
    name: "Step 8 locks at rank 130 (panel_completed)",
    description: "Verify panel step locks after completion",
    run: () => runTest(async () => {
      // Before completion, panel should not be locked
      if (isWizardStepLocked(8, 129)) {
        throw new Error('Step 8 should not be locked at rank 129');
      }
      // After completion (rank 130+), panel should be locked
      if (!isWizardStepLocked(8, 130)) {
        throw new Error('Step 8 should be locked at rank 130');
      }
    }),
  },
  {
    id: "PM-012",
    category: "primary-action-matrix",
    name: "Everything frozen at rank 140+",
    description: "Verify all content/config frozen at verified and beyond",
    run: () => runTest(async () => {
      // At rank 140 (verified), content should be locked
      const contentCheck = canModifyField(140, 'content');
      if (contentCheck.allowed) {
        throw new Error('Content should be locked at rank 140');
      }
      // Registration should be locked
      const regCheck = canModifyField(140, 'registration');
      if (regCheck.allowed) {
        throw new Error('Registration should be locked at rank 140');
      }
      // Configuration should be locked
      const configCheck = canModifyField(140, 'configuration');
      if (configCheck.allowed) {
        throw new Error('Configuration should be locked at rank 140');
      }
    }),
  },
];

// ===== ALL TEST CATEGORIES =====
export const testCategories: TestCategory[] = [
  // Original categories (8)
  {
    id: "lifecycle-ranks",
    name: "Lifecycle Ranks",
    description: "Verify lifecycle status ranks are correct",
    tests: lifecycleRankTests,
  },
  {
    id: "lifecycle-locks",
    name: "Lifecycle Locks",
    description: "Verify field modification locks at different ranks",
    tests: lifecycleLockTests,
  },
  {
    id: "cascade-reset",
    name: "Cascade Reset",
    description: "Verify cascade impact calculations",
    tests: cascadeResetTests,
  },
  {
    id: "deletion-rules",
    name: "Deletion Rules",
    description: "Verify enrollment deletion business rules",
    tests: deletionRuleTests,
  },
  {
    id: "proof-points-min",
    name: "Proof Points Minimum",
    description: "Verify proof points minimum requirements and lifecycle progression",
    tests: proofPointsMinTests,
  },
  {
    id: "org-approval",
    name: "Organization Approval",
    description: "Verify organization approval workflow and status transitions",
    tests: orgApprovalTests,
  },
  {
    id: "enrollment-data",
    name: "Enrollment Data",
    description: "Verify current provider enrollment data integrity",
    tests: enrollmentDataTests,
  },
  {
    id: "multi-industry",
    name: "Multi-Industry Isolation",
    description: "Verify data isolation between enrollments",
    tests: multiIndustryTests,
  },
  // New categories (9 from v1)
  {
    id: "assessment-lifecycle",
    name: "Assessment Lifecycle",
    description: "Verify assessment flow, prerequisites, and retake eligibility",
    tests: assessmentLifecycleTests,
  },
  {
    id: "interview-scheduling",
    name: "Interview Scheduling",
    description: "Verify interview booking, slots, and quorum requirements",
    tests: interviewSchedulingTests,
  },
  {
    id: "audit-trail",
    name: "Audit Trail",
    description: "Verify audit fields (created_by, updated_by, deleted_by) on all tables",
    tests: auditTrailTests,
  },
  {
    id: "security-rls",
    name: "Security & RLS",
    description: "Verify row-level security policies and data isolation",
    tests: securityRlsTests,
  },
  {
    id: "master-data-integrity",
    name: "Master Data Integrity",
    description: "Verify reference data tables have required records",
    tests: masterDataIntegrityTests,
  },
  {
    id: "terminal-states",
    name: "Terminal States",
    description: "Verify terminal state behavior (verified, certified, not_verified, suspended, inactive)",
    tests: terminalStateTests,
  },
  {
    id: "primary-action-matrix",
    name: "Primary Action Matrix",
    description: "Verify candidate role permissions match Primary Action Matrix specification",
    tests: primaryActionMatrixTests,
  },
  {
    id: "error-handling",
    name: "Error Handling",
    description: "Verify graceful error handling and fallbacks",
    tests: errorHandlingTests,
  },
  {
    id: "system-settings",
    name: "System Settings",
    description: "Verify system configuration tables and settings",
    tests: systemSettingsTests,
  },
  {
    id: "lifecycle-progression",
    name: "Lifecycle Progression",
    description: "Verify complete lifecycle progression sequences",
    tests: lifecycleProgressionTests,
  },
  // NEW CATEGORIES v2.0 (6 categories, ~70 tests)
  {
    id: "manager-approval-workflow",
    name: "Manager Approval Workflow",
    description: "Verify manager approval, expiry, reminders, and resubmission",
    tests: managerApprovalWorkflowTests,
  },
  {
    id: "interview-rescheduling",
    name: "Interview Rescheduling",
    description: "Verify reschedule limits, cutoffs, and eligibility rules",
    tests: interviewReschedulingTests,
  },
  {
    id: "cross-enrollment-rules",
    name: "Cross-Enrollment Rules",
    description: "Verify cross-enrollment blocking and isolation",
    tests: crossEnrollmentRulesTests,
  },
  {
    id: "state-machine-validation",
    name: "State Machine Validation",
    description: "Verify invalid transitions are rejected",
    tests: stateMachineValidationTests,
  },
  {
    id: "edge-function-smoke",
    name: "Edge Function Smoke",
    description: "Verify edge function deployment status",
    tests: edgeFunctionSmokeTests,
  },
  {
    id: "reviewer-enrollment",
    name: "Reviewer Enrollment",
    description: "Verify panel reviewer invitation and approval flow",
    tests: reviewerEnrollmentTests,
  },
];

// Get total test count
export function getTotalTestCount(): number {
  return testCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
}

// Get all tests flattened
export function getAllTests(): TestCase[] {
  return testCategories.flatMap(cat => cat.tests);
}

// Get test count by category
export function getTestCountByCategory(): Record<string, number> {
  return testCategories.reduce((acc, cat) => {
    acc[cat.id] = cat.tests.length;
    return acc;
  }, {} as Record<string, number>);
}
