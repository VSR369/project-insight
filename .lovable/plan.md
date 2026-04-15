

# Curator Stabilization — Gap Analysis

## Status Summary

| # | Failure | Status | Detail |
|---|---------|--------|--------|
| F1 | Write paths / mutateAsync / JSONB corruption | **DONE** | `mutateAsync()` at lines 121, 162. Batched extended_brief in orchestrator. pauseSync/resumeSync wired. |
| F2 | AI sees fragments, org nulls | **DONE** | `useCurationWaveSetup.ts` reads real org data. `assemblePrompt.ts` injects org block. |
| F3 | visibility = eligibility mapping | **DONE** | `masterData.ts` no longer overwrites visibility. `challengeContextAssembler.ts` fallback corrected to `['public','private','invite_only']`. |
| F4 | Context Library fragile chain | **DONE** | Discovery uses gap_sections, extraction_quality column added, digest sorts by quality, low-quality excluded. |
| F5 | 3-way state sync races | **DONE** | Store sync only writes review metadata. Content written via explicit saves only. pauseSync/resumeSync for bulk ops. |
| F6 | Preview editing not wired | **PARTIAL** | Preview renders all sections + sources + quality badges. But **NO inline save/edit pipeline exists** — `editContent` prop is never provided, `onSave` has no handler. |
| F7 | No correlation IDs | **PARTIAL** | Discovery and digest functions have correlation logging. `analyse-challenge` and `generate-suggestions` edge functions exist but are **not called from the client**. |

---

## 5 Pending Items (Gaps)

### GAP 1: Unified AI endpoints NOT wired to client (CRITICAL)

The plan required `handleAnalyse` to call `analyse-challenge` (1 AI call) and `handleGenerateSuggestions` to call `generate-suggestions` (1 AI call). The edge functions were created (`supabase/functions/analyse-challenge/index.ts`, `supabase/functions/generate-suggestions/index.ts`) but the client code **still calls the old wave executors**:
- `handleAnalyse` → calls `executeWavesPass1()` (6 waves)
- `handleGenerateSuggestions` → calls `executeWavesPass2()` (6 waves)

Neither function invokes `supabase.functions.invoke('analyse-challenge', ...)` or `supabase.functions.invoke('generate-suggestions', ...)`.

**Fix:** Wire `handleAnalyse` to call `analyse-challenge` edge function, parse response, run `validateMasterDataInReviews()`, save to store. Wire `handleGenerateSuggestions` to call `generate-suggestions`, parse, validate, save suggestions. Keep wave executors only for single-section re-review.

### GAP 2: Preview inline editing not functional

`PreviewSection.tsx` accepts `editContent` prop but `PreviewDocument.tsx` never provides it. No `onSave` callback exists. The plan required:
- Route to existing editors (RichTextEditor, DeliverableCardEditor) per `SECTION_FORMAT_CONFIG`
- Write to DB on save, invalidate cache, close editor
- Read-modify-write for extended_brief subsections
- Only ONE section editable at a time

**Fix:** In `PreviewDocument`, for each section, render the appropriate editor component as `editContent` when `isEditing`. Add a `handleSave` that writes to DB via supabase update, invalidates `challenge-preview` query, and sets `editingSection(null)`.

### GAP 3: Edge functions not deployed

`analyse-challenge` and `generate-suggestions` were created but need deployment. Also `discover-context-resources`, `extract-attachment-text`, and `generate-context-digest` were modified and need redeployment.

**Fix:** Deploy all 5 edge functions.

### GAP 4: masterDataValidator not called post-AI

`validateMasterDataInReviews` is imported in `useCurationAIActions.ts` but never invoked anywhere in the code. The plan required it to run after every AI response.

**Fix:** Call `validateMasterDataInReviews()` after receiving AI reviews (in both `handleAnalyse` and `handleGenerateSuggestions` flows).

### GAP 5: Accept All does not navigate to preview

The plan specified that after bulk accept, the user should be navigated to the preview page. Current code shows a toast but stays on the curation page.

**Fix:** Add `navigate(\`/cogni/curation/${challengeId}/preview\`)` after successful bulk accept in `handleAcceptAllSuggestions`.

---

## Implementation Plan (2 Prompts)

### PROMPT A: Wire Unified AI + Validation

1. **`useCurationAIActions.ts` — `handleAnalyse`**: Replace `executeWavesPass1()` with `supabase.functions.invoke('analyse-challenge', { body: { challenge_id: challengeId } })`. Parse response. Call `validateMasterDataInReviews(reviews, masterData)`. Save validated reviews to store and DB. Keep discovery call after.

2. **`useCurationAIActions.ts` — `handleGenerateSuggestions`**: Replace `executeWavesPass2()` with `supabase.functions.invoke('generate-suggestions', { body: { challenge_id: challengeId } })`. Parse response. Call `validateMasterDataInReviews()`. Save suggestions to store.

3. **Deploy** all 5 modified/new edge functions: `analyse-challenge`, `generate-suggestions`, `discover-context-resources`, `extract-attachment-text`, `generate-context-digest`.

4. **`handleAcceptAllSuggestions`**: Add navigation to preview after success.

### PROMPT B: Preview Inline Editing

1. **`PreviewDocument.tsx`**: For each standard section, when `isEditing`, render appropriate editor as `editContent` based on `SECTION_FORMAT_CONFIG[sectionKey].format`. Create `handleSectionSave(sectionKey, value)` that writes to DB, invalidates queries, closes editor.

2. **`PreviewSection.tsx`**: Add `onSave` and `onCancelEdit` props. Wire cancel button.

3. Ensure only ONE section editable at a time (already tracked via `editingSection` state).

---

## Technical Details

- **Files modified in Prompt A**: `src/hooks/cogniblend/useCurationAIActions.ts`, `src/hooks/cogniblend/useCurationPageOrchestrator.ts`
- **Files modified in Prompt B**: `src/components/cogniblend/preview/PreviewDocument.tsx`, `src/components/cogniblend/preview/PreviewSection.tsx`
- **Deployments**: 5 edge functions
- **No new DB migrations needed** — all schema changes already applied

