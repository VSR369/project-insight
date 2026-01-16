# Lifecycle Governance Test Coverage Summary

**Version:** 2.0  
**Last Updated:** January 2026  
**Module:** Solution Provider Lifecycle Management + Assessment Service  

---

## Overview

This document summarizes all tests for the Lifecycle Governance system, which enforces business rules around:
- Field modification locks at lifecycle milestones
- Cascade resets when configuration fields change
- Terminal state enforcement (verified/certified profiles)
- Minimum proof points constraints
- **Assessment lifecycle lock triggers** (NEW)

---

## Test Files

| File | Type | Test Count | Purpose |
|------|------|------------|---------|
| `src/test/lifecycle-governance.test.ts` | Unit | 56+ | Core business logic validation |
| `src/test/lifecycle-integration.test.ts` | Integration | 25+ | Database function validation |
| `src/test/cascade-smoke.test.ts` | Smoke | 28 | Read-only production safety checks |
| `src/test/assessment-service.test.ts` | Unit | 62+ | Assessment lifecycle lock trigger |
| `src/test/assessment-hooks.test.ts` | Unit | 16+ | Assessment React hooks |

**Total Tests:** 187+ across all suites

---

## Assessment Service Tests (NEW)

### 4. Assessment Service Tests (`assessment-service.test.ts`)

#### 4.1 Assessment Start Prerequisites (6 tests)
| Test | Description | Business Rule |
|------|-------------|---------------|
| TC-AS-01 | Provider at rank 70 can start assessment | Minimum proof points met |
| TC-AS-02 | Provider at rank 60 cannot start | Below minimum |
| TC-AS-03 | Provider at rank 50 cannot start | Below minimum |
| TC-AS-04 | Provider at rank 20 cannot start | Below minimum |
| TC-AS-05 | Rank 100 cannot start new assessment | Already in assessment |
| TC-AS-06 | Rank 110 cannot start new assessment | Already passed |

#### 4.2 Configuration Lock at Assessment Start (6 tests)
| Test | Description | Expected Result |
|------|-------------|-----------------|
| TC-CL-01 | Configuration locked at rank 100 | `allowed: false, lockLevel: 'configuration'` |
| TC-CL-02 | Industry segment locked | Cannot modify |
| TC-CL-03 | Expertise level locked | Cannot modify |
| TC-CL-04 | Specialities locked | Cannot modify |
| TC-CL-05 | Registration still editable | `allowed: true` |
| TC-CL-06 | Content still editable | `allowed: true` |

#### 4.3 Lifecycle Rank Transitions (6 tests)
| Test | Description | Expected Value |
|------|-------------|----------------|
| TC-LT-01 | assessment_in_progress rank | 100 |
| TC-LT-02 | assessment_passed rank | 110 |
| TC-LT-03 | Lock threshold equals rank 100 | Match verified |
| TC-LT-04 | proof_points_min_met below lock | < 100 |
| TC-LT-05 | Valid progression: 70 → 100 | Ascending |
| TC-LT-06 | Completion ranks: 105 or 110 | Pass/Fail |

#### 4.4 Boundary Testing (6 tests)
| Test | Rank | Assessment Allowed | Config Allowed |
|------|------|-------------------|----------------|
| TC-BT-01 | 69 | No | Yes |
| TC-BT-02 | 70 | Yes | Yes |
| TC-BT-03 | 99 | Yes | Yes |
| TC-BT-04 | 100 | No | No |
| TC-BT-05 | 99 | Can transition | - |
| TC-BT-06 | 100 | Blocked | - |

#### 4.5 Active Assessment Blocking (3 tests)
| Test | Description | Expected Result |
|------|-------------|-----------------|
| TC-AB-01 | Active attempt blocks new start | Cannot start |
| TC-AB-02 | Expired attempt allows new start | Can start |
| TC-AB-03 | Multiple expired don't block | Can start |

#### 4.6 Error Handling Paths (4 tests)
| Test | Error Condition | Expected |
|------|-----------------|----------|
| TC-EH-01 | Missing providerId | Error returned |
| TC-EH-02 | Not authenticated | Error returned |
| TC-EH-03 | Already submitted | Error returned |
| TC-EH-04 | Non-existent attemptId | Error returned |

#### 4.7 Score Calculation Edge Cases (5 tests)
| Test | Score | Passed |
|------|-------|--------|
| TC-SC-01 | 0% | false |
| TC-SC-02 | 100% | true |
| TC-SC-03 | 70% (exact) | true |
| TC-SC-04 | 69% | false |
| TC-SC-05 | 73.33% (decimal) | true |

#### 4.8 Assessment Status Outcomes (4 tests)
| Test | Condition | Resulting Rank |
|------|-----------|----------------|
| TC-SO-01 | Failed | 105 |
| TC-SO-02 | Passed | 110 |
| TC-SO-03 | After pass | Config still locked |
| TC-SO-04 | Result stored | All fields set |

---

### 5. Assessment Hooks Tests (`assessment-hooks.test.ts`)

#### 5.1 useAssessmentTimeRemaining (5 tests)
| Test | Description |
|------|-------------|
| TC-TR-01 | Correct seconds remaining calculation |
| TC-TR-02 | isExpired true when past limit |
| TC-TR-03 | formatTime returns MM:SS correctly |
| TC-TR-04 | Null values when no attempt |
| TC-TR-05 | Edge case: 0 seconds remaining |

#### 5.2 useCanStartAssessment (4 tests)
| Test | Description |
|------|-------------|
| TC-CS-01 | Returns allowed:true for eligible |
| TC-CS-02 | Returns false with reason (low rank) |
| TC-CS-03 | Returns false with active attempt |
| TC-CS-04 | Returns false at rank 100+ |

#### 5.3 useStartAssessment Mutation (3 tests)
| Test | Description |
|------|-------------|
| TC-SM-01 | Invalidates queries on success |
| TC-SM-02 | Shows error toast on failure |
| TC-SM-03 | Returns attempt data on success |

#### 5.4 useSubmitAssessment Mutation (4 tests)
| Test | Description |
|------|-------------|
| TC-SU-01 | Returns pass result with rank 110 |
| TC-SU-02 | Returns fail result with rank 105 |
| TC-SU-03 | Shows success toast with score |
| TC-SU-04 | Invalidates all queries on submit |

---

## Test Suite Details

### 1. Unit Tests (`lifecycle-governance.test.ts`)

#### 1.1 Lock Threshold Tests
| Test | Description | Business Rule |
|------|-------------|---------------|
| Configuration lock at rank 100 | Prevents industry/expertise changes during assessment | BR-3.2.3, BR-3.4.2 |
| Content lock at rank 120 | Prevents proof point changes after panel scheduled | BR-3.5.4 |
| Everything lock at rank 140 | Freezes entire profile at verification | BR-01 |
| Lock allows changes below threshold | Confirms edits work before lock | - |

#### 1.2 Field Modification Tests (`canModifyField`)
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Rank 0 - all modifications allowed | New provider can edit everything | `{ allowed: true }` |
| Rank 50 - configuration allowed | Pre-assessment edits work | `{ allowed: true }` |
| Rank 100 - configuration locked | Assessment started | `{ allowed: false, lockLevel: 'configuration' }` |
| Rank 120 - content locked | Panel scheduled | `{ allowed: false, lockLevel: 'content' }` |
| Rank 140 - everything locked | Verified state | `{ allowed: false, lockLevel: 'everything' }` |

#### 1.3 Cascade Impact Detection Tests (`getCascadeImpact`)
| Test | Description | Expected Impact |
|------|-------------|-----------------|
| Industry change with expertise | Full cascade required | `type: 'HARD_RESET', warningLevel: 'critical'` |
| Industry change without expertise | No cascade needed | `type: 'NONE'` |
| Expertise change with specialty PPs | Partial cascade | `type: 'PARTIAL_RESET', warningLevel: 'warning'` |
| Expertise change without specialty PPs | Info only cascade | `type: 'PARTIAL_RESET', warningLevel: 'info'` |

#### 1.4 Terminal State Tests
| Test | Description | Business Rule |
|------|-------------|---------------|
| Verified is terminal | No modifications allowed | BR-01 |
| Certified is terminal | Profile completely frozen | BR-01 |
| Suspended is terminal | Account locked | - |
| Active is NOT terminal | Post-certification activity allowed | - |

#### 1.5 Lifecycle Hook Tests
| Hook | Tests Covered |
|------|---------------|
| `useCanModifyField` | Returns correct lock status per category |
| `useIsTerminalState` | Correctly identifies terminal states |
| `useCascadeImpact` | Returns impact for industry/expertise changes |

---

### 2. Integration Tests (`lifecycle-integration.test.ts`)

#### 2.1 `execute_industry_change_reset` RPC Function
| Test | Validates | Expected Outcome |
|------|-----------|------------------|
| Soft-delete specialty PPs only | `is_deleted = true` for specialty category | General PPs preserved |
| Clear provider_specialities | All speciality selections removed | Count = 0 |
| Clear provider_proficiency_areas | All proficiency areas removed | Count = 0 |
| Reset lifecycle to enrolled | Status and rank updated | `enrolled`, rank 20 |
| Clear expertise_level_id | Expertise reset | `null` |
| Set audit fields | Tracking who made change | `updated_by`, `updated_at` set |

#### 2.2 `execute_expertise_change_reset` RPC Function
| Test | Validates | Expected Outcome |
|------|-----------|------------------|
| Soft-delete specialty PPs | Specialty proof points marked deleted | `is_deleted = true` |
| Preserve general PPs | General proof points untouched | `is_deleted = false` |
| Clear specialities/areas | Selections cleared | Count = 0 |
| Reset lifecycle to expertise_selected | Status updated | `expertise_selected`, rank 50 |
| Preserve industry_segment_id | Industry NOT cleared | Original value retained |

#### 2.3 `handle_orphaned_proof_points` RPC Function
| Test | Validates | Expected Outcome |
|------|-----------|------------------|
| Convert orphaned PPs to general | Category change | `specialty_specific` → `general` |
| Remove tags from removed areas | Tag cleanup | Deleted from `proof_point_speciality_tags` |
| Keep PPs with mixed tags | Partial tag removal | Remains `specialty_specific` |
| Return conversion count | Function output | Integer count |
| Handle empty array | Edge case | Returns 0, no changes |

#### 2.4 Full Cascade Flow Tests
| Test | Scenario | Validations |
|------|----------|-------------|
| Industry change cascade | Complete data reset | Lifecycle, expertise, PPs, areas all reset |
| Expertise change cascade | Partial reset | Industry preserved, specialty data cleared |
| Orphaned PP conversion | Area removal | Orphaned PPs become general |

---

### 3. Smoke Tests (`cascade-smoke.test.ts`)

#### 3.1 RPC Function Existence (8 tests)
| Function | Tests |
|----------|-------|
| `get_cascade_impact_counts` | Exists, returns expected columns, handles invalid UUID |
| `execute_industry_change_reset` | Service wrapper exists |
| `execute_expertise_change_reset` | Service wrapper exists |
| `handle_orphaned_proof_points` | Exists, accepts array, handles empty array |

#### 3.2 Service Layer Exports (4 tests)
| Service | Exports Verified |
|---------|------------------|
| `cascadeResetService` | `getCascadeImpactCounts`, `executeIndustryChangeReset`, `executeExpertiseLevelChangeReset` |

#### 3.3 Lifecycle Service Exports (6 tests)
| Export | Tests |
|--------|-------|
| `canModifyField` | Exists, returns `{ allowed, reason }` |
| `getCascadeImpact` | Exists, returns `{ warningLevel, message, type }` |
| `LOCK_THRESHOLDS` | Exists, has `EVERYTHING` ≥ 140 |
| `LIFECYCLE_RANKS` | Has `verified` at terminal level |

#### 3.4 Database Schema Validation (5 tests)
| Table | Columns Verified |
|-------|------------------|
| `proof_points` | `id`, `provider_id`, `category`, `type`, `title`, `is_deleted` |
| `provider_proficiency_areas` | `id`, `provider_id`, `proficiency_area_id` |
| `provider_specialities` | `id`, `provider_id`, `speciality_id` |
| `solution_providers` | `lifecycle_status`, `lifecycle_rank`, `expertise_level_id`, `industry_segment_id` |
| `proof_point_speciality_tags` | `id`, `proof_point_id`, `speciality_id` |

#### 3.5 Lifecycle Stages Configuration (5 tests)
| Stage | Validations |
|-------|-------------|
| `enrolled` | Rank = 20 |
| `expertise_selected` | Rank = 50 |
| `verified` | `locks_everything = true` |
| General | Table exists with required data |

---

## Coverage Matrix

### Business Rules Coverage

| Rule ID | Description | Unit | Integration | Smoke | Assessment |
|---------|-------------|------|-------------|-------|------------|
| BR-01 | Terminal state freeze | ✅ | ✅ | ✅ | ✅ |
| BR-3.1.2 | Registration lock after panel | ✅ | - | - | - |
| BR-3.2.2 | Industry change cascade | ✅ | ✅ | ✅ | - |
| BR-3.2.3 | Industry lock during assessment | ✅ | - | - | ✅ |
| BR-3.4.1 | Expertise change cascade | ✅ | ✅ | ✅ | - |
| BR-3.4.2 | Expertise lock during assessment | ✅ | - | - | ✅ |
| BR-3.5.2 | Minimum proof points (2) | ✅ | - | - | ✅ |
| BR-3.5.4 | Content lock after panel | ✅ | - | - | - |
| **BR-ASM-01** | Assessment start prerequisites | - | - | - | ✅ |
| **BR-ASM-02** | Configuration lock at assessment | - | - | - | ✅ |
| **BR-ASM-03** | Active assessment blocking | - | - | - | ✅ |
| **BR-ASM-04** | Score calculation & pass/fail | - | - | - | ✅ |

### Database Functions Coverage

| Function | Unit Mock | Integration | Smoke |
|----------|-----------|-------------|-------|
| `get_cascade_impact_counts` | - | ✅ | ✅ |
| `execute_industry_change_reset` | - | ✅ | ✅ |
| `execute_expertise_change_reset` | - | ✅ | ✅ |
| `handle_orphaned_proof_points` | - | ✅ | ✅ |

### UI Component Coverage

| Component | Integration Point Tested |
|-----------|-------------------------|
| `CascadeWarningDialog` | Impact display, confirm/cancel flow |
| `LockedFieldBanner` | Lock level display |
| `BlockedModeChangeDialog` | Mode change blocking |
| Enrollment pages (6) | Terminal state enforcement |
| Profile pages (6) | Terminal state enforcement |

---

## Running Tests

### All Tests
```bash
npm run test
```

### Unit Tests Only
```bash
npm run test src/test/lifecycle-governance.test.ts
```

### Integration Tests Only
```bash
npm run test src/test/lifecycle-integration.test.ts
```

### Smoke Tests Only (Safe for Production)
```bash
npm run test src/test/cascade-smoke.test.ts
```

### Assessment Service Tests
```bash
npm run test src/test/assessment-service.test.ts
```

### Assessment Hooks Tests
```bash
npm run test src/test/assessment-hooks.test.ts
```

---

## Manual Test Cases

These tests require manual QA execution in staging:

### TC-M01: Industry Change Cascade
1. Create new provider, complete through Proof Points
2. Add 2 general + 2 specialty proof points
3. Navigate back to Registration, change industry segment
4. **Verify:** Critical warning dialog appears
5. Confirm change
6. **Verify:** Lifecycle = 'enrolled', expertise cleared, only specialty PPs deleted

### TC-M02: Expertise Change Cascade
1. Create provider with expertise selected
2. Add mixed proof points (general + specialty)
3. Change expertise level
4. **Verify:** Warning dialog appears
5. Confirm change
6. **Verify:** Lifecycle = 'expertise_selected', industry unchanged

### TC-M03: Terminal State Lock
1. Set provider to 'verified' status (admin)
2. Attempt to access edit screens
3. **Verify:** All edit actions disabled
4. **Verify:** Lock banners displayed on all pages

### TC-M04: Mode Change with Pending Approval
1. Select Organization mode, submit for manager approval
2. Try to change to Independent mode
3. **Verify:** Block dialog appears
4. Cancel pending request
5. **Verify:** Mode change now allowed

### TC-M05: Minimum Proof Points Constraint
1. Create provider with exactly 2 proof points
2. Try to delete one
3. **Verify:** Error "Minimum 2 proof points required."
4. Add third proof point
5. Delete one
6. **Verify:** Deletion succeeds

### TC-M06: Assessment Start Flow (NEW)
1. Create provider at rank 70 (proof_points_min_met)
2. Click "Start Assessment"
3. **Verify:** Lifecycle transitions to assessment_in_progress (rank 100)
4. **Verify:** Configuration fields become locked
5. **Verify:** Cannot start another assessment

### TC-M07: Assessment Completion Flow (NEW)
1. Complete assessment with >70% score
2. **Verify:** Status = assessment_passed, rank = 110
3. Complete assessment with <70% score
4. **Verify:** Status = assessment_completed, rank = 105

---

## Test Maintenance

### When to Update Tests
- New lifecycle stages added
- Lock threshold values changed
- New cascade rules implemented
- New terminal states defined
- Database schema changes
- Assessment rules or scoring changes

### Test Data Requirements
- Integration tests need authenticated Supabase session
- Smoke tests are read-only (safe for any environment)
- Manual tests should run in staging only

---

*Document maintained by: Engineering Team*  
*Last QA Review: [Date TBD]*
