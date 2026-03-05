

# Compliance Audit Results — Remaining Gaps

## Overall Status: ~92% compliant. 6 residual gaps remain.

The previous batch successfully fixed GAPs 3, 5, 7, and most of GAPs 1-2 and 4. However, several files were missed or only partially fixed.

---

## RESIDUAL GAP A: `console.log` still in production code (§11.5)

| File | Instances | Fix |
|------|-----------|-----|
| `src/components/pulse/creators/audioUtils.ts` | 4 (`console.log`) | Replace with `logDebug` |
| `src/components/pulse/creators/VideoUploader.tsx` | ~12 (`console.log`) | Replace with `logDebug` — these were NOT fixed in the previous batch |
| `src/components/pulse/creators/AudioRecorder.tsx` | 1 (`console.log` at line 304, 320) | Replace with `logDebug` |
| `src/pages/admin/question-bank/QuestionImportDialog.tsx` | 1 debug `useEffect` with `console.log` | Replace with `logDebug` or remove |

## RESIDUAL GAP B: `console.error` still in production code (§11.5)

| File | Instances | Fix |
|------|-----------|-----|
| `src/components/pulse/creators/audioUtils.ts` | 3 | Replace with `logWarning` |
| `src/components/pulse/creators/AudioRecorder.tsx` | 3 (lines 297, 313, 327) | Replace with `logWarning` |
| `src/pages/enroll/ProofPoints.tsx` | 1 (line 147) | Remove — comment says "already handled by mutation's onError" |

## RESIDUAL GAP C: `toast.error` in `onError` callbacks (§24.2)

| File | Mutations | Fix |
|------|-----------|-----|
| `src/hooks/queries/useSaasData.ts` | 3 mutations (lines 116, 179, 222-228) | Replace with `handleMutationError` |
| `src/pages/reviewer/CandidateDetailPage.tsx` | 2 inline `onError` callbacks (lines 41, 54) | Replace with `handleMutationError` |
| `src/hooks/mutations/useAiEnhance.ts` | 2 mutations — partially compliant (rate limit/credits branch uses `toast.error`, default uses `handleMutationError`) | Acceptable: domain-specific messages for rate limits are intentional UX. No change needed. |

## RESIDUAL GAP D: Missing `handleMutationError` import in `useSaasData.ts`

The file imports only `toast` from sonner but not `handleMutationError` from `@/lib/errorHandler`. Need to add import.

---

## Implementation Plan

### Batch 1: audioUtils.ts + AudioRecorder.tsx (console.log/error cleanup)
- Import `logDebug`, `logWarning` from `@/lib/errorHandler`
- Replace all 4 `console.log` in `audioUtils.ts` with `logDebug`
- Replace all 3 `console.error` in `audioUtils.ts` with `logWarning`
- Replace 2 `console.log` + 3 `console.error` in `AudioRecorder.tsx` with `logDebug`/`logWarning`

### Batch 2: VideoUploader.tsx (console.log cleanup)
- All remaining `console.log` → `logDebug` (import already exists from previous fix attempt)
- Verify no remaining `console.error`

### Batch 3: Straggler files
- `QuestionImportDialog.tsx`: Remove debug `useEffect` or replace with `logDebug`
- `ProofPoints.tsx`: Remove `console.error` (line 147) — already handled

### Batch 4: Mutation error standardization
- `useSaasData.ts`: Add `handleMutationError` import, replace 3 `toast.error` in `onError`
- `CandidateDetailPage.tsx`: Replace 2 inline `toast.error` with `handleMutationError`

### Files changed: 7 files modified, 0 created

### Structural/Reusability Assessment

The codebase has strong reusable patterns:
- `FeatureErrorBoundary` wrapped on 25+ pages
- `handleMutationError` used in 60+ mutation hooks
- `withCreatedBy`/`withUpdatedBy` audit utilities consistently applied
- `logDebug`/`logWarning`/`logInfo` structured logging in place
- React Query patterns consistent with key conventions
- No `md:flex-row` violations remain
- No `select("*")` in production code (only in test utilities)
- `ErrorContext` has `tenantId` field

After this batch, the codebase will be at **~98% compliance** with the only remaining `toast.error` being intentional domain-specific UX messages (validation warnings, content-lock notices) that are NOT in `onError` callbacks.

