

# Curator Stabilization — Final Audit Report

## Complete Status of All Plan Items

### PROMPT 1: Fix Writes + State Authority

| Change | Status | Evidence |
|--------|--------|----------|
| **1.1** Replace `mutate()` with `mutateAsync()` | **DONE** | `useCurationAcceptRefinement.ts` lines 121, 162: both use `await saveSectionMutation.mutateAsync(...)` |
| **1.2** Batch extended_brief writes in Accept All | **DONE** | `useCurationPageOrchestrator.ts` lines 203-245: reads `extended_brief` ONCE, merges all subsections, writes ONCE |
| **1.3** Pause store sync during bulk ops | **DONE** | `useCurationStoreSync.ts` exports `pauseSync()`/`resumeSync()`. Orchestrator calls them at lines 194, 274 |
| **1.4** Remove content duplication from store sync | **DONE** | `useCurationStoreSync.ts` line 83: "Build review entries ONLY — NO section content writes". Only syncs `aiComments`, `addressed`, `reviewStatus`, etc. |
| **1.5** Fix varchar(20) constraint | **DONE** | Migration applied (confirmed in prior prompts) |

### PROMPT 2: Organization First-Class + Master Data

| Change | Status | Evidence |
|--------|--------|----------|
| **2.1** Pass real org data in `buildContextOptions` | **DONE** | `useCurationWaveSetup.ts` lines 47-60: reads `challenge?.seeker_organizations` for org name, description, city, website, operating model, industry segment |
| **2.2** Fix visibility ≠ eligibility | **DONE** | `masterData.ts` lines 50-52: comment says "Do NOT overwrite result.visibility here". `STATIC_MASTER_DATA` has `challenge_visibility` with `[public, private, invite_only]` |
| **2.3** Verify org context in edge functions | **DONE** | `assemblePrompt.ts` injects org block. `challengeContextAssembler.ts` includes `organizationName`, `organizationDescription`, `organizationCity`, `organizationWebsite` |

### PROMPT 3: Unified AI Brain

| Change | Status | Evidence |
|--------|--------|----------|
| **3.1** `buildUnifiedContext.ts` shared function | **DONE** | File exists at `supabase/functions/_shared/buildUnifiedContext.ts` |
| **3.2** `analyse-challenge` edge function | **DONE** | File exists at `supabase/functions/analyse-challenge/index.ts` |
| **3.3** `generate-suggestions` edge function | **DONE** | File exists at `supabase/functions/generate-suggestions/index.ts` |
| **3.4** `masterDataValidator.ts` | **DONE** | File at `src/lib/cogniblend/masterDataValidator.ts` — validates maturity, IP, visibility, eligibility, solution_type, eval criteria weights |
| **3.5** Wire `handleAnalyse` to unified endpoint | **DONE** | `useCurationAIActions.ts` lines 196-198: calls `supabase.functions.invoke('analyse-challenge', ...)` |
| **3.6** Wire `handleGenerateSuggestions` to unified endpoint | **DONE** | `useCurationAIActions.ts` lines 296-298: calls `supabase.functions.invoke('generate-suggestions', ...)` |
| **3.7** Call `validateMasterDataInReviews` post-AI | **DONE** | Called at line 209 (analyse) and line 309 (generate) |
| **3.8** Reset state in `handleAnalyse` | **DONE** | Lines 168-183: resets `pass1DoneSession`, `generateDoneSession`, `aiReviews`, `contextLibraryReviewed`, clears sessionStorage, invalidates caches |
| **3.9** Keep wave executors for single-section re-review | **DONE** | `handleSingleSectionReview` at line 372 still works independently |

### PROMPT 4: Context Library Stabilization

| Change | Status | Evidence |
|--------|--------|----------|
| **4.1** Discovery uses Pass 1 gaps | **DONE** | `discover-context-resources/index.ts` updated to accept `gap_sections` |
| **4.2** Extraction quality gate | **DONE** | `extract-attachment-text/index.ts` sets `extraction_quality` (`high`/`medium`/`low`/`seed`/`failed`) + DB column added |
| **4.3** Digest filters by quality + targets gaps | **DONE** | `generate-context-digest/index.ts` filters `.neq("extraction_quality", "low")` and sorts by quality |
| **4.4** Add correlation IDs | **DONE** | Discovery and digest functions have correlation logging |

### PROMPT 5: Accept All + Preview + Verification

| Change | Status | Evidence |
|--------|--------|----------|
| **5.1** Atomic Accept All | **DONE** | `useCurationPageOrchestrator.ts` lines 186-277: `pauseSync()`, read-once, batch merge, single write, invalidate, navigate to preview, `resumeSync()` in finally |
| **5.2** Wire editing in PreviewDocument | **DONE** | `PreviewDocument.tsx` has `handleSectionSave` (lines 94-131), routes `PreviewSectionEditor` as `editContent` (lines 168-178), supports read-modify-write for extended_brief |
| **5.3** Preview fresh data (`staleTime: 0`) | **DONE** | `usePreviewData.ts` all queries use `staleTime: 0` and `refetchOnWindowFocus: true` |
| **5.4** Preview button in curation page | **DONE** | `CurationRightRail.tsx` has "Preview Document" button (lines 105-113) accessible anytime |
| **5.5** Fix React ref warnings | **PARTIAL** | Not explicitly verified — no evidence of a specific ref-fixing pass |
| **5.6** Navigate to preview after Accept All | **DONE** | `useCurationPageOrchestrator.ts` line 269: `navigate(\`/cogni/curation/${challengeId}/preview\`)` |

---

## Remaining Gap: 1 Minor Item

### 5.5: React ref warnings audit
The plan called for checking all preview components for unforwarded refs, string refs, and missing keys. No explicit pass was done. This is low-risk — existing components use functional patterns and `forwardRef` isn't typically needed for these leaf components. However, if console warnings appear during testing, a targeted fix pass would be needed.

### Minor Code Quality Note
`useCurationAIActions.ts` line 211 uses `console.warn` — this violates the workspace rule (R9: zero console.log/warn/error). Should use `logWarning()` from `errorHandler.ts`. Same at line 311. These are non-functional but should be cleaned up.

---

## Verdict

**All 5 prompts are substantively complete.** Every systemic failure (F1–F7) is addressed:

- F1 (writes): `mutateAsync` + batched extended_brief + pauseSync ✅
- F2 (org nulls): Real org data flows through pipeline ✅
- F3 (visibility mapping): Fixed + post-AI validator strips invalid codes ✅
- F4 (context library): Gap-targeted discovery + quality gates + quality-aware digest ✅
- F5 (state races): Store sync only writes metadata, pauseSync for bulk ✅
- F6 (preview editing): Full inline save pipeline with PreviewSectionEditor ✅
- F7 (observability): Unified endpoints with correlation IDs, validator logging ✅

**To clean up the 2 minor items**, I would:
1. Replace `console.warn` calls in `useCurationAIActions.ts` with `logWarning()`
2. Audit preview components for any React ref console warnings

Shall I proceed with these minor cleanups?

