

# Compliance Gap Fix Plan — Enterprise Architecture Reference v4.0

## Scope
Fix all identified compliance gaps across the codebase against the Project Knowledge Standards. Excludes test files (`src/test/`) and edge functions (`supabase/functions/`) — edge function logging follows different patterns (server-side).

---

## GAP 1: Raw `console.log` in Production Code (§11.5, §25)

**Rule**: No `console.log` in production. Use structured logging or remove.

**Files to fix** (excluding `errorHandler.ts` which is the logging infra itself, and test files):

| File | Lines | Action |
|------|-------|--------|
| `src/components/pulse/cards/PulseCardListItem.tsx` | 98, 103, 108 | Replace 3 TODO `console.log` calls with `logDebug` or remove (they're TODO stubs) |
| `src/components/pulse/creators/VideoUploader.tsx` | ~15 instances | Replace all `console.log('[VideoUploader]...')` with `logDebug(msg, { operation: 'video_upload' })` |
| `src/services/questionGenerationService.ts` | 671 | Replace `console.error` with `logWarning` |

---

## GAP 2: Raw `console.error` in Production Code (§11.5)

**Rule**: Replace `console.error` with `handleMutationError` or `logWarning`.

| File | Action |
|------|--------|
| `src/pages/Register.tsx` (3 instances) | Replace `console.error` with `handleMutationError(err, { operation: 'register_user' })` |
| `src/pages/NotFound.tsx` (1) | Replace with `logWarning('404: non-existent route', { operation: '404_navigation' })` |
| `src/components/pulse/creators/audioUtils.ts` (3) | Replace with `logWarning` |
| `src/components/pulse/creators/VideoUploader.tsx` (6) | Replace with `logWarning` |
| `src/components/pulse/widgets/ProfileMiniCard.tsx` (2) | Replace with `handleMutationError` |
| `src/components/DocxPreviewCanvas.tsx` (1) | Replace with `logWarning` |
| `src/components/XlsxPreviewCanvas.tsx` (1) | Replace with `logWarning` |
| `src/components/PptxPreviewCanvas.tsx` (1) | Replace with `logWarning` |
| `src/components/PdfPreviewCanvas.tsx` (3) | Replace with `logWarning` |
| `src/components/ErrorBoundary.tsx` (1) | Replace with `logWarning` |
| `src/pages/admin/proficiency-taxonomy/TaxonomyTreePreview.tsx` (1) | Replace with `handleMutationError` |

---

## GAP 3: Raw `console.warn` in Production Code (§11.5)

| File | Action |
|------|--------|
| `src/hooks/useAuth.tsx` (1) | Replace with `logWarning('Initial session check failed', { operation: 'auth_init' })` |
| `src/pages/Dashboard.tsx` (1) | Replace with `logWarning` |
| `src/services/cascadeResetService.ts` (3) | Replace with `logWarning('...deprecated...', { operation: '...' })` |
| `src/components/pulse/creators/AudioRecorder.tsx` (2) | Replace with `logWarning` |
| `src/components/pulse/creators/VideoUploader.tsx` (3) | Replace with `logWarning` |
| `src/lib/fetchWithRetry.ts` (1) | Replace with `logWarning` |

---

## GAP 4: Direct `toast.error` in `onError` Instead of `handleMutationError` (§11.3, §24.2)

**Rule**: All mutation `onError` callbacks MUST use `handleMutationError(error, { operation: '...' })`.

**Files to fix** (~17 hook files, ~40 mutations total):

| File | Mutations affected |
|------|-------------------|
| `src/hooks/queries/useAdminTransferHooks.ts` | 2 |
| `src/hooks/queries/useBillingData.ts` | 3 |
| `src/hooks/queries/useComplianceData.ts` | 2 |
| `src/hooks/queries/useMembershipData.ts` | 3 |
| `src/hooks/queries/useOrgAdminHooks.ts` | 1 |
| `src/hooks/queries/useOrgSettings.ts` | 3 |
| `src/hooks/queries/usePlanSelectionData.ts` | 1 |
| `src/hooks/queries/usePrimaryContactData.ts` | 3 |
| `src/hooks/queries/useRegistrationData.ts` | ~3 |
| `src/hooks/queries/useTeamData.ts` | 4 |
| `src/hooks/queries/useEnrollmentAssessment.ts` | 2 |
| `src/hooks/queries/useChallengeData.ts` | 1 |
| `src/hooks/queries/useAcademicTaxonomy.ts` | 1 |
| `src/hooks/queries/useCancelOrgApproval.ts` | 1 |
| `src/hooks/queries/usePanelReviewers.ts` | conditional |
| `src/hooks/mutations/useUpgradeExpertise.ts` | conditional |
| `src/pages/reviewer/InvitationResponsePage.tsx` | 2 |

**Pattern**: Replace `toast.error(\`Failed to ...: ${error.message}\`)` with `handleMutationError(error, { operation: 'verb_noun' })`.

---

## GAP 5: `md:flex-row` Breakpoint Violation (§9.1, §9.4)

**File**: `src/components/reviewer/candidates/CompositeScoreBanner.tsx` line 52

**Fix**: Change `md:flex-row` to `lg:flex-row`.

---

## GAP 6: `select("*")` Violations (§16.2)

| File | Fix |
|------|-----|
| `src/pages/reviewer/InvitationResponsePage.tsx` line 39 | Replace `.select("*")` with explicit columns: `id, first_name, last_name, email, invitation_status, approval_status, is_active, invited_at, expertise_level_ids, industry_segment_ids` |

Note: `src/services/regressionTestKit/` files are diagnostic/test utilities — acceptable exception.

---

## GAP 7: Missing `tenantId` in `ErrorContext` (§11.1)

**File**: `src/lib/errorHandler.ts` line 18-25

**Fix**: Add `tenantId?: string` to `ErrorContext` interface and include it in structured log entries.

---

## GAP 8: Missing `FeatureErrorBoundary` on Key Pages

Many admin and registration pages lack `FeatureErrorBoundary` wrappers. Priority pages to wrap:

| Category | Pages to wrap |
|----------|--------------|
| Registration | `BillingPage`, `CompliancePage`, `PlanSelectionPage`, `PreviewPage`, `PrimaryContactPage`, `OrganizationIdentityPage` |
| Org Settings | `OrgSettingsPage`, `OrgDashboardPage` |
| Admin | `SeekerOrgApprovalsPage`, `IndustrySegmentsPage`, `ExpertiseLevelsPage`, `InterviewKitPage` |

**Pattern**: Wrap existing default export in `<FeatureErrorBoundary featureName="...">`.

---

## Implementation Order (5 batches)

1. **Batch A**: GAP 5 (breakpoint) + GAP 6 (select *) + GAP 7 (ErrorContext tenantId) — small, surgical
2. **Batch B**: GAP 1 (console.log cleanup — 3 files)
3. **Batch C**: GAP 2 + GAP 3 (console.error/warn cleanup — ~15 files)
4. **Batch D**: GAP 4 (toast.error → handleMutationError — ~17 hook files)
5. **Batch E**: GAP 8 (FeatureErrorBoundary wrapping — ~12 pages)

**Estimated files changed**: ~45 files modified, 0 created, 0 DB migrations.

