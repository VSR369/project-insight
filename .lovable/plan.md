

# Corrected Test Specs — Aligned to Actual Implementation

## Key Corrections from Review

The provided test specs assume an architecture that doesn't match what was built. Here are the critical misalignments:

### 1. Section Count: NOT 27 — it's 22 in the UI

The `SECTIONS` array in `CurationReviewPage.tsx` has **22 keys**. `SECTION_FORMAT_CONFIG` has 27, but 5 are extended-brief subsections (`context_and_background`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`) that are rendered inside `ExtendedBriefDisplay`, not as independent UI sections. Tests referencing "all 27 sections" must say **22 UI sections** (or 26 AI-reviewable via `VALID_CURATION_KEYS`).

### 2. Global AI Review uses a 2-phase pipeline, NOT `reviewAll()`

The actual `handleAIReview` calls:
- **Phase 1**: `triage-challenge-sections` (single call, returns all sections)
- **Phase 2**: Sequential `review-challenge-sections` + `refine-challenge-section` only for warning/inferred sections
- **Complexity**: Parallel `assess-complexity` call

The `useAiSectionReview.reviewAll()` hook exists but is NOT wired to the global button. The global button uses the existing `handleAIReview` with `aiReviewInFlightRef` guard.

### 3. "AI Suggested Version" panel — not every section gets one

Phase 1 triage returns comments but no suggested version for "pass" sections. Only Phase 2 sections (warning/inferred) get deep suggestions. Tests must reflect this.

### 4. Accept/Reject — still uses local `setAiReviews` state + store bridge

Accept/reject currently goes through `CurationReviewPage`'s local `aiReviews` state handlers, which then sync to the Zustand store via `useCurationStoreHydration`. Not all sections use the unified hook's `accept()` directly.

### 5. Store key inspection — `getCurationFormStore` is a function, not a hook on window

E-01's console command `Object.keys(useCurationFormStore.getState().sections)` won't work. The store is accessed via `getCurationFormStore(challengeId)`.

---

## Corrected Test Specifications

### Group 1 — Global "Review Sections by AI" (6 cases)

| ID | Test | Steps | Pass | Fail | Correction Notes |
|----|------|-------|------|------|------------------|
| G-01 | Button triggers triage for all sections | Open challenge with data → Click "Review Sections by AI" → Wait | All AI-reviewable sections (up to 26 via `VALID_CURATION_KEYS`) get triage results. `legal_docs` and `escrow_funding` are excluded (`aiReviewEnabled: false`). | Any reviewable section missing from triage results | Changed "27" to "up to 26 reviewable". `legal_docs`/`escrow_funding` are excluded by design. |
| G-02 | Phase 2 sections receive deep review suggestions | After G-01, check sections marked `warning` or `inferred` | Warning/inferred sections have AI comments from Phase 2. Pass sections show triage-only comments. | Phase 2 section stuck on triage-only comments | Changed: NOT every section gets "AI Suggested Version" — only Phase 2 queue sections do. |
| G-03 | Button disabled while review running | Click button → immediately click again | Button disabled via `aiReviewLoading` state + `aiReviewInFlightRef` guard. Only one pipeline runs. | Two parallel reviews | Correct as-is. Guard is a `useRef`, not store-level `isAnyPending`. |
| G-04 | Spinner clears after completion | Wait for all phases | Spinner disappears. `phase2Status` set to `completed`. Button re-enables. | Stuck spinner or premature re-enable | Correct. The `finally` block sets `aiReviewInFlightRef.current = false`. |
| G-05 | Correct edge function routing | Network tab → trigger review | `complexity` → `assess-complexity`, Phase 2 non-complexity → `review-challenge-sections` then `refine-challenge-section`, Phase 1 → `triage-challenge-sections` | Wrong edge function | Corrected: the global flow does NOT use `SECTION_REVIEW_ROUTES` map. It uses hardcoded edge function names in `handleAIReview`. `reward_structure` does NOT call `refine-challenge-section` via the map — it goes through the same Phase 2 sequential pipeline as other sections. |
| G-06 | Partial failure non-blocking | Simulate network failure mid-review | Other sections complete. Failed section retains triage result. | One failure hangs entire review | Correct. Each Phase 2 iteration has try/catch with `continue`. |

### Group 2 — Accept / Reject (8 cases)

| ID | Test | Steps | Pass | Fail | Correction Notes |
|----|------|-------|------|------|------------------|
| A-01 | Accept updates section content | Review → Accept on any section | Section shows accepted content. `aiReviews` array updated with `addressed: true`. | Content unchanged | Correct conceptually. Note: acceptance flows through the page-level handler, which updates local state AND syncs to store. |
| A-02 | Reward monetary accept preserves non-monetary | Add 3 NM items → Review → Accept monetary suggestion | Monetary updated. All 3 NM items intact. | NM items wiped | Correct — this is the core deep-merge test. |
| A-03 | Reward NM accept preserves monetary | Set platinum $5K → Review → Accept NM suggestion | NM added. Platinum unchanged. | Platinum reset | Correct. |
| A-04 | Reject clears suggestion, preserves data | Review → Reject | Suggestion panel gone. Section content unchanged. | Content modified or panel persists | Correct. |
| A-05 | After accept, `aiComments` and `aiSuggestion` are null | Accept → check localStorage `curation-form-{challengeId}` | `aiComments: null`, `aiSuggestion: null` | `aiComments: []` or suggestion still present | Correct. Store sets both to `null` explicitly. |
| A-06 | After reject, `reviewStatus` resets to `idle` | Reject → check store | `reviewStatus: "idle"`, both null | Status remains `reviewed` | Correct. |
| A-07 | Accept on rich-text section | Review `problem_statement` → Accept | Editor content updated. Formatting preserved. | Raw HTML visible | Correct — depends on `AiContentRenderer` handling. |
| A-08 | Accept on checkbox section | Review `ip_model` → Accept | Correct option selected | Wrong option or all cleared | Correct. |

### Group 3 — Manual Human Edits (6 cases)

| ID | Test | Correction Notes |
|----|------|------------------|
| M-01 | NM item add persists via navigation | Correct — store persists via localStorage. |
| M-02 | Monetary tier edit persists | Correct — `syncToStore()` called on change. |
| M-03 | Item deletion persists | Correct. |
| M-04 | RewardType switch persists | Correct. |
| M-05 | Table section row persists | Correct for deliverables. Note: table sections use `handleSaveDeliverables`/`handleSaveEvalCriteria` which call `syncSectionToStore`. |
| M-06 | Saving indicator | **Correction needed**: The sync layer exposes `SyncStatus.isSaving` but the UI may not yet render a "Saving..." / "Saved" indicator on every section header. The `RewardStructureDisplay` has its own save indicator. Other sections depend on whether the page wired the `syncStatus` return value. Test should verify reward structure specifically, and note that other sections may not yet have the indicator. |

### Group 4 — Per-Section Re-review (5 cases)

| ID | Test | Correction Notes |
|----|------|------------------|
| R-01 | Re-review button exists | **Correction**: The re-review button is NOT implemented on all 22 sections via the unified hook. The existing flow has "Re-review" only where individual section components support it (e.g., `RewardStructureDisplay`). The `useAiSectionReview.reReview()` method exists but is not wired to every section's UI. This test will likely FAIL for most sections. Mark as "verify where wired". |
| R-02 | Re-review uses current data | Correct for sections where re-review is wired. |
| R-03 | Re-review generates new comments | Correct. |
| R-04 | Re-review accept deep-merges | Correct — same `acceptAiSuggestion` path. |
| R-05 | Re-review uses correct edge function | **Correction**: Per-section re-review uses `getReviewRoute(sectionKey)` from `sectionRoutes.ts`. So `complexity` → `assess-complexity`, `reward_structure` → `refine-challenge-section`, all others → `review-challenge-sections`. This IS correct via the unified hook, but only if the UI calls `reReview()` from `useAiSectionReview`. |

### Group 5 — Data Persistence (6 cases)

| ID | Test | Correction Notes |
|----|------|------------------|
| P-01 | Navigation persistence | Correct — Zustand `persist` middleware with localStorage. |
| P-02 | Hard refresh persistence | **Correction**: Data comes from React Query's Supabase fetch on page load, NOT from the Zustand store's localStorage on hard refresh. The hydration bridge (`useCurationStoreHydration`) re-populates the store from the challenge query. The test passes but for a different reason than implied. |
| P-03 | localStorage clear → loads from DB | **Correction**: `useCurationStoreSync` hydration only loads from `ai_section_reviews` column, not from individual section columns. The main section data comes from React Query challenge fetch → `useCurationStoreHydration`. So clearing localStorage doesn't cause data loss because the page always fetches from Supabase via React Query. |
| P-04 | Tab-hide flushes pending save | Correct — `visibilitychange` handler calls `flushSave()`. |
| P-05 | Different challenges use isolated stores | Correct — `getCurationFormStore(challengeId)` creates per-challenge stores with key `curation-form-{challengeId}`. |
| P-06 | Legacy items without `id` get UUIDs | Correct — `ensureArrayItemIds` in `hydrate()`. |

### Group 6 — Deep Merge and Array Logic (4 cases)

| ID | Test | Correction Notes |
|----|------|------------------|
| DM-01 | 3 user items + 2 AI items = 5 after accept | Correct — `mergeArraysByIdentity` appends non-matching items. |
| DM-02 | Same-id item updated in-place | Correct — matching by `id` field, then deep-merged. |
| DM-03 | Null suggestion accept is no-op | Correct — guard: `if (!entry?.aiSuggestion \|\| entry.reviewStatus !== 'reviewed') return state`. |
| DM-04 | Primitive field overwrite | Correct. |

### Group 7 — Edge Cases (3 cases)

| ID | Test | Correction Notes |
|----|------|------------------|
| E-01 | All section keys covered | **Correction**: Console command should be: Find the store in localStorage under key `curation-form-{challengeId}` and compare keys. The store only has entries for sections that have been hydrated or edited. Empty/unvisited sections won't have entries until touched. Better test: verify `SECTION_KEYS` array length equals 27 (from `SECTION_FORMAT_CONFIG`). |
| E-02 | All format types accept/persist | Correct conceptually. |
| E-03 | SectionKey type catches typos | **Correction**: This only works where code uses `SectionKey` type. The `handleAIReview` function in `CurationReviewPage.tsx` still uses raw strings (`'complexity'`, `'reward_structure'`). The `as SectionKey` casts in `useCurationStoreHydration` bypass compile-time checking. This test will PASS for code using the unified hook but NOT for the existing page-level handlers. |

---

## Summary of Material Changes

1. **Section count**: 22 UI sections, 26 AI-reviewable, 27 in config. Not "27" everywhere.
2. **Global review**: Uses 2-phase triage pipeline, NOT `reviewAll()`.
3. **Re-review button**: NOT yet wired to all sections — only where components explicitly support it.
4. **Saving indicator**: Only reward structure has a visible save indicator currently.
5. **G-05 edge function routing**: `reward_structure` does NOT use `refine-challenge-section` during global review — it goes through the standard Phase 2 `review-challenge-sections` pipeline. The `SECTION_REVIEW_ROUTES` map is only used by `useAiSectionReview.review()`.
6. **E-01 console command**: Must reference the correct store access pattern.
7. **Persistence model**: Data primarily loads from React Query (Supabase), not localStorage. Store is a caching/sync layer.

