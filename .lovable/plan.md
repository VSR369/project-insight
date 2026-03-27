

# Final Plan: Migrate Curation Sections to Zustand Store

## The Problem (3 Compounding Bugs)

1. **Data loss on navigation** — Each section uses local `useState`. Navigate away, component unmounts, data gone.
2. **AI accept clobbers unrelated fields** — Shallow spread (`{...state, ...aiSuggestion}`) replaces entire section, wiping non-monetary data when accepting monetary changes.
3. **27 sections × 27 custom accept/reject implementations** — Inconsistent logic means bugs appear differently per section.

```text
Current (broken):                          Fixed:
  useState per section                       Zustand store (single source of truth)
  → unmount = data lost                      → persist middleware = survives navigation
  → shallow merge = fields clobbered         → deep merge = field-by-field, arrays by ID
  → 27 custom accept handlers               → 1 unified hook for all sections
```

---

## Phase 1: Foundation (4 new files)

### `src/lib/deepMerge.ts`
Recursive merge with array-aware logic:
- Objects: merged key-by-key
- Primitives: target overwrites source
- Arrays at keys ending in `items`, `tiers`, `entries`: merged by `id` (or `label` fallback) — user's existing items preserved, matching items updated, new items added
- All other arrays: replaced wholesale

### `src/types/sections.ts`
- Derive `SECTION_KEYS` from existing `SECTION_FORMAT_CONFIG` (all 27 keys already defined there)
- Export `SectionKey` type — a typo becomes a compile error
- Define `RewardStructureSectionData` interface with the exact shape: `rewardType`, `currency`, `monetary` (3 tiers with enabled/amount), `nonMonetary.items` (with mandatory `id`)

### `src/lib/sectionRoutes.ts`
Explicit routing map — no if/else chains:
```
complexity       → 'assess-complexity'
reward_structure → 'refine-challenge-section'
(default)        → 'review-challenge-sections'
```

### `src/store/curationFormStore.ts`
Zustand store with `persist` middleware (localStorage key: `curation-form-{challengeId}`).

Per-section state: `{ data, aiComments: null | string[], aiSuggestion: null | Record, reviewStatus, addressed }`

Critical semantics:
- `accept()` → deep merge suggestion into data, set `aiComments: null`, `aiSuggestion: null`, `addressed: true`. **No-op if `aiSuggestion` is null** — prevents crash from double-click race.
- `reject()` → `aiComments: null`, `aiSuggestion: null`, `reviewStatus: 'idle'`
- `hydrate()` → on legacy data, generate `crypto.randomUUID()` for any array items missing `id` field (one-time migration)
- Selector: `isAnyReviewPending` for global review button lock

---

## Phase 2: Sync + Unified Hook (2 new files)

### `src/hooks/useCurationStoreSync.ts`
- Debounce 800ms after `setSectionData` → upsert to Supabase
- Hydration: if localStorage empty for this challengeId → load from DB. If DB empty → init with defaults. Never compare timestamps when either is null.
- Flush pending on unmount / tab-hide
- Show "Saving..." / "Saved" indicator

### `src/hooks/useAiSectionReview.ts`
Single hook for all sections:
- `review()` → looks up edge function via `SECTION_REVIEW_ROUTES`
- `accept()` → `store.acceptAiSuggestion()` (deep merge, null-guarded)
- `reject()` → `store.rejectAiSuggestion()`
- `reReview()` → re-runs with current store data
- Global review button: disabled + spinner while `isAnyReviewPending`. Uses `Promise.allSettled`.

---

## Phase 3: Migrate Reward Structure (first — most fragile)

- Refactor `useRewardStructureState` → read/write from Zustand store
- Remove `saveTimerRef / isSavingRef / queuedSaveRef` autosave scheduler — store sync layer handles it
- `applyAIReviewResult` → thin wrapper around `store.acceptAiSuggestion('reward_structure')`

---

## Phase 4: Migrate All Remaining Sections (batched)

1. Text: `problem_statement`, `scope`, `hook`
2. Structured: `deliverables`, `evaluation_criteria`, `phase_schedule`, `expected_outcomes`, `submission_guidelines`
3. Select/checkbox: `ip_model`, `maturity_level`, `eligibility`, `visibility`, `domain_tags`, `submission_deadline`, `challenge_visibility`, `effort_level`, `solver_expertise`
4. Complex: `complexity`, `extended_brief`

**After migrating the sections listed above, iterate `SECTION_FORMAT_CONFIG` and migrate any remaining keys not listed here. Every key in `SECTION_KEYS` must be migrated — zero exceptions.**

---

## Phase 5: Cleanup (scoped precisely)

**Only remove state management code:**
- `useState` declarations for section data
- `useEffect` DB loaders for section data
- Manual save timers and autosave schedulers
- Per-section accept/reject callback bodies

**Keep untouched:** All JSX, styling, event handler wiring. Handlers now call store actions instead of local `setState`.

---

## Phase 6: Verification Matrix

| Test | Pass | Fail |
|------|------|------|
| Navigation persistence | Edit any section, navigate away/back → data preserved | Data lost |
| AI accept deep merge | Accept monetary suggestion → non-monetary items unchanged | Items wiped |
| Array-aware merge | AI suggests 2 NM items, user has 3 → all preserved | User's 3rd deleted |
| Double-click prevention | Click global review twice fast → only one review runs | Parallel reviews |
| Hydration (no localStorage) | Clear localStorage, reload → data from DB | Empty state |
| Tab-hide flush | Edit, switch tabs → data persisted on return | Edits lost |
| Legacy data migration | Existing items without `id` get UUIDs on hydration | deepMerge corrupts |
| Null-guard on accept | Accept with null suggestion → no-op, no crash | TypeError thrown |

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/deepMerge.ts` | CREATE |
| `src/types/sections.ts` | CREATE |
| `src/lib/sectionRoutes.ts` | CREATE |
| `src/store/curationFormStore.ts` | CREATE |
| `src/hooks/useAiSectionReview.ts` | CREATE |
| `src/hooks/useCurationStoreSync.ts` | CREATE |
| `src/hooks/useRewardStructureState.ts` | MODIFY — read/write from store |
| `src/components/cogniblend/curation/RewardStructureDisplay.tsx` | MODIFY — remove autosave |
| `src/pages/cogniblend/CurationReviewPage.tsx` | MODIFY — replace useState + handlers with store |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | MODIFY — use unified hook |

No DB schema changes. Incremental: reward structure first, verify, then remaining sections.

