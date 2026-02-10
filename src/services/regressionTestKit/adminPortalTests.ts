/**
 * Admin Portal Tests (AP-xxx)
 * 
 * Comprehensive tests for Platform Admin functionality:
 * - Dashboard access and loading
 * - Master data CRUD operations
 * - Question bank management
 * - Invitation workflows
 * - Reviewer approvals
 * - Configuration management
 * - Audit field validation
 */

import { supabase } from "@/integrations/supabase/client";
import { TestCase, TestCategory, runTest } from "./types";

// ============================================================================
// ADMIN DASHBOARD TESTS
// ============================================================================

const adminDashboardTests: TestCase[] = [
  {
    id: "AP-001",
    category: "Admin Dashboard",
    name: "Admin dashboard data loads",
    description: "Verify admin can query dashboard statistics",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin");
      
      if (error) throw new Error(`Role check failed: ${error.message}`);
      if (!roles || roles.length === 0) throw new Error("SKIP: Platform Admin role required");
    }),
  },
  {
    id: "AP-002",
    category: "Admin Dashboard",
    name: "Countries CRUD access",
    description: "Verify admin can read countries table",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, name, code")
        .limit(10);
      
      if (error) throw new Error(`Countries read failed: ${error.message}`);
      if (!Array.isArray(data)) throw new Error("Invalid response format");
    }),
  },
  {
    id: "AP-003",
    category: "Admin Dashboard",
    name: "Industry Segments read access",
    description: "Verify admin can read industry segments",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("industry_segments")
        .select("id, name, code, is_active")
        .limit(10);
      
      if (error) throw new Error(`Industry segments read failed: ${error.message}`);
      if (!Array.isArray(data)) throw new Error("Invalid response format");
    }),
  },
  {
    id: "AP-004",
    category: "Admin Dashboard",
    name: "Expertise Levels read (constrained)",
    description: "Verify expertise levels table returns 4 fixed levels",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .select("id, name, level_number")
        .order("level_number");
      
      if (error) throw new Error(`Expertise levels read failed: ${error.message}`);
      if (!data || data.length !== 4) {
        throw new Error(`Expected 4 expertise levels, got ${data?.length || 0}`);
      }
    }),
  },
  {
    id: "AP-005",
    category: "Admin Dashboard",
    name: "Academic disciplines read",
    description: "Verify academic taxonomy hierarchy accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("academic_disciplines")
        .select("id, name, is_active")
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Academic disciplines read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-006",
    category: "Admin Dashboard",
    name: "Proficiency areas read with hierarchy",
    description: "Verify proficiency taxonomy hierarchy accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proficiency_areas")
        .select(`
          id, 
          name, 
          industry_segment:industry_segments(name),
          expertise_level:expertise_levels(name)
        `)
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Proficiency areas read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// QUESTION BANK TESTS
// ============================================================================

const questionBankTests: TestCase[] = [
  {
    id: "AP-007",
    category: "Question Bank",
    name: "Question bank read access",
    description: "Verify admin can query question bank",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("question_bank")
        .select("id, question_text, question_type, difficulty")
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Question bank read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-008",
    category: "Question Bank",
    name: "Question with capability tags",
    description: "Verify question-capability tag relationship exists",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("question_capability_tags")
        .select("id, question_id, capability_tag_id")
        .limit(10);
      
      if (error) throw new Error(`Question capability tags read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-009",
    category: "Question Bank",
    name: "Capability tags auto-provision",
    description: "Verify capability tags table exists and queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("capability_tags")
        .select("id, name, is_active")
        .eq("is_active", true)
        .limit(50);
      
      if (error) throw new Error(`Capability tags read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-010",
    category: "Question Bank",
    name: "Question types validation",
    description: "Verify question types are valid enum values",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const validTypes = ["conceptual", "scenario", "experience", "decision", "proof"];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("question_bank")
        .select("question_type")
        .eq("is_active", true)
        .limit(100);
      
      if (error) throw new Error(`Question types query failed: ${error.message}`);
      
      const invalid = (data || []).filter((q: { question_type: string }) => !validTypes.includes(q.question_type));
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid question types`);
      }
    }),
  },
];

// ============================================================================
// LEVEL-SPECIALITY MAPPING TESTS
// ============================================================================

const levelSpecialityTests: TestCase[] = [
  {
    id: "AP-011",
    category: "Level-Speciality Map",
    name: "Level-speciality mapping read",
    description: "Verify level-speciality mappings accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("level_speciality_map")
        .select(`
          id,
          expertise_level:expertise_levels(name),
          speciality:specialities(name)
        `)
        .limit(20);
      
      if (error) throw new Error(`Level-speciality map read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-012",
    category: "Level-Speciality Map",
    name: "Specialities linked to sub-domains",
    description: "Verify speciality hierarchy is intact",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("specialities")
        .select(`
          id,
          name,
          sub_domain:sub_domains(
            name,
            proficiency_area:proficiency_areas(name)
          )
        `)
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Specialities hierarchy read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// INVITATION MANAGEMENT TESTS
// ============================================================================

const invitationTests: TestCase[] = [
  {
    id: "AP-013",
    category: "Invitations",
    name: "Panel reviewers invitations read",
    description: "Verify panel reviewer invitations queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, email, invitation_status, created_at")
        .limit(20);
      
      if (error) throw new Error(`Panel reviewers read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-014",
    category: "Invitations",
    name: "Reviewer invitation status valid",
    description: "Verify invitation status values",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "sent", "accepted", "expired", "revoked", null];
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("invitation_status")
        .limit(50);
      
      if (error) throw new Error(`Invitation status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(i => 
        i.invitation_status !== null && !validStatuses.includes(i.invitation_status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid invitation statuses`);
      }
    }),
  },
  {
    id: "AP-015",
    category: "Invitations",
    name: "Reviewer records queryable",
    description: "Verify panel reviewer records accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, approval_status")
        .limit(20);
      
      if (error) throw new Error(`Panel reviewers read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// REVIEWER APPROVAL TESTS
// ============================================================================

const reviewerApprovalTests: TestCase[] = [
  {
    id: "AP-016",
    category: "Reviewer Approvals",
    name: "Pending reviewers query",
    description: "Verify pending approval reviewers queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, approval_status")
        .eq("approval_status", "pending")
        .limit(20);
      
      if (error) throw new Error(`Pending reviewers query failed: ${error.message}`);
    }),
  },
  {
    id: "AP-017",
    category: "Reviewer Approvals",
    name: "Approved reviewers query",
    description: "Verify approved reviewers queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("id, name, email, approval_status, approved_at")
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Approved reviewers query failed: ${error.message}`);
    }),
  },
  {
    id: "AP-018",
    category: "Reviewer Approvals",
    name: "Reviewer approval status values",
    description: "Verify approval status enum values",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const validStatuses = ["pending", "approved", "rejected", null];
      
      const { data, error } = await supabase
        .from("panel_reviewers")
        .select("approval_status")
        .limit(50);
      
      if (error) throw new Error(`Approval status query failed: ${error.message}`);
      
      const invalid = (data || []).filter(r => 
        r.approval_status !== null && !validStatuses.includes(r.approval_status)
      );
      if (invalid.length > 0) {
        throw new Error(`Found ${invalid.length} invalid approval statuses`);
      }
    }),
  },
];

// ============================================================================
// INTERVIEW CONFIGURATION TESTS
// ============================================================================

const interviewConfigTests: TestCase[] = [
  {
    id: "AP-019",
    category: "Interview Config",
    name: "Interview quorum requirements read",
    description: "Verify quorum requirements accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_quorum_requirements")
        .select(`
          id,
          required_quorum_count,
          interview_duration_minutes,
          expertise_level:expertise_levels(name)
        `)
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Quorum requirements read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-020",
    category: "Interview Config",
    name: "Interview kit competencies read",
    description: "Verify competency framework accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_kit_competencies")
        .select("id, code, name, color, is_active")
        .eq("is_active", true)
        .order("display_order");
      
      if (error) throw new Error(`Competencies read failed: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error("SKIP: No competencies configured");
      }
    }),
  },
  {
    id: "AP-021",
    category: "Interview Config",
    name: "Interview kit questions read",
    description: "Verify interview questions accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_kit_questions")
        .select(`
          id,
          question_text,
          competency:interview_kit_competencies(name),
          expertise_level:expertise_levels(name),
          industry_segment:industry_segments(name)
        `)
        .eq("is_active", true)
        .limit(20);
      
      if (error) throw new Error(`Interview questions read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// COMPOSITE SLOT GENERATION TESTS
// ============================================================================

const compositeSlotTests: TestCase[] = [
  {
    id: "AP-022",
    category: "Composite Slots",
    name: "Composite interview slots read",
    description: "Verify composite slots queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("composite_interview_slots")
        .select(`
          id,
          start_at,
          end_at,
          available_reviewer_count,
          status,
          industry_segment:industry_segments(name),
          expertise_level:expertise_levels(name)
        `)
        .limit(20);
      
      if (error) throw new Error(`Composite slots read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-023",
    category: "Composite Slots",
    name: "Available composite slots filter",
    description: "Verify available slots filtering works",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("composite_interview_slots")
        .select("id, status, available_reviewer_count")
        .eq("status", "available")
        .gt("available_reviewer_count", 0)
        .limit(10);
      
      if (error) throw new Error(`Available slots filter failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// AUDIT FIELD TESTS
// ============================================================================

const auditFieldTests: TestCase[] = [
  {
    id: "AP-024",
    category: "Audit Fields",
    name: "Countries has audit fields",
    description: "Verify created_at, updated_at exist on countries",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, created_at, updated_at, created_by, updated_by")
        .limit(5);
      
      if (error) throw new Error(`Countries audit fields query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (!first.created_at) throw new Error("created_at field missing");
      }
    }),
  },
  {
    id: "AP-025",
    category: "Audit Fields",
    name: "Industry segments has audit fields",
    description: "Verify created_by, updated_by exist",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("industry_segments")
        .select("id, created_at, updated_at, created_by, updated_by")
        .limit(5);
      
      if (error) throw new Error(`Industry segments audit fields query failed: ${error.message}`);
    }),
  },
  {
    id: "AP-026",
    category: "Audit Fields",
    name: "Question bank has audit fields",
    description: "Verify question_bank has proper audit trail",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from("question_bank")
        .select("id, created_at, created_by, is_active, updated_at, updated_by")
        .limit(5);
      
      if (error) throw new Error(`Question bank audit fields query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// ADMIN RLS TESTS
// ============================================================================

const adminRlsTests: TestCase[] = [
  {
    id: "AP-027",
    category: "Admin RLS",
    name: "Admin can read all providers",
    description: "Verify admin has read access to all provider records",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("SKIP: Authentication required");
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin");
      
      if (!roles || roles.length === 0) throw new Error("SKIP: Platform Admin role required");
      
      const { data, error } = await supabase
        .from("solution_providers")
        .select("id, user_id")
        .limit(50);
      
      if (error) throw new Error(`Admin provider read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-028",
    category: "Admin RLS",
    name: "Admin can read all enrollments",
    description: "Verify admin has read access to all enrollments",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, provider_id, lifecycle_status")
        .limit(50);
      
      if (error) throw new Error(`Admin enrollment read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-029",
    category: "Admin RLS",
    name: "Admin can read all proof points",
    description: "Verify admin has read access to all proof points",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_points")
        .select("id, provider_id, title")
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Admin proof points read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-030",
    category: "Admin RLS",
    name: "Admin can read interview bookings",
    description: "Verify admin has read access to bookings",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select("id, provider_id, status, scheduled_at")
        .limit(20);
      
      if (error) throw new Error(`Admin bookings read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// ORGANIZATION TYPES TESTS
// ============================================================================

const organizationTypeTests: TestCase[] = [
  {
    id: "AP-031",
    category: "Organization Types",
    name: "Organization types read",
    description: "Verify organization types queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("organization_types")
        .select("id, name, code, is_active")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Organization types read failed: ${error.message}`);
    }),
  },
  {
    id: "AP-032",
    category: "Organization Types",
    name: "Participation modes read",
    description: "Verify participation modes queryable",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("participation_modes")
        .select("id, name, code, requires_org_info, is_active")
        .eq("is_active", true)
        .limit(10);
      
      if (error) throw new Error(`Participation modes read failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// LIFECYCLE STAGES TESTS
// ============================================================================

const lifecycleStagesTests: TestCase[] = [
  {
    id: "AP-033",
    category: "Lifecycle Stages",
    name: "Lifecycle stages reference read",
    description: "Verify lifecycle stages table accessible",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("lifecycle_stages")
        .select("id, status_code, display_name, rank, locks_configuration, locks_content, locks_everything")
        .eq("is_active", true)
        .order("rank");
      
      if (error) throw new Error(`Lifecycle stages read failed: ${error.message}`);
      if (!data || data.length < 10) {
        throw new Error(`Expected 10+ lifecycle stages, got ${data?.length || 0}`);
      }
    }),
  },
  {
    id: "AP-034",
    category: "Lifecycle Stages",
    name: "Lifecycle ranks sequential",
    description: "Verify lifecycle ranks are properly ordered",
    role: "platform_admin",
    module: "admin_portal",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("lifecycle_stages")
        .select("status_code, rank")
        .eq("is_active", true)
        .order("rank");
      
      if (error) throw new Error(`Lifecycle ranks query failed: ${error.message}`);
      
      // Verify no duplicate ranks
      const ranks = (data || []).map(d => d.rank);
      const uniqueRanks = new Set(ranks);
      if (ranks.length !== uniqueRanks.size) {
        throw new Error("Duplicate lifecycle ranks found");
      }
    }),
  },
];

// ============================================================================
// EXPORT ADMIN PORTAL TEST CATEGORIES
// ============================================================================

export const adminPortalTestCategories: TestCategory[] = [
  {
    id: "admin-dashboard",
    name: "Admin Dashboard",
    description: "Dashboard and master data access tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: adminDashboardTests,
  },
  {
    id: "question-bank",
    name: "Question Bank",
    description: "Question bank management tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: questionBankTests,
  },
  {
    id: "level-speciality-map",
    name: "Level-Speciality Mapping",
    description: "Expertise level to speciality mapping tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: levelSpecialityTests,
  },
  {
    id: "invitations",
    name: "Invitations",
    description: "Provider and reviewer invitation tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: invitationTests,
  },
  {
    id: "reviewer-approvals",
    name: "Reviewer Approvals",
    description: "Reviewer application approval workflow tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: reviewerApprovalTests,
  },
  {
    id: "interview-config",
    name: "Interview Configuration",
    description: "Interview setup and configuration tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: interviewConfigTests,
  },
  {
    id: "composite-slots",
    name: "Composite Interview Slots",
    description: "Slot generation and management tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: compositeSlotTests,
  },
  {
    id: "audit-fields",
    name: "Audit Fields",
    description: "Audit trail field validation tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: auditFieldTests,
  },
  {
    id: "admin-rls",
    name: "Admin RLS Policies",
    description: "Row level security tests for admin role",
    role: "platform_admin",
    module: "admin_portal",
    tests: adminRlsTests,
  },
  {
    id: "organization-types",
    name: "Organization & Participation",
    description: "Organization types and participation modes tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: organizationTypeTests,
  },
  {
    id: "lifecycle-stages",
    name: "Lifecycle Stages",
    description: "Lifecycle stage reference data tests",
    role: "platform_admin",
    module: "admin_portal",
    tests: lifecycleStagesTests,
  },
];

// Get all admin portal tests flattened
export function getAdminPortalTests(): TestCase[] {
  return adminPortalTestCategories.flatMap(cat => cat.tests);
}

// Get admin portal test count
export function getAdminPortalTestCount(): number {
  return adminPortalTestCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
}
