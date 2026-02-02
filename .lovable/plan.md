
# Implementation Plan: Merge `verified` → `certified` and Rename `not_verified` → `not_certified`

## Summary of Changes

Based on your confirmation:
1. **Merge `verified` (rank 140) INTO `certified` (rank 150)** - Only `certified` will remain as the success terminal state
2. **Rename `not_verified` → `not_certified`** - More intuitive business meaning
3. **`not_certified` providers stay in that status** - No retry mechanism for now

---

## Current State Analysis

### Existing lifecycle_status Enum Values (22 total)
```
invited → registered → enrolled → mode_selected → org_info_pending → org_validated →
expertise_selected → profile_building → proof_points_started → proof_points_min_met →
assessment_pending → assessment_in_progress → assessment_completed → assessment_passed →
panel_scheduled → panel_completed → verified → active → certified → not_verified →
suspended → inactive
```

### After Changes (21 total - removing `verified`)
```
invited → registered → enrolled → mode_selected → org_info_pending → org_validated →
expertise_selected → profile_building → proof_points_started → proof_points_min_met →
assessment_pending → assessment_in_progress → assessment_completed → assessment_passed →
panel_scheduled → panel_completed → active → certified → not_certified →
suspended → inactive
```

### New Lifecycle Ranks
| Status | Old Rank | New Rank | Notes |
|--------|----------|----------|-------|
| panel_completed | 130 | 130 | No change |
| ~~verified~~ | 140 | REMOVED | Merged into certified |
| active | 145 | 135 | Moved up (rarely used) |
| certified | 150 | 140 | Success terminal state |
| ~~not_verified~~ | 160 | - | Renamed |
| not_certified | - | 150 | Failure terminal state |
| suspended | 200 | 200 | No change |
| inactive | 210 | 210 | No change |

---

## Impact Analysis

### Files Requiring Updates (16 files identified)

#### Core Constants (2 files)
| File | Changes Required |
|------|-----------------|
| `src/constants/lifecycle.constants.ts` | Remove `verified`, rename `not_verified` → `not_certified`, update ranks and display names |
| `src/constants/certification.constants.ts` | No changes (uses outcomes, not statuses) |

#### Services (2 files)
| File | Changes Required |
|------|-----------------|
| `src/services/lifecycleService.ts` | Update TERMINAL_STATES, VIEW_ONLY_STATES, function logic |
| `src/services/enrollmentDeletionService.ts` | Update `terminalStatuses` array |

#### Hooks (3 files)
| File | Changes Required |
|------|-----------------|
| `src/hooks/queries/useLifecycleValidation.ts` | Update `terminalStatuses` check |
| `src/hooks/queries/useFinalResultData.ts` | Update certification status derivation logic |
| `src/hooks/queries/useCandidateExpertise.ts` | Check for `verified` references (may be different context) |

#### Components (6 files)
| File | Changes Required |
|------|-----------------|
| `src/pages/enroll/Certification.tsx` | Remove `verified` case, update `not_verified` → `not_certified` |
| `src/pages/Dashboard.tsx` | Update TERMINAL_STATUSES, status icons, badge variants |
| `src/components/layout/WizardStepper.tsx` | Update display names |
| `src/components/layout/EnrollmentSwitcher.tsx` | Update TERMINAL_STATUSES |
| `src/components/enrollment/IndustryEnrollmentSelector.tsx` | Update status checks |
| `src/components/reviewer/candidates/CandidateFilters.tsx` | Update filter options |
| `src/components/reviewer/candidates/CandidateCard.tsx` | Update status badge logic |
| `src/components/reviewer/candidates/CandidateProfileHeader.tsx` | Update status badge logic |

#### Tests (3 files)
| File | Changes Required |
|------|-----------------|
| `src/test/lifecycle-governance.test.ts` | Update terminal status tests, rank expectations |
| `src/test/lifecycle-integration.test.ts` | Update status references |
| `src/test/fixtures/provider-fixtures.ts` | Update status type and fixtures |

---

## Database Migration Required

### Challenge: PostgreSQL Enum Limitations
PostgreSQL does NOT support:
- Renaming enum values directly
- Removing enum values

### Solution: Text Column Migration
Since renaming/removing enum values is complex, we'll use a safer approach:

```sql
-- Migration: Merge verified → certified, Rename not_verified → not_certified

-- Step 1: Update existing data BEFORE modifying enum
-- Migrate any records with 'verified' to 'certified'
UPDATE solution_providers 
SET lifecycle_status = 'certified', lifecycle_rank = 140
WHERE lifecycle_status = 'verified';

UPDATE provider_industry_enrollments 
SET lifecycle_status = 'certified', lifecycle_rank = 140
WHERE lifecycle_status = 'verified';

-- Step 2: Add new enum value 'not_certified'
ALTER TYPE lifecycle_status ADD VALUE IF NOT EXISTS 'not_certified' AFTER 'certified';

-- Step 3: Migrate 'not_verified' → 'not_certified'
UPDATE solution_providers 
SET lifecycle_status = 'not_certified', lifecycle_rank = 150
WHERE lifecycle_status = 'not_verified';

UPDATE provider_industry_enrollments 
SET lifecycle_status = 'not_certified', lifecycle_rank = 150
WHERE lifecycle_status = 'not_verified';

-- Note: 'verified' and 'not_verified' remain in enum (PostgreSQL limitation)
-- but are no longer used. Application code will not reference them.
```

---

## Detailed Implementation Steps

### Phase 1: Database Migration

**Task 1.1: Create Migration Script**
- Add `not_certified` enum value
- Migrate existing `verified` records → `certified`
- Migrate existing `not_verified` records → `not_certified`
- Update lifecycle_rank values accordingly

### Phase 2: Update Constants & Services

**Task 2.1: Update `src/constants/lifecycle.constants.ts`**
```typescript
// Remove 'verified' from LIFECYCLE_RANKS
// Rename 'not_verified' → 'not_certified'
// Update ranks: certified = 140, not_certified = 150

export const LIFECYCLE_RANKS: Record<string, number> = {
  // ... earlier statuses unchanged ...
  panel_completed: 130,
  active: 135,           // Moved up from 145
  certified: 140,        // Was 150, now primary success state
  not_certified: 150,    // Renamed from not_verified (was 160)
  suspended: 200,
  inactive: 210,
};

export const TERMINAL_STATES = ['certified', 'not_certified', 'suspended', 'inactive'] as const;
export const VIEW_ONLY_STATES = ['certified', 'not_certified'] as const;

export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  // ... update to remove 'verified', add 'not_certified' ...
  certified: 'Certified',
  not_certified: 'Not Certified',  // Renamed
};
```

**Task 2.2: Update `src/services/lifecycleService.ts`**
- Update function logic to use new status names
- Update lock threshold (EVERYTHING = 140 for certified)

### Phase 3: Update UI Components

**Task 3.1: Update `src/pages/enroll/Certification.tsx`**
- Remove `case 'verified'` switch case
- Change `case 'not_verified'` → `case 'not_certified'`
- Update display text from "Not Verified" to "Not Certified"

**Task 3.2: Update `src/pages/Dashboard.tsx`**
- Update `TERMINAL_STATUSES` array
- Update `getStatusIcon()` function
- Update `getStatusBadgeVariant()` function
- Update conditional styling for `not_certified`

**Task 3.3: Update Other Components**
- `WizardStepper.tsx` - Display names
- `EnrollmentSwitcher.tsx` - Terminal statuses
- `IndustryEnrollmentSelector.tsx` - Status checks
- `CandidateFilters.tsx` - Filter options
- `CandidateCard.tsx` - Badge logic
- `CandidateProfileHeader.tsx` - Badge logic

### Phase 4: Update Hooks

**Task 4.1: Update `src/hooks/queries/useFinalResultData.ts`**
```typescript
// Before:
if (lifecycleStatus === 'verified' || lifecycleStatus === 'certified') {
  certificationStatus = 'Certified';
} else if (lifecycleStatus === 'not_verified') {
  certificationStatus = 'Not Verified';
}

// After:
if (lifecycleStatus === 'certified') {
  certificationStatus = 'Certified';
} else if (lifecycleStatus === 'not_certified') {
  certificationStatus = 'Not Certified';
}
```

**Task 4.2: Update `src/hooks/queries/useLifecycleValidation.ts`**
- Update `terminalStatuses` array

**Task 4.3: Update `src/services/enrollmentDeletionService.ts`**
- Remove 'verified' from terminal check (only 'certified' now)

### Phase 5: Update Tests

**Task 5.1: Update Test Files**
- `lifecycle-governance.test.ts` - Update assertions
- `lifecycle-integration.test.ts` - Update status references
- `provider-fixtures.ts` - Update type definitions and fixtures

---

## Final Status Matrix (Simplified)

| Status | Rank | Meaning | Terminal? |
|--------|------|---------|-----------|
| panel_completed | 130 | Interview panel done | No |
| active | 135 | Active on platform (rarely used) | No |
| **certified** | 140 | ✅ SUCCESS - Passed all stages | Yes |
| **not_certified** | 150 | ❌ FAILED - Did not meet threshold | Yes |
| suspended | 200 | Account suspended | Yes |
| inactive | 210 | Account inactive | Yes |

---

## Verification Checklist

After implementation, verify:
- [ ] No references to `'verified'` as lifecycle_status in code
- [ ] No references to `'not_verified'` in code
- [ ] All tests pass with updated assertions
- [ ] Database has no records with old status values
- [ ] UI displays "Certified" and "Not Certified" correctly
- [ ] Lock thresholds work correctly at rank 140

---

## Technical Considerations

### Note on `verification_status` Field
The `verification_status` field on `solution_providers` table (`pending`, `in_progress`, `verified`, `rejected`) is **SEPARATE** from `lifecycle_status`. This field:
- Uses a different enum (`verification_status` not `lifecycle_status`)
- Is about proof point/credential verification process
- Will NOT be changed in this implementation
- The value `verified` in `verification_status` enum is unrelated to lifecycle

### Note on `ExpertiseLevelHeader.tsx`
The `verified` references in reviewer candidate components refer to `expertise_review_status` (proof point review), NOT lifecycle. These will NOT be changed.

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Database | 1 migration | Low |
| Phase 2: Constants/Services | 2-3 files | Low |
| Phase 3: UI Components | 8 files | Medium |
| Phase 4: Hooks | 3 files | Low |
| Phase 5: Tests | 3 files | Low |

**Total: ~16 files, straightforward search-and-replace with careful attention to enum handling**
