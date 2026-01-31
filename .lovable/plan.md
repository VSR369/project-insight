

# Project Knowledge Compliance & Dead Code Retrofit Audit

## Executive Summary

Based on my comprehensive analysis of the codebase against the Project Knowledge Standards (v2.0), I identified:
- **23 files** with console statement violations
- **18+ hooks** missing `handleMutationError` (using direct `toast.error` instead)
- **1 file** with deprecated function usage in production code
- **2 TODOs** marked for production removal
- **1 unused hook file** (potential dead code)
- **1 constants file** not re-exported from index

---

## Part 1: Project Knowledge Compliance Issues

### 1.1 Console Statement Violations (CRITICAL)

**Standard Violated**: Section 5 - Console Cleanup Rules

| File | Console Type | Count | Violation |
|------|-------------|-------|-----------|
| `src/services/cascadeResetService.ts` | `console.warn` | 3 | Deprecated warnings (acceptable for deprecation) |
| `src/services/interviewKitGenerationService.ts` | `console.error` | 2 | Should use `handleMutationError` |
| `src/services/questionGenerationService.ts` | `console.error` | 1 | Should use `logWarning` |
| `src/pages/public/ManagerApprovalDashboard.tsx` | `console.error` | 1 | Should use `handleMutationError` |
| `src/components/ErrorBoundary.tsx` | `console.error` | 1 | Acceptable (fallback for clipboard) |
| `src/components/layout/WizardLayout.tsx` | `console.log` | 1 | **Debug statement - must remove** |
| `src/pages/admin/academic-taxonomy/AcademicTreePreview.tsx` | `console.error` | 1 | Should use `handleMutationError` |
| `src/components/pulse/creators/CameraSelector.tsx` | `console.error` | 1 | Should use `logWarning` |
| `src/pages/NotFound.tsx` | `console.error` | 1 | Acceptable (404 tracking) |
| `src/pages/enroll/TakeAssessment.tsx` | `console.error` | 5 | Should use `handleMutationError` |
| `src/components/enrollment/EnrollmentDeleteDialog.tsx` | `console.error` | 1 | Should use `handleMutationError` |
| `src/components/pulse/creators/videoUtils.ts` | `console.log/warn/error` | 4 | Should use structured logging |

### 1.2 Error Handling Non-Compliance (MEDIUM)

**Standard Violated**: Section 4 - Error Handling Standardization

The following hooks use `toast.error(\`Failed...${error.message}\`)` instead of `handleMutationError`:

| File | Mutations Affected |
|------|-------------------|
| `useCountries.ts` | 6 mutations |
| `useParticipationModes.ts` | 5 mutations |
| `useInterviewQuorumAdmin.ts` | 4 mutations |
| `useLevelSpecialityMap.ts` | 3 mutations |
| `useExpertiseLevels.ts` | ~5 mutations |
| `useOrganizationTypes.ts` | ~5 mutations |
| `usePanelReviewers.ts` | ~5 mutations |
| `useAcademicTaxonomy.ts` | ~8 mutations |
| `useAssessmentQuestions.ts` | 1 mutation (line 45) |
| `useEnrollmentAssessment.ts` | 4 mutations |

**Fix Pattern**:
```typescript
// FROM
onError: (error: Error) => {
  toast.error(`Failed to create country: ${error.message}`);
}

// TO
onError: (error: Error) => {
  handleMutationError(error, { operation: 'create_country' });
}
```

### 1.3 Constants Index Missing Export (LOW)

**Standard Violated**: Section 1 - Constants Extraction Pattern

File `src/constants/pulseCards.constants.ts` exists but is NOT re-exported in `src/constants/index.ts`.

**Current index.ts**:
```typescript
export * from './lifecycle.constants';
export * from './assessment.constants';
export * from './question-generation.constants';
export * from './import.constants';
export * from './interview-kit.constants';
export * from './certification.constants';
export * from './pulse.constants';
// MISSING: export * from './pulseCards.constants';
```

### 1.4 Deprecated Function Usage in Production (MEDIUM)

**Standard Violated**: Section 7 - Audit Fields Pattern (clean code)

File `src/hooks/queries/useProvider.ts` uses 3 deprecated functions:
- `getCascadeImpactCounts()` (lines 88, 248)
- `executeIndustryChangeReset()` (line 106)
- `executeExpertiseLevelChangeReset()` (line 265)

These should be migrated to V2 enrollment-scoped versions.

---

## Part 2: Dead Code / Retrofit Items

### 2.1 TODO Items Marked for Removal

| File | Line | TODO |
|------|------|------|
| `src/pages/Register.tsx` | 232 | `TODO(ADMIN-ACCESS): Implement admin access code validation` |
| `src/pages/enroll/TakeAssessment.tsx` | 341, 576 | `TODO: Remove before production - temporary debugging feature` |

### 2.2 Potentially Unused Hook File

File `src/hooks/queries/useHierarchyResolverOptimized.ts` has **zero imports** across the entire codebase.

**Recommendation**: Verify if this is dead code or reserved for future use. If unused, mark for removal.

### 2.3 Deprecated Test File Usage

File `src/test/lifecycle-integration.test.ts` uses deprecated functions. This is **acceptable** for testing backward compatibility but should be updated when deprecated functions are removed.

---

## Part 3: Implementation Plan

### Phase 1: Critical Console Cleanup (Priority: HIGH)

**Files to modify**: 10 files

1. **Remove debug console.log**:
   - `src/components/layout/WizardLayout.tsx` (line 335) - Remove entirely

2. **Replace console.error with handleMutationError**:
   - `src/services/interviewKitGenerationService.ts`
   - `src/services/questionGenerationService.ts`
   - `src/pages/public/ManagerApprovalDashboard.tsx`
   - `src/pages/admin/academic-taxonomy/AcademicTreePreview.tsx`
   - `src/pages/enroll/TakeAssessment.tsx` (5 instances)
   - `src/components/enrollment/EnrollmentDeleteDialog.tsx`

3. **Replace with logWarning**:
   - `src/components/pulse/creators/CameraSelector.tsx`
   - `src/components/pulse/creators/videoUtils.ts`

### Phase 2: Hook Error Handling Standardization (Priority: MEDIUM)

**Files to modify**: 10 hook files

Update each mutation's `onError` callback to use `handleMutationError`:
1. `useCountries.ts`
2. `useParticipationModes.ts`
3. `useInterviewQuorumAdmin.ts`
4. `useLevelSpecialityMap.ts`
5. `useExpertiseLevels.ts`
6. `useOrganizationTypes.ts`
7. `usePanelReviewers.ts`
8. `useAcademicTaxonomy.ts`
9. `useAssessmentQuestions.ts`
10. `useEnrollmentAssessment.ts`

### Phase 3: Constants Index Fix (Priority: LOW)

**File**: `src/constants/index.ts`

Add missing export:
```typescript
export * from './pulseCards.constants';
```

### Phase 4: Deprecated Function Migration (Priority: MEDIUM)

**File**: `src/hooks/queries/useProvider.ts`

Migrate from provider-scoped to enrollment-scoped cascade functions. This requires careful testing as it affects industry/expertise change workflows.

### Phase 5: Dead Code Removal (Priority: LOW)

1. **Remove TODO debug feature** in TakeAssessment.tsx (PDF download button)
2. **Evaluate** `useHierarchyResolverOptimized.ts` for removal
3. **Document** admin access code TODO as pending feature

---

## Summary: Changes by File

| File | Change Type | Risk |
|------|-------------|------|
| `WizardLayout.tsx` | Remove debug log | Low |
| `interviewKitGenerationService.ts` | Replace console.error | Low |
| `questionGenerationService.ts` | Replace console.error | Low |
| `ManagerApprovalDashboard.tsx` | Replace console.error | Low |
| `AcademicTreePreview.tsx` | Replace console.error | Low |
| `TakeAssessment.tsx` | Replace 5 console.error + remove TODO | Medium |
| `EnrollmentDeleteDialog.tsx` | Replace console.error | Low |
| `CameraSelector.tsx` | Replace console.error | Low |
| `videoUtils.ts` | Replace 4 console statements | Low |
| `useCountries.ts` | Add handleMutationError | Low |
| `useParticipationModes.ts` | Add handleMutationError | Low |
| `useInterviewQuorumAdmin.ts` | Add handleMutationError | Low |
| `useLevelSpecialityMap.ts` | Add handleMutationError | Low |
| `useExpertiseLevels.ts` | Add handleMutationError | Low |
| `useOrganizationTypes.ts` | Add handleMutationError | Low |
| `usePanelReviewers.ts` | Add handleMutationError | Low |
| `useAcademicTaxonomy.ts` | Add handleMutationError | Low |
| `useAssessmentQuestions.ts` | Add handleMutationError | Low |
| `useEnrollmentAssessment.ts` | Add handleMutationError | Low |
| `index.ts` (constants) | Add export | None |
| `useProvider.ts` | Migrate to V2 functions | Medium |
| `useHierarchyResolverOptimized.ts` | Evaluate for removal | Low |

---

## Expected Outcomes

After implementation:
- **Zero** raw console statements in production code
- **100%** mutation error handling compliance
- **All** constants properly exported via barrel file
- **No** deprecated functions in production code paths
- **No** TODO items marked for production removal

---

## Files to Modify (25 total)

1. `src/components/layout/WizardLayout.tsx`
2. `src/services/interviewKitGenerationService.ts`
3. `src/services/questionGenerationService.ts`
4. `src/pages/public/ManagerApprovalDashboard.tsx`
5. `src/pages/admin/academic-taxonomy/AcademicTreePreview.tsx`
6. `src/pages/enroll/TakeAssessment.tsx`
7. `src/components/enrollment/EnrollmentDeleteDialog.tsx`
8. `src/components/pulse/creators/CameraSelector.tsx`
9. `src/components/pulse/creators/videoUtils.ts`
10. `src/hooks/queries/useCountries.ts`
11. `src/hooks/queries/useParticipationModes.ts`
12. `src/hooks/queries/useInterviewQuorumAdmin.ts`
13. `src/hooks/queries/useLevelSpecialityMap.ts`
14. `src/hooks/queries/useExpertiseLevels.ts`
15. `src/hooks/queries/useOrganizationTypes.ts`
16. `src/hooks/queries/usePanelReviewers.ts`
17. `src/hooks/queries/useAcademicTaxonomy.ts`
18. `src/hooks/queries/useAssessmentQuestions.ts`
19. `src/hooks/queries/useEnrollmentAssessment.ts`
20. `src/constants/index.ts`
21. `src/hooks/queries/useProvider.ts`

**Optional removal**:
22. `src/hooks/queries/useHierarchyResolverOptimized.ts`

