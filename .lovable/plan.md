

# Critical Audit: Project Knowledge Compliance, Performance & Dead Code

## Audit Summary

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Breakpoint violations (`md:` instead of `lg:`) | 31 files, ~200 instances | Medium |
| Missing `.select("columns")` (using bare `.select()`) | 51 files, ~550 instances | Medium |
| Missing `.limit()` safety caps on list queries | ~15 hooks | Medium |
| `useRestoreFormFromRecovery` never called | 1 dead export | Low |
| Deprecated hooks still exported | 2 exports in `useSlmRoleCodes.ts` | Low |
| `console.*` in production code | 0 (only in test files + errorHandler — compliant) | None |
| `withCreatedBy`/`withUpdatedBy` coverage | 53 files — broadly adopted | Compliant |
| `handleMutationError` coverage | 90 files — broadly adopted | Compliant |
| `FeatureErrorBoundary` usage | 43 files — broadly adopted | Compliant |

---

## Issue 1: Responsive Breakpoint Violations (31 files)

**Standard**: Project Knowledge v2.0 Rule 6 — Use `lg:` (1024px) for all responsive layout transitions, not `md:` (768px).

**Scope**: 31 files across `src/pages` and `src/components` use `md:grid-cols-*`, `md:flex`, `md:block`, `md:hidden` for layout transitions. The `src/components/ui/sidebar.tsx` is excluded as it's a shadcn primitive.

**Affected files** (non-UI-library, layout-transition usage):
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/SmokeTestPage.tsx`
- `src/pages/admin/invitations/InvitationsPage.tsx`
- `src/pages/admin/academic-taxonomy/AcademicTaxonomyPage.tsx`
- `src/pages/admin/question-bank/QuestionBankPage.tsx`
- `src/pages/admin/interview-requirements/ReviewerInviteForm.tsx`
- `src/pages/admin/reviewer-availability/SlotFilters.tsx`
- `src/pages/admin/reviewer-availability/SummaryCards.tsx`
- `src/pages/admin/level-speciality-map/LevelSpecialityMapPage.tsx`
- `src/pages/enroll/PostEnrollmentWelcome.tsx`
- `src/pages/enroll/Assessment.tsx`
- `src/pages/provider/RegressionTestPage.tsx`
- `src/pages/provider/LifecycleRulesPage.tsx`
- `src/components/reviewer/candidates/ExpertiseReviewActions.tsx`
- `src/components/reviewer/candidates/FinalResultTabContent.tsx`
- `src/components/reviewer/candidates/TimezoneInfoPanel.tsx`
- `src/components/reviewer/candidates/SlotDetailsCard.tsx`
- `src/components/reviewer/candidates/OrganizationDetailsSection.tsx`
- `src/components/reviewer/candidates/AssessmentTabContent.tsx`
- `src/components/reviewer/candidates/ProofPointsScoreHeader.tsx`
- `src/components/reviewer/candidates/ProviderDetailsSection.tsx`
- `src/components/reviewer/interview-kit/InterviewKitSummaryDashboard.tsx`
- `src/components/interview/InterviewCalendar.tsx`
- `src/components/proof-points/WhyProofPointsMatter.tsx`
- `src/components/assessment/ResultsSummaryHeader.tsx`

**Fix**: Batch find-replace `md:grid-cols` → `lg:grid-cols`, `md:flex` → `lg:flex`, etc. across all 31 files. Exclude `sm:` and `src/components/ui/` (shadcn components use their own conventions).

---

## Issue 2: Bare `.select()` in Mutations (51 files, ~550 instances)

**Standard**: Project Knowledge v2.0 Rule 5 — Explicit column selections in all database queries.

**Current**: Most INSERT/UPDATE mutations use `.select().single()` without specifying columns. This returns all columns including potentially sensitive audit fields.

**Fix**: For each mutation's `.select().single()`, replace with `.select("id, ...needed_columns").single()`. Since most mutations only need the `id` back, the minimal fix is `.select("id").single()`.

**Priority**: Medium — functional but violates explicit column standard. Address in a dedicated cleanup pass across all 51 hook files.

---

## Issue 3: Missing `.limit()` Safety Caps on List Queries

**Standard**: Performance Optimization Patterns — Add `.limit(200)` safety caps to all list queries.

**Affected hooks** (list queries without `.limit()`):
- `useRoleAssignments` (line 52)
- `usePendingChallengeRefs` (line 36) — filtered by `is_resolved=false`, low risk
- `useDelegatedAdmins` — check if limited
- Various master data hooks that query full tables (countries, industries, etc.) — acceptable for small reference tables

**Fix**: Add `.limit(200)` to `useRoleAssignments` and any other org-scoped list queries that could grow unbounded.

---

## Issue 4: Dead Code — `useRestoreFormFromRecovery` Never Called

**Context**: Phase 8A session recovery has two parts: `useSessionExpiryWatcher` (saves form data on sign-out) and `useRestoreFormFromRecovery` (restores on re-login). The watcher is wired into `AssignMemberModal`, but the restore hook is never imported or called anywhere.

**Fix**: Import and call `useRestoreFormFromRecovery("assign-member")` in `AssignMemberModal` on mount. If recovery data exists, pre-populate `selectedRole` and `selectedMemberId` from the recovered state, then clear recovery data.

---

## Issue 5: Deprecated Hook Exports Still Present

**Hooks**: `useSlmPoolRoles()` and `useOrgCoreRoles()` in `useSlmRoleCodes.ts` are marked `@deprecated` with zero remaining consumers.

**Fix**: Remove both exported functions. They're dead code taking up space.

---

## Issue 6: No Performance Concerns with Current Query Architecture

**Verified compliant**:
- Global `staleTime: 30s` and `gcTime: 5min` in `queryClient.ts` — prevents refetch storms
- `refetchOnWindowFocus: false` — prevents tab-return thrashing
- `useAdminSidebarCounts` consolidates sidebar queries
- `.limit()` applied on high-traffic hooks (`usePoolMembers: 200`, `useUnifiedPulseFeed`, etc.)
- `useVisibilityPollingInterval` used for background metrics
- `enabled:` pattern used for conditional queries

---

## Implementation Plan

### Step 1: Replace `md:` breakpoints with `lg:` (batch operation across 25+ files)
Mechanical find-replace in layout-transition contexts only. Skip `sm:` and UI primitives.

### Step 2: Remove deprecated hook exports
Delete `useSlmPoolRoles` and `useOrgCoreRoles` from `useSlmRoleCodes.ts`.

### Step 3: Wire `useRestoreFormFromRecovery` into `AssignMemberModal`
Add mount-time check for recovered form data, pre-populate state, show toast "Form data restored from previous session".

### Step 4: Add `.limit(200)` to unbounded list queries
Target: `useRoleAssignments` and any similar org-scoped list hooks.

### Step 5: (Deferred) Explicit column selects on mutations
Lower priority — functional correctness is not affected. Can be addressed as a separate cleanup sprint across 51 files.

