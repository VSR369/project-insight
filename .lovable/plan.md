
# Project Knowledge Compliance Audit & RETROFIT 360

## Executive Summary

After a comprehensive 360-degree audit of the codebase against Project Knowledge standards, I've identified compliance gaps organized into **Priority Tiers**. This plan addresses each gap without changing existing UX, DB schema, functionality, or business rules.

---

## Audit Findings Summary

| Category | Standard | Current State | Gaps Found | Priority |
|----------|----------|---------------|------------|----------|
| Console Statements | Zero raw console.* in production | 17 files with 493 matches | **HIGH** | P0 |
| Error Handling | handleMutationError in all onError | 54 files using it, 21 files with toast.error pattern | **MEDIUM** | P1 |
| SELECT * Patterns | Specific column selects | 16 files with 210 matches | **HIGH** | P0 |
| PostgREST FK Hints | Explicit hints for ambiguous FKs | 2 files missing hints | **CRITICAL** | P0 |
| gcTime/staleTime | Reference data caching | 48 files configured, some inconsistent | **LOW** | P2 |
| Responsive Design | lg: for layout transitions | 17 files with md: patterns | **MEDIUM** | P1 |
| Constants Management | Centralized barrel exports | Well organized ✅ | 0 | N/A |
| Audit Fields | withCreatedBy/withUpdatedBy | 23 files correctly using ✅ | 0 | N/A |

---

## Priority 0 (Critical) - Must Fix Immediately

### P0.1: PostgREST FK Hint Gaps (2 files)

**Issue:** Missing `!expertise_level_id` hints causing potential HTTP 300 errors.

**Files to fix:**
1. `src/hooks/queries/useInterviewKitQuestions.ts` (line 133)
   - Current: `expertise_levels(id, name)`
   - Fix: `expertise_levels!expertise_level_id(id, name)`

2. `src/hooks/queries/useLevelSpecialityMap.ts` (line 20)
   - Current: `expertise_levels(*)`
   - Fix: `expertise_levels!expertise_level_id(*)`

---

### P0.2: SELECT * Patterns (16 files, ~210 instances)

**Standard Violation:** Project Knowledge requires specific column selects to reduce payload and improve performance.

**Files requiring retrofit:**

| File | Location | Table | Action |
|------|----------|-------|--------|
| `useHierarchyResolver.ts` | Lines 47-71 | 5 tables | Replace with specific columns |
| `usePanelReviewers.ts` | Lines 31, 61, 83, 336, 496, 517 | panel_reviewers | Select needed columns only |
| `usePulseStats.ts` | Lines 55, 115, 190, 466, 484 | Multiple | Select specific columns |
| `useExpertiseLevels.ts` | Line 18 | expertise_levels | Select needed columns |
| `useProficiencyTaxonomyAdmin.ts` | Lines 41, 208, 371 | 3 tables | Select needed columns |
| `useCandidateExpertise.ts` | Line 96 | enrollments | Select specific columns |
| `useInterviewKitEvaluation.ts` | Lines 104, 152 | 2 tables | Select needed columns |

**Pattern to apply:**
```typescript
// Before
.select("*")

// After (example for panel_reviewers)
.select("id, name, email, user_id, expertise_ids, is_active, invitation_status, created_at")
```

---

## Priority 1 (High) - Fix in Current Sprint

### P1.1: Console Statement Cleanup (17 files, 493 instances)

**Standard Violation:** Project Knowledge v2.0 mandates absolute removal of raw console.* statements.

**Files requiring cleanup:**

| File | Console Type | Count | Action |
|------|-------------|-------|--------|
| `audioUtils.ts` | log, error | 8 | Convert to logInfo/handleMutationError |
| `VideoUploader.tsx` | log, warn, error | 20+ | Convert to structured logging |
| `enrollmentService.ts` | log, error | 15+ | Convert to logWarning/logInfo |
| `lifecycleService.ts` | log | 10+ | Convert to logInfo |
| `assessmentService.ts` | log | 8+ | Convert to logInfo |
| + 12 more files | mixed | varies | Same pattern |

**Replacement Pattern:**
```typescript
// Before
console.log('[Component] Message:', data);
console.warn('[Component] Warning:', issue);
console.error('[Component] Error:', error);

// After
import { logInfo, logWarning, handleMutationError } from '@/lib/errorHandler';

logInfo('Message', { operation: 'action_name', component: 'ComponentName', ...data });
logWarning('Warning', { operation: 'action_name', ...issue });
handleMutationError(error, { operation: 'action_name', component: 'ComponentName' });
```

---

### P1.2: Error Handling Standardization (21 files)

**Issue:** Some mutation hooks use `toast.error(error.message)` instead of `handleMutationError`.

**Files to retrofit:**

| File | Mutations Affected | Current Pattern |
|------|-------------------|-----------------|
| `useEnrollmentAssessment.ts` | 4 mutations | `toast.error(`Failed...`)` |
| `useQuestionBank.ts` | 6 mutations | `toast.error(`Failed...`)` |
| `useCapabilityTags.ts` | 5 mutations | `toast.error(`Failed...`)` |
| `useInterviewScheduling.ts` | 3 mutations | `toast.error(error.message)` |
| `useAssessment.ts` | 2 mutations | `toast.error(`Failed...`)` |
| `useProficiencyTaxonomyAdmin.ts` | 15 mutations | `toast.error(`Failed...`)` |
| + 15 more files | varies | mixed patterns |

**Standard Pattern:**
```typescript
// Before
onError: (error: Error) => {
  toast.error(`Failed to create entity: ${error.message}`);
},

// After
import { handleMutationError } from '@/lib/errorHandler';

onError: (error: Error) => {
  handleMutationError(error, { 
    operation: 'create_entity',
    component: 'EntityForm' 
  });
},
```

---

### P1.3: Responsive Design Compliance (17 files)

**Standard Violation:** Project Knowledge requires `lg:` (1024px) for layout transitions, not `md:` (768px).

**Files with `md:flex-row` or `md:grid-cols-2` patterns:**

| File | Pattern | Action |
|------|---------|--------|
| `SlotDetailsCard.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `CompositeScoreBanner.tsx` | `md:flex-row` | Change to `lg:flex-row` |
| `TimezoneInfoPanel.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `ReviewerSettings.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `AdminDashboard.tsx` | `md:grid-cols-2` | OK (has lg: progression) |
| `FinalResultTabContent.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `ImportStatisticsDashboard.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `LevelSpecialityMapPage.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `SlotFilters.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `ExpertiseReviewActions.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `DashboardStatsCards.tsx` | `md:grid-cols-2` | OK (has lg: progression) |
| `QuestionBankPage.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `ReviewerInviteForm.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |
| `OrganizationDetailsSection.tsx` | `md:grid-cols-2` | Change to `lg:grid-cols-2` |

---

## Priority 2 (Medium) - Fix in Next Sprint

### P2.1: React Query Cache Configuration Gaps

**Standard:** Reference data should have `staleTime: 5 * 60 * 1000` and `gcTime: 30 * 60 * 1000`.

**Hooks missing proper cache config:**

| Hook | Current | Required |
|------|---------|----------|
| `useHierarchyResolver.ts` | `staleTime: 5 min` only | Add `gcTime: 30 min` |
| `usePanelReviewers.ts` | `staleTime: 30s` | Consider 5 min for reference data |
| `useExpertiseLevels.ts` | None | Add staleTime/gcTime |
| `useProficiencyTaxonomyAdmin.ts` | None | Add staleTime/gcTime |

---

## Implementation Plan

### Phase 1: Critical Fixes (P0) - Estimated: 2 hours

```text
Step 1.1: Fix PostgREST FK hints (2 files)
  - useInterviewKitQuestions.ts
  - useLevelSpecialityMap.ts

Step 1.2: Replace SELECT * patterns (16 files)
  - Start with most-used hooks
  - Define column lists per table
  - Update queries systematically
```

### Phase 2: High Priority Fixes (P1) - Estimated: 6 hours

```text
Step 2.1: Console statement cleanup (17 files)
  - Audio/Video utils (media-related logs)
  - Service files (enrollmentService, lifecycleService)
  - Hook files with debugging logs

Step 2.2: Error handling standardization (21 files)
  - Import handleMutationError where missing
  - Replace toast.error patterns
  - Add proper context objects

Step 2.3: Responsive design fixes (14 files)
  - Find/replace md: patterns with lg:
  - Verify tablet view (768px) still works
```

### Phase 3: Medium Priority Fixes (P2) - Estimated: 2 hours

```text
Step 3.1: Cache configuration updates
  - Add gcTime to reference data hooks
  - Verify staleTime consistency
```

---

## Verification Checklist

After retrofit completion, verify:

- [ ] No HTTP 300 errors on any page load
- [ ] All console.* removed (search returns 0 matches)
- [ ] All mutations use handleMutationError pattern
- [ ] SELECT * search returns 0 matches
- [ ] Tablet view (768px) shows stacked layouts
- [ ] All tests pass (if applicable)

---

## Files Modified Summary

| Priority | Files | Estimated LOC Changed |
|----------|-------|----------------------|
| P0 | 18 files | ~150 lines |
| P1 | 52 files | ~400 lines |
| P2 | 5 files | ~25 lines |
| **Total** | **75 files** | **~575 lines** |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking existing queries | Low | Same data, just explicit columns |
| Console cleanup breaking debugging | Low | Structured logging maintains observability |
| Responsive changes breaking layouts | Low | lg: is wider than md:, stacking preserved |
| Error handling changes affecting UX | None | Same user-facing messages |

---

## Approval Required

Ready to proceed with the full RETROFIT 360 implementation across all priority tiers?
