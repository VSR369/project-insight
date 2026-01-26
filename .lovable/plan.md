
# Comprehensive Fix: Reviewer RLS Policies for Candidate Detail Page

## Problem Analysis

### Current State
The candidate detail page tabs are showing empty because **Row Level Security (RLS) policies block reviewers from accessing provider data**. The existing RLS policies only allow:
- **Providers** to view/manage their own data
- **Platform Admins** full access

### Missing Reviewer Access
The following tables have **NO RLS policies for reviewer access**:

| Table | SELECT | UPDATE | Impact |
|-------|--------|--------|--------|
| `proof_points` | Missing | Missing | Proof Points tab empty |
| `proof_point_links` | Missing | — | No supporting links visible |
| `proof_point_files` | Missing | — | No attached files visible |
| `proof_point_speciality_tags` | Missing | — | No speciality tags visible |
| `assessment_attempts` | Missing | — | Assessment tab empty |
| `assessment_attempt_responses` | Missing | — | No question-level results |
| `provider_proficiency_areas` | Missing | — | Expertise tree empty |
| `provider_specialities` | Missing | — | Expertise tree incomplete |

### Data Verification
The enrollment `58155298-1987-4f40-ba6c-2f8aa3257e7d` has:
- ✅ 4 proof points (2 general, 2 specialty-specific)
- ✅ Assessment completed (85% pass)
- ✅ Lifecycle status: `panel_scheduled` (rank 120)
- ❌ Reviewer cannot see any of this due to RLS blocking

### Existing Helper Functions
The database already has three SECURITY DEFINER functions available:
- `is_reviewer_for_provider(p_provider_id UUID)` → checks if current user is assigned reviewer for a provider
- `is_reviewer_for_enrollment(p_enrollment_id UUID)` → checks if current user is assigned reviewer for an enrollment
- `is_reviewer_assigned_to_booking(p_booking_id UUID)` → checks if current user is assigned to a booking

These functions resolve the RLS recursion issue and are already used for `solution_providers` and `provider_industry_enrollments`.

---

## Solution: Add Reviewer RLS Policies

### Phase 1: Proof Points Access (SELECT + UPDATE)

**1.1 `proof_points` table**
```sql
-- Allow reviewers to VIEW proof points for assigned enrollments
CREATE POLICY "Reviewers can view assigned proof points"
  ON public.proof_points
  FOR SELECT
  TO authenticated
  USING (
    is_reviewer_for_enrollment(enrollment_id)
  );

-- Allow reviewers to UPDATE review columns only
CREATE POLICY "Reviewers can update proof point ratings"
  ON public.proof_points
  FOR UPDATE
  TO authenticated
  USING (is_reviewer_for_enrollment(enrollment_id))
  WITH CHECK (is_reviewer_for_enrollment(enrollment_id));
```

**1.2 `proof_point_links` table**
```sql
CREATE POLICY "Reviewers can view proof point links"
  ON public.proof_point_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_links.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );
```

**1.3 `proof_point_files` table**
```sql
CREATE POLICY "Reviewers can view proof point files"
  ON public.proof_point_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_files.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );
```

**1.4 `proof_point_speciality_tags` table**
```sql
CREATE POLICY "Reviewers can view proof point tags"
  ON public.proof_point_speciality_tags
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proof_points pp
      WHERE pp.id = proof_point_speciality_tags.proof_point_id
        AND is_reviewer_for_enrollment(pp.enrollment_id)
    )
  );
```

### Phase 2: Assessment Access (SELECT only)

**2.1 `assessment_attempts` table**
```sql
CREATE POLICY "Reviewers can view assigned assessment attempts"
  ON public.assessment_attempts
  FOR SELECT
  TO authenticated
  USING (
    is_reviewer_for_enrollment(enrollment_id)
  );
```

**2.2 `assessment_attempt_responses` table**
```sql
CREATE POLICY "Reviewers can view assigned assessment responses"
  ON public.assessment_attempt_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa
      WHERE aa.id = assessment_attempt_responses.attempt_id
        AND is_reviewer_for_enrollment(aa.enrollment_id)
    )
  );
```

### Phase 3: Expertise/Proficiency Access (SELECT only)

**3.1 `provider_proficiency_areas` table**
```sql
CREATE POLICY "Reviewers can view assigned proficiency areas"
  ON public.provider_proficiency_areas
  FOR SELECT
  TO authenticated
  USING (
    is_reviewer_for_enrollment(enrollment_id)
  );
```

**3.2 `provider_specialities` table**
```sql
CREATE POLICY "Reviewers can view assigned specialities"
  ON public.provider_specialities
  FOR SELECT
  TO authenticated
  USING (
    is_reviewer_for_enrollment(enrollment_id)
  );
```

### Phase 4: Enrollment UPDATE Policy

The `provider_industry_enrollments` table needs an UPDATE policy for reviewers to save review status:

```sql
CREATE POLICY "Reviewers can update review fields on assigned enrollments"
  ON public.provider_industry_enrollments
  FOR UPDATE
  TO authenticated
  USING (is_reviewer_for_enrollment(id))
  WITH CHECK (is_reviewer_for_enrollment(id));
```

---

## Technical Details

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RLS Policy Check Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Request → Supabase Client                              │
│  2. auth.uid() → Current User ID                                 │
│  3. is_reviewer_for_enrollment(enrollment_id) function:          │
│                                                                  │
│     ┌──────────────────────────────────────────────────────┐    │
│     │  panel_reviewers (pr)                                │    │
│     │    └── pr.user_id = auth.uid()                       │    │
│     │    └── pr.is_active = true                           │    │
│     │             ↓                                         │    │
│     │  booking_reviewers (br)                              │    │
│     │    └── br.reviewer_id = pr.id                        │    │
│     │             ↓                                         │    │
│     │  interview_bookings (ib)                             │    │
│     │    └── ib.id = br.booking_id                         │    │
│     │    └── ib.enrollment_id = p_enrollment_id            │    │
│     └──────────────────────────────────────────────────────┘    │
│                                                                  │
│  4. Returns TRUE only if reviewer is assigned to enrollment      │
│  5. Policy grants access based on function result                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why SECURITY DEFINER Functions?

1. **Prevents RLS recursion**: Direct joins in policy `USING` clauses can cause infinite recursion
2. **Performance**: Function is optimized and cached
3. **Consistency**: Same logic across all tables
4. **Maintainability**: Update access rules in one place

### Policy Permissions Matrix

| Table | Reviewer SELECT | Reviewer UPDATE | Notes |
|-------|-----------------|-----------------|-------|
| `proof_points` | ✅ | ✅ (review columns) | Rate and comment |
| `proof_point_links` | ✅ | ❌ | View only |
| `proof_point_files` | ✅ | ❌ | View only |
| `proof_point_speciality_tags` | ✅ | ❌ | View only |
| `assessment_attempts` | ✅ | ❌ | View only |
| `assessment_attempt_responses` | ✅ | ❌ | View only |
| `provider_proficiency_areas` | ✅ | ❌ | View only |
| `provider_specialities` | ✅ | ❌ | View only |
| `provider_industry_enrollments` | ✅ (existing) | ✅ (review fields) | Update review status |

---

## Implementation Plan

### Step 1: Database Migration
Create a single migration file with all 10 new RLS policies:
- 8 SELECT policies (one per table)
- 2 UPDATE policies (`proof_points` and `provider_industry_enrollments`)

### Step 2: Verification
After migration, verify each tab works:
- **Provider Details**: Already working (existing policies)
- **Expertise**: Should show proficiency tree
- **Proof Points**: Should show 4 items with rating controls
- **Assessment**: Should show 85% pass with hierarchy breakdown
- **Slots**: Already working (existing policies)

### Step 3: Testing Checklist
- [ ] Reviewer can view proof points for assigned enrollment
- [ ] Reviewer can rate proof points (relevance + score)
- [ ] Reviewer can save draft ratings
- [ ] Reviewer can confirm proof points review
- [ ] Reviewer can view assessment results
- [ ] Reviewer can view expertise tree
- [ ] Reviewer CANNOT view data for unassigned enrollments
- [ ] Provider data remains private from other providers

---

## Risk Mitigation

### Data Privacy
- Reviewers only see data for enrollments they are **explicitly assigned** to
- Assignment is controlled by the booking process (not self-selected)
- No cross-tenant data exposure

### Performance
- `is_reviewer_for_enrollment()` is SECURITY DEFINER and STABLE
- Existing indexes on `booking_reviewers`, `interview_bookings` optimize lookups
- Function executes once per query, not per row (PostgreSQL optimization)

### Rollback
If issues occur, policies can be dropped without data loss:
```sql
DROP POLICY IF EXISTS "Reviewers can view assigned proof points" ON proof_points;
-- etc.
```
