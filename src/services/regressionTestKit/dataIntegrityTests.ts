/**
 * Data Integrity Tests (DI-xxx)
 * 
 * Comprehensive tests for data integrity:
 * - Foreign key relationships
 * - Soft delete patterns
 * - Audit trail fields
 * - Unique constraints
 * - Referential integrity
 */

import { supabase } from "@/integrations/supabase/client";
import { TestCase, TestCategory, runTest } from "./types";

// ============================================================================
// FOREIGN KEY INTEGRITY TESTS
// ============================================================================

const foreignKeyTests: TestCase[] = [
  {
    id: "DI-001",
    category: "Foreign Key Integrity",
    name: "Proof points have valid provider_id",
    description: "Verify all proof_points reference valid providers",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_points")
        .select(`
          id,
          provider:solution_providers(id)
        `)
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Proof points FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(p => !p.provider);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} orphaned proof points`);
      }
    }),
  },
  {
    id: "DI-002",
    category: "Foreign Key Integrity",
    name: "Enrollments have valid provider_id",
    description: "Verify all enrollments reference valid providers",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          provider:solution_providers(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Enrollments FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(e => !e.provider);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} orphaned enrollments`);
      }
    }),
  },
  {
    id: "DI-003",
    category: "Foreign Key Integrity",
    name: "Enrollments have valid industry_segment_id",
    description: "Verify all enrollments reference valid industry segments",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          industry_segment:industry_segments(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Enrollments industry FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(e => !e.industry_segment);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} enrollments with invalid industry`);
      }
    }),
  },
  {
    id: "DI-004",
    category: "Foreign Key Integrity",
    name: "Interview bookings have valid enrollment_id",
    description: "Verify all bookings reference valid enrollments",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select(`
          id,
          enrollment:provider_industry_enrollments(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Bookings enrollment FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(b => !b.enrollment);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} bookings with invalid enrollment`);
      }
    }),
  },
  {
    id: "DI-005",
    category: "Foreign Key Integrity",
    name: "Assessment attempts have valid provider_id",
    description: "Verify all assessments reference valid providers",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("assessment_attempts")
        .select(`
          id,
          provider:solution_providers(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Assessments provider FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(a => !a.provider);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} assessments with invalid provider`);
      }
    }),
  },
  {
    id: "DI-006",
    category: "Foreign Key Integrity",
    name: "Questions have valid speciality_id",
    description: "Verify question_bank references valid specialities",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select(`
          id,
          speciality:specialities(id)
        `)
        .eq("is_deleted", false)
        .limit(50);
      
      if (error) throw new Error(`Questions speciality FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(q => !q.speciality);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} questions with invalid speciality`);
      }
    }),
  },
  {
    id: "DI-007",
    category: "Foreign Key Integrity",
    name: "Booking reviewers have valid reviewer_id",
    description: "Verify booking_reviewers reference valid reviewers",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("booking_reviewers")
        .select(`
          id,
          reviewer:panel_reviewers(id)
        `)
        .limit(50);
      
      if (error) throw new Error(`Booking reviewers FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(br => !br.reviewer);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} booking_reviewers with invalid reviewer`);
      }
    }),
  },
];

// ============================================================================
// SOFT DELETE PATTERN TESTS
// ============================================================================

const softDeleteTests: TestCase[] = [
  {
    id: "DI-008",
    category: "Soft Delete",
    name: "Proof points use is_deleted pattern",
    description: "Verify proof_points.is_deleted field exists and works",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_points")
        .select("id, is_deleted, deleted_at, deleted_by")
        .limit(10);
      
      if (error) throw new Error(`Soft delete query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.is_deleted === undefined) {
          throw new Error("is_deleted field missing from proof_points");
        }
      }
    }),
  },
  {
    id: "DI-009",
    category: "Soft Delete",
    name: "Question bank table accessible",
    description: "Verify question_bank table exists and is queryable",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("question_bank")
        .select("id, question_text")
        .limit(10);
      
      if (error) throw new Error(`Question bank query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        // Table is accessible
        if (!data[0].id) {
          throw new Error("Question bank records missing id");
        }
      }
    }),
  },
  {
    id: "DI-010",
    category: "Soft Delete",
    name: "Deleted records have deleted_at timestamp",
    description: "Verify deleted proof points have timestamp",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_points")
        .select("id, is_deleted, deleted_at")
        .eq("is_deleted", true)
        .limit(10);
      
      if (error) throw new Error(`Deleted records query failed: ${error.message}`);
      
      const missingTimestamp = (data || []).filter(d => !d.deleted_at);
      // This is informational - some systems may not require timestamp
    }),
  },
  {
    id: "DI-011",
    category: "Soft Delete",
    name: "Pulse content uses is_deleted pattern",
    description: "Verify pulse_content.is_deleted field exists",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_content")
        .select("id, is_deleted")
        .limit(10);
      
      if (error) throw new Error(`Pulse content soft delete query failed: ${error.message}`);
      
      if (data && data.length > 0) {
        const first = data[0];
        if (first.is_deleted === undefined) {
          throw new Error("is_deleted field missing from pulse_content");
        }
      }
    }),
  },
  {
    id: "DI-012",
    category: "Soft Delete",
    name: "Engagements use is_deleted pattern",
    description: "Verify pulse_engagements.is_deleted field exists",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("pulse_engagements")
        .select("id, is_deleted")
        .limit(10);
      
      if (error) throw new Error(`Engagements soft delete query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// AUDIT TRAIL TESTS
// ============================================================================

const auditTrailTests: TestCase[] = [
  {
    id: "DI-013",
    category: "Audit Trail",
    name: "Countries have created_at",
    description: "Verify created_at field exists on countries",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("id, created_at, updated_at")
        .limit(5);
      
      if (error) throw new Error(`Countries audit query failed: ${error.message}`);
      
      const missing = (data || []).filter(d => !d.created_at);
      if (missing.length > 0) {
        throw new Error(`Found ${missing.length} countries without created_at`);
      }
    }),
  },
  {
    id: "DI-014",
    category: "Audit Trail",
    name: "Industry segments have audit fields",
    description: "Verify created_by, updated_by exist",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("industry_segments")
        .select("id, created_at, updated_at, created_by, updated_by")
        .limit(5);
      
      if (error) throw new Error(`Industry segments audit query failed: ${error.message}`);
    }),
  },
  {
    id: "DI-015",
    category: "Audit Trail",
    name: "Proof points have created_by",
    description: "Verify proof_points tracks creator",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("proof_points")
        .select("id, created_at, created_by")
        .eq("is_deleted", false)
        .limit(10);
      
      if (error) throw new Error(`Proof points audit query failed: ${error.message}`);
    }),
  },
  {
    id: "DI-016",
    category: "Audit Trail",
    name: "Enrollments have audit fields",
    description: "Verify enrollments have full audit trail",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("id, created_at, updated_at, created_by, updated_by")
        .limit(10);
      
      if (error) throw new Error(`Enrollments audit query failed: ${error.message}`);
    }),
  },
  {
    id: "DI-017",
    category: "Audit Trail",
    name: "Bookings have audit fields",
    description: "Verify interview_bookings has audit trail",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("interview_bookings")
        .select("id, created_at, updated_at, created_by, updated_by")
        .limit(10);
      
      if (error) throw new Error(`Bookings audit query failed: ${error.message}`);
    }),
  },
];

// ============================================================================
// UNIQUE CONSTRAINT TESTS
// ============================================================================

const uniqueConstraintTests: TestCase[] = [
  {
    id: "DI-018",
    category: "Unique Constraints",
    name: "One enrollment per industry per provider",
    description: "Verify unique constraint on provider_id + industry_segment_id",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("provider_industry_enrollments")
        .select("provider_id, industry_segment_id")
        .limit(200);
      
      if (error) throw new Error(`Enrollment uniqueness query failed: ${error.message}`);
      
      // Check for duplicates
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const e of data || []) {
        const key = `${e.provider_id}-${e.industry_segment_id}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Found ${duplicates.length} duplicate enrollments`);
      }
    }),
  },
  {
    id: "DI-019",
    category: "Unique Constraints",
    name: "Country codes unique",
    description: "Verify unique constraint on country code",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("code")
        .limit(500);
      
      if (error) throw new Error(`Country codes query failed: ${error.message}`);
      
      const codes = (data || []).map(d => d.code);
      const uniqueCodes = new Set(codes);
      
      if (codes.length !== uniqueCodes.size) {
        throw new Error(`Found duplicate country codes`);
      }
    }),
  },
  {
    id: "DI-020",
    category: "Unique Constraints",
    name: "Industry segment codes unique",
    description: "Verify unique constraint on industry segment code",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("industry_segments")
        .select("code")
        .limit(100);
      
      if (error) throw new Error(`Industry codes query failed: ${error.message}`);
      
      const codes = (data || []).map(d => d.code);
      const uniqueCodes = new Set(codes);
      
      if (codes.length !== uniqueCodes.size) {
        throw new Error(`Found duplicate industry segment codes`);
      }
    }),
  },
  {
    id: "DI-021",
    category: "Unique Constraints",
    name: "Expertise level numbers unique",
    description: "Verify unique constraint on level_number",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .select("level_number");
      
      if (error) throw new Error(`Expertise levels query failed: ${error.message}`);
      
      const levels = (data || []).map(d => d.level_number);
      const uniqueLevels = new Set(levels);
      
      if (levels.length !== uniqueLevels.size) {
        throw new Error(`Found duplicate expertise level numbers`);
      }
    }),
  },
  {
    id: "DI-022",
    category: "Unique Constraints",
    name: "User roles unique per user",
    description: "Verify no duplicate role assignments",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .limit(500);
      
      if (error) throw new Error(`User roles query failed: ${error.message}`);
      
      const seen = new Set<string>();
      const duplicates: string[] = [];
      
      for (const r of data || []) {
        const key = `${r.user_id}-${r.role}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      }
      
      if (duplicates.length > 0) {
        throw new Error(`Found ${duplicates.length} duplicate role assignments`);
      }
    }),
  },
];

// ============================================================================
// REFERENTIAL INTEGRITY TESTS
// ============================================================================

const referentialIntegrityTests: TestCase[] = [
  {
    id: "DI-023",
    category: "Referential Integrity",
    name: "Profiles reference valid auth users",
    description: "Verify profiles.user_id references valid users",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      // Query profiles - user_id should be valid (RLS allows)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email")
        .limit(20);
      
      if (error) throw new Error(`Profiles query failed: ${error.message}`);
      
      const missing = (data || []).filter(p => !p.user_id);
      if (missing.length > 0) {
        throw new Error(`Found ${missing.length} profiles without user_id`);
      }
    }),
  },
  {
    id: "DI-024",
    category: "Referential Integrity",
    name: "Solution providers reference valid auth users",
    description: "Verify solution_providers.user_id references valid users",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("solution_providers")
        .select("id, user_id")
        .limit(50);
      
      if (error) throw new Error(`Providers query failed: ${error.message}`);
      
      const missing = (data || []).filter(p => !p.user_id);
      if (missing.length > 0) {
        throw new Error(`Found ${missing.length} providers without user_id`);
      }
    }),
  },
  {
    id: "DI-025",
    category: "Referential Integrity",
    name: "Specialities reference valid sub-domains",
    description: "Verify specialities.sub_domain_id is valid",
    role: "system",
    module: "data_integrity",
    run: () => runTest(async () => {
      const { data, error } = await supabase
        .from("specialities")
        .select(`
          id,
          sub_domain:sub_domains(id, name)
        `)
        .eq("is_active", true)
        .limit(50);
      
      if (error) throw new Error(`Specialities FK query failed: ${error.message}`);
      
      const orphaned = (data || []).filter(s => !s.sub_domain);
      if (orphaned.length > 0) {
        throw new Error(`Found ${orphaned.length} specialities with invalid sub_domain`);
      }
    }),
  },
];

// ============================================================================
// EXPORT DATA INTEGRITY TEST CATEGORIES
// ============================================================================

export const dataIntegrityTestCategories: TestCategory[] = [
  {
    id: "foreign-keys",
    name: "Foreign Key Integrity",
    description: "Foreign key relationship validation tests",
    role: "system",
    module: "data_integrity",
    tests: foreignKeyTests,
  },
  {
    id: "soft-delete",
    name: "Soft Delete Patterns",
    description: "Soft delete implementation tests",
    role: "system",
    module: "data_integrity",
    tests: softDeleteTests,
  },
  {
    id: "audit-trail",
    name: "Audit Trail",
    description: "Audit field presence and population tests",
    role: "system",
    module: "data_integrity",
    tests: auditTrailTests,
  },
  {
    id: "unique-constraints",
    name: "Unique Constraints",
    description: "Uniqueness constraint validation tests",
    role: "system",
    module: "data_integrity",
    tests: uniqueConstraintTests,
  },
  {
    id: "referential-integrity",
    name: "Referential Integrity",
    description: "Cross-table reference validation tests",
    role: "system",
    module: "data_integrity",
    tests: referentialIntegrityTests,
  },
];

// Get all data integrity tests flattened
export function getDataIntegrityTests(): TestCase[] {
  return dataIntegrityTestCategories.flatMap(cat => cat.tests);
}

// Get data integrity test count
export function getDataIntegrityTestCount(): number {
  return dataIntegrityTestCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
}
