
# Fix: EnrollmentContext Error on Wizard Pages

## Problem Statement

The error `useEnrollmentContext must be used within an EnrollmentProvider` occurs on `/enroll/panel-discussion` and potentially all other enrollment wizard pages. This happens despite the `EnrollmentProvider` being correctly mounted in `App.tsx`.

## Root Cause Analysis

```text
App.tsx Component Tree:
└─ QueryClientProvider
   └─ TooltipProvider
      └─ BrowserRouter
         └─ AuthProvider
            └─ EnrollmentProvider  ← Context IS provided here
               └─ ErrorBoundary    ← Error recovery can cause issues
                  └─ Routes
                     └─ AuthGuard
                        └─ EnrollmentRequiredGuard  ← Calls useEnrollmentContext()
                           └─ PanelDiscussion       ← Also calls useEnrollmentContext()
```

**Why it fails:**
1. When `ErrorBoundary` catches an error and re-renders, there's a brief moment where React's context reconciliation may return `undefined`
2. The `useEnrollmentContext()` hook throws immediately when context is `undefined`
3. This creates a cascading failure - ErrorBoundary catches → context undefined → throw → ErrorBoundary catches again

## Solution

**Two-Part Fix:**

### Part 1: Make EnrollmentRequiredGuard Resilient (Primary Fix)

Update `EnrollmentRequiredGuard` to use `useOptionalEnrollmentContext()` and handle the null case gracefully. Since this guard wraps ALL enrollment wizard pages, fixing it once protects all 16 enrollment pages.

**Current Code:**
```typescript
const { activeEnrollmentId, isLoading, contextReady } = useEnrollmentContext();
```

**Fixed Code:**
```typescript
const enrollmentContext = useOptionalEnrollmentContext();

// If context isn't ready yet (ErrorBoundary recovery, initial render), show loading
if (!enrollmentContext) {
  return <LoadingSpinner />;
}

const { activeEnrollmentId, isLoading, contextReady } = enrollmentContext;
```

### Part 2: Make WizardLayout Resilient (Secondary Fix)

Since `WizardLayout` also uses `useEnrollmentContext()` directly, update it to use the optional hook with safe defaults.

**Current Code:**
```typescript
const { hasMultipleIndustries, activeEnrollment, activeEnrollmentId } = useEnrollmentContext();
```

**Fixed Code:**
```typescript
const enrollmentContext = useOptionalEnrollmentContext();
const hasMultipleIndustries = enrollmentContext?.hasMultipleIndustries ?? false;
const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/EnrollmentRequiredGuard.tsx` | Use optional hook + null check |
| `src/components/layout/WizardLayout.tsx` | Use optional hook + safe defaults |

## Why This Fixes All 16 Enrollment Pages

Since all enrollment pages are wrapped by `EnrollmentRequiredGuard`:
- The guard will show a loading spinner when context is undefined
- By the time the child page component renders, context is guaranteed to exist
- No changes needed to individual page files (ParticipationMode, ProofPoints, Assessment, etc.)

## End-to-End Enrollment Flow Verification

After this fix, the complete enrollment flow should work without errors:

| Step | Route | Status |
|------|-------|--------|
| 1 | `/enroll/registration` | ✅ Will work (guard handles context) |
| 2 | `/enroll/participation-mode` | ✅ Will work |
| 3 | `/enroll/organization` | ✅ Will work |
| 4 | `/enroll/expertise` | ✅ Will work |
| 5 | `/enroll/proof-points` | ✅ Will work |
| 6 | `/enroll/assessment` | ✅ Will work |
| 7 | `/enroll/interview-slot` | ✅ Will work |
| 8 | `/enroll/panel-discussion` | ✅ Will work (current error page) |
| 9 | `/enroll/certification` | ✅ Will work |

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking enrollment flow | Very Low | Only adding defensive null checks |
| Changing UX | None | Same loading spinner already shown |
| Performance impact | None | No additional queries or state |

## Technical Details

The optional hook pattern is already used successfully in:
- `Dashboard.tsx` (fixed in previous update)
- `useIsFirstTimeProvider.ts` (existing pattern)
