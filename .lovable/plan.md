

# Curator Module — Definitive Stabilization Plan (Final Merged)

## Confirmed Systemic Failures (7)

| # | Failure | Evidence |
|---|---------|----------|
| F1 | 43+ write paths, `mutate()` fire-and-forget, extended_brief JSONB corruption | `useCurationAcceptRefinement.ts` lines 121, 162 use `.mutate()` not `.mutateAsync()` |
| F2 | AI sees fragments. `seekerSegment: null`, `organizationTypeId: null` always | `useCurationWaveSetup.ts` lines 50-51 hardcoded null |
| F3 | `visibility = eligibility` wrong mapping. `visibility` column is `varchar(20)` causing truncation errors | `masterData.ts` line 52; DB confirms `varchar(20)` on `challenges.visibility` |
| F4 | Context Library fragile chain. No extraction quality gate. Placeholders pass as completed | No `extraction_quality` column exists. `hasRealContent()` is soft-only |
| F5 | 3-way state: Zustand + React Query + DB. Store sync races with mutations (800ms debounce) | `useCurationStoreSync.ts` writes section content + review state to DB on every store change |
| F6 | Preview editing not wired. No inline save pipeline | `PreviewSection.tsx` accepts `editContent` prop but no component provides it |
| F7 | No correlation IDs. Failures silent | Edge functions log but no tracing across stages |

---

## Execution: 5 Prompts, Strict Sequential Order

### PROMPT 1: Fix Writes + State Authority

**Files modified:** `useCurationAcceptRefinement.ts`, `useCurationPageOrchestrator.ts`, `useCurationStoreSync.ts`

1. **Replace `mutate()` with `mutateAsync()`** in `useCurationAcceptRefinement.ts` lines 121 and 162. Both containing functions are already `async`.

2. **Batch extended_brief writes in Accept All** (`useCurationPageOrchestrator.ts` lines 200-204): Replace the sequential loop with: read `extended_brief` once from DB → merge ALL subsections in memory → ONE write back. Use `EXTENDED_BRIEF_FIELD_MAP` for key mapping.

3. **Add sync pause flag** to `useCurationStoreSync.ts`: Export `pauseSync()` / `resumeSync()`. In the store subscription callback (line 259-276), return early if paused. Call `pauseSync()` at start of `handleAcceptAllSuggestions`, `resumeSync()` in `finally`.

4. **Stop store sync from writing section content**: The debounced auto-save currently writes section data AND review state to DB on every Zustand change. Remove section content writes from `flushSave()` — only sync review metadata (addressed, comments, status). Section content is saved ONLY via explicit `saveSectionMutation`.

5. **Fix `varchar(20)` on `challenges.visibility`**: DB migration to `ALTER COLUMN visibility TYPE TEXT`. This is the confirmed source of "value too long" errors.

**Verification:** Accept one suggestion → DB has value. Accept All with extended_brief → ALL subsections preserved. No varchar errors. Store sync no longer writes section content.

---

### PROMPT 2: Organization First-Class + Master Data Fixes

**Files modified:** `useCurationWaveSetup.ts`, `challengeContextAssembler.ts`, `masterData.ts`, `review-challenge-sections/contextIntelligence.ts`, `discover-context-resources/index.ts`

1. **Fix `buildContextOptions()`** in `useCurationWaveSetup.ts` lines 50-51: Replace `seekerSegment: null` and `organizationTypeId: null` with actual values from `challenge?.seeker_organizations` join (industry segment name, org type ID). Add `organizationName`, `organizationDescription`, `organizationCity`, `operatingModel`.

2. **Update `BuildChallengeContextOptions` type** in `challengeContextAssembler.ts`: Add org fields. Add organization narrative block to the assembled context document.

3. **Fix `masterData.ts` line 52**: Replace `result.visibility = result.eligibility` with static visibility values: `[{code: "public", label: "Public"}, {code: "private", label: "Private"}, {code: "invite_only", label: "Invite Only"}]` (already in `STATIC_MASTER_DATA` but overwritten by line 52).

4. **Fix `challengeContextAssembler.ts` line 243**: Replace wrong fallback `validVisibilityOptions: ['anonymous', 'named', 'verified']` with `['public', 'private', 'invite_only']`.

5. **Verify org context in edge functions**: Ensure `buildContextIntelligence()` outputs org name, type, description in the AI prompt. Ensure `discover-context-resources` includes org name in search query generation.

**Verification:** Edge function logs show org name in AI prompt. Master data visibility has 3 correct options. Discovery queries reference org name.

---

### PROMPT 3: Unified AI Brain + Master Data Validation

**New files:** `supabase/functions/_shared/buildUnifiedContext.ts`, `supabase/functions/analyse-challenge/index.ts`, `supabase/functions/generate-suggestions/index.ts`, `src/lib/cogniblend/masterDataValidator.ts`

**Modified:** `useCurationAIActions.ts`, `useCurationWaveSetup.ts`

1. **`buildUnifiedContext.ts`** — ONE shared function assembling ALL challenge data: org + industry pack + geography + master data + ALL 31 sections + governance rules + context digest. Fetched via `Promise.all` for parallelism.

2. **`analyse-challenge/index.ts`** — ONE AI call for Pass 1. Receives full context document. Returns `{ overall_assessment: { score, readiness, summary, cross_section_issues }, sections: { [key]: { status, score, comments, dependency_gaps, industry_alignment } } }`. Includes STRICT master data value lists in prompt.

3. **`generate-suggestions/index.ts`** — ONE AI call for Pass 2. Receives full context + Pass 1 reviews + digest. Returns suggestions in correct format per section (rich_text→HTML, line_items→JSON array, table→JSON array, checkbox→code from allowed list).

4. **`masterDataValidator.ts`** — Post-AI hard validation: reject `maturity_level` not in `{BLUEPRINT, POC, PROTOTYPE, PILOT, PRODUCTION}`, `ip_model` not in `{IP-EA, IP-NEL, IP-EL, IP-JO, IP-SR}`, etc. Check eval criteria weights sum to 100%. Strip invalid values, add error comments.

5. **Update `useCurationAIActions.ts`**: `handleAnalyse` calls `analyse-challenge` (1 call, not 6 waves) → runs discovery → sets `pass1DoneSession`. `handleGenerateSuggestions` calls `generate-suggestions` (1 call, not 6 waves) → sets `generateDoneSession`. Keep `review-challenge-sections` for single-section re-review only.

6. **Simplify wave progress**: No more wave-by-wave display for global passes. Show single progress indicator.

**Verification:** Analyse returns ALL sections in ONE response. Org name in comments. Master data sections suggest ONLY valid codes. Cross-section issues flagged. Eval criteria weights = 100%. Single-section re-review still works.

---

### PROMPT 4: Context Library Stabilization

**Modified:** `discover-context-resources/index.ts`, `extract-attachment-text/index.ts`, `generate-context-digest/index.ts`

**DB migration:** Add `extraction_quality TEXT DEFAULT 'pending'` column to `challenge_attachments`.

1. **Discovery uses Pass 1 gaps**: After loading challenge, read `ai_section_reviews`. Extract sections with `status = 'needs_revision'` or `'generate'`. Add to query generation prompt: "CHALLENGE GAPS TO FILL: [gap list]. Prioritize sources for these gaps."

2. **Extraction quality gate**: After extraction, measure real text length (excluding placeholders/markers). Set `extraction_quality`: `low` (<200 chars), `medium` (200-1000), `high` (>1000). Save to DB.

3. **Digest filters by quality + targets gaps**: Add `.neq('extraction_quality', 'low')` to source query. Load Pass 1 gaps. Add to digest prompt: "Challenge has gaps in: [sections]. Focus on filling these. Reference sources by [Source N]."

4. **Add correlation IDs**: All 3 edge functions generate `correlationId` at start, log at every decision point, include in response.

**Verification:** Discovery queries reference challenge gaps. Low-quality extractions excluded from digest. Digest differs when sources change. Logs show correlationId.

---

### PROMPT 5: Accept All Atomic + Preview Editing + Final Verification

**Modified:** `useCurationPageOrchestrator.ts`, preview components, `CurationRightRail.tsx`, `CurationHeaderBar.tsx`

1. **Atomic Accept All** (`handleAcceptAllSuggestions`): `pauseSync()` → read `extended_brief` ONCE → build ONE update object (regular sections as direct columns, extended_brief merged) → ONE `supabase.update()` call → mark all addressed in store → `await queryClient.invalidateQueries()` → update `aiReviews` state → `resumeSync()` in `finally`.

2. **Wire editing in PreviewDocument**: `PreviewSection` `onSave` writes to DB, invalidates cache, closes editor. For `extended_brief` subsections, do read-modify-write. Route to existing editors via `SectionEditSwitch.tsx` using `SECTION_FORMAT_CONFIG` format. Only ONE section editable at a time.

3. **Preview fresh data**: `usePreviewData` queries use `staleTime: 0`, `refetchOnWindowFocus: true`, `refetchOnMount: 'always'`.

4. **Preview button accessible anytime**: Already added to `CurationRightRail` and `CurationHeaderBar` — verify working.

5. **Fix React ref warnings**: Check all preview components for unforwarded refs and missing keys.

**Final Verification Checklist (8 items):**
1. Open STRUCTURED challenge → Analyse → ONE AI call → ALL sections reviewed → org in comments → master data valid
2. Discover Sources → gap-targeted queries → auto-accept high confidence → summaries appear
3. Generate Digest → references specific sources → different when sources change
4. Generate Suggestions → ONE AI call → correct format per section → master data enforced
5. Accept All → ONE DB write → ALL sections update → panels collapse → navigate to preview
6. Preview → ALL sections including org → LC/FC conditional → edit works → save persists
7. Re-analyse → old reviews cleared → Generate hidden → no spinner on Generate
8. Read-only when phase > 2 or FROZEN

---

## Summary of All Changes

| Category | New Files | Modified Files | DB Migrations |
|----------|-----------|----------------|---------------|
| Writes & State | 0 | 3 (`useCurationAcceptRefinement`, `useCurationPageOrchestrator`, `useCurationStoreSync`) | 1 (`visibility` → TEXT) |
| Org + Master Data | 0 | 4 (`useCurationWaveSetup`, `challengeContextAssembler`, `masterData.ts`, `contextIntelligence.ts`) | 0 |
| Unified AI | 4 (`buildUnifiedContext`, `analyse-challenge`, `generate-suggestions`, `masterDataValidator`) | 2 (`useCurationAIActions`, `useCurationWaveSetup`) | 0 |
| Context Library | 0 | 3 (`discover-context-resources`, `extract-attachment-text`, `generate-context-digest`) | 1 (`extraction_quality` column) |
| Accept All + Preview | 0 | 4 (`useCurationPageOrchestrator`, preview components) | 0 |
| **Total** | **4** | **~12 unique** | **2** |

## Critical Rules
1. Execute Prompts 1→2→3→4→5 in order. Each depends on the previous.
2. Keep existing `review-challenge-sections` for single-section re-review.
3. Keep ALL existing UI components, editors, renderers, section definitions.
4. Keep ALL existing DB tables. Only add `extraction_quality` column and widen `visibility`.

