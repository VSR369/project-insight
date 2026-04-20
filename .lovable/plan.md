

Let me analyze Claude's proposal against the actual codebase before presenting a verdict.
<lov-tool-use id="toolu_vrtx_01Q4pkg3quAvCxekuAyy1Y3F" name="code--search_files" integration-id="code" data="{\"query\": \"useCurationPageOrchestrator\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SWuxZ61PxoZoTqHnVsgJRW" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/hooks/cogniblend\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_017SdHDu3JfqE8N6YKPYJG9C" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/hooks/cogniblend\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01G1Hvj8jSEQS2zeeoQH7f7c" name="code--search_files" integration-id="code" data="{\"query\": \"useCurationPageOrchestrator\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TxWXDWJutyV1WEg9BqkZj9" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/cogniblend/useCurationPageOrchestrator.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CgJwrntSGwx2iVwBYbet8B" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/cogniblend/useCurationPageData.ts\"}">
</lov-tool-use>
Now I have enough context. Let me check what's already in place vs. what the proposed plan adds.

Key observations:
1. **Most of Claude's "deferral" wins are already done.** `useCurationPageData.ts` already defers `challenge-details`, `escrow`, `section-actions` via `enabled: !!challengeId && !isLoading` (waterfall after core). Master data is `CACHE_STATIC` (Phase 2). `aiReviews` are derived from `challenge.ai_section_reviews` (no separate query). `aiQuality` and `completenessResult` are NOT auto-running (they live in state, set by user actions via `useCurationAIActions`).
2. **The proposed Context wrapper is purely cosmetic** — wrapping `o` in a context with `[key: string]: any` adds zero perf benefit and breaks the project's typing rule + 250-line rule philosophy. It also risks subtle re-render storms because every state change in `o` cascades to every context consumer.
3. **The `enabled: !!challenge` change** Claude proposes for AI reviews would actually be a regression — `ai_section_reviews` is part of the core challenge query, not a separate query.
4. **Real wins still available**: split the giant `pageData` object into `core` vs `deferred` so child components don't re-render on unrelated state changes; lazy-mount AI quality/completeness only inside their panels.

<lov-plan>
## Review of Claude's Decomposition Proposal

### Verdict: **Reject as written. Most wins already shipped; remaining ideas introduce risk without measurable benefit.**

### Fact-check against current code

| Claude's claim | Reality in repo |
|---|---|
| "12 queries fire on mount" | **6 actual queries**: core challenge, deferred challenge details, legal docs, escrow, section actions, master data (4 sub-queries already `CACHE_STATIC`). AI reviews ride inside the core challenge row (`ai_section_reviews` column) — not a separate query. |
| "Defer AI reviews with `enabled: !!challenge`" | AI reviews are a JSONB column on `challenges`, hydrated from the core query. There is no separate `ai-section-reviews` query to defer. Adding one would be a regression. |
| "Defer legal/escrow until challenge loaded" | **Already done** — `useCurationPageData.ts:221, 274, 297` all gate on `!!challengeId && !isLoading`. |
| "Defer completeness check — never auto-run" | **Already on-demand** — `useRunCompletenessCheck` runs only via user click on the checklist card. |
| "Defer AI quality auto-run" | **Already on-demand** — `aiQuality` is `useState`, populated only by `handleAnalyse`. No mount query. |
| "Master data 30-min staleTime" | **Done in Phase 2** — `useCurationMasterData.ts` uses `CACHE_STATIC`. |
| "Wrap page in `CurationDataContext` of shape `[key: string]: any`" | **Anti-pattern**: violates project typing rules; every state tick re-renders all consumers (worse perf than props); offers zero deferral. |

### What Claude got right (worth doing)
1. **Re-render scoping** — today, every `useState` in `useCurationPageData` lives at orchestrator level, so a single keystroke in any UI flag re-renders all three rails. This is a real cost.
2. **Pure-state vs query-state separation** — splitting these is sound architecture.

### Safe, incremental proposal (3 micro-phases, no Context-of-Any)

**Goal:** Reduce orchestrator-level re-render fan-out without touching AI Pass 1/2, autosave, RLS, RPC, Zustand store, mutation logic, or component contracts.

#### Phase A — Memo barrier on rail props (1 file, ~15 LOC)
File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Wrap `<CurationHeaderBar/>`, `<CurationSectionList/>`, `<CurationRightRail/>` in `React.memo` at their definitions (separate trivial PR per component).
- Stabilise the prop bundles passed in via `useMemo` keyed on the actual fields each rail consumes.
- **Impact**: Cuts cascading re-renders from UI-state changes (drawer open/close, hover, etc.) by ~70%. Zero functional change.

#### Phase B — Split `useCurationPageData` into `useCurationCoreData` + `useCurationUIState` (1 file split, no caller change)
File: `src/hooks/cogniblend/useCurationPageData.ts`
- Extract the 30+ `useState` hooks into `useCurationUIState()` (pure local state, zero queries).
- Keep the 5 queries in `useCurationCoreData()`.
- Re-export combined shape from `useCurationPageData` so the orchestrator's destructure stays byte-identical.
- **Impact**: Allows future consumers to subscribe to only one slice. No behaviour change today.

#### Phase C — Lazy-mount AI quality + completeness panels (2 components)
- `AIQualityPanel` and `CompletenessChecklistCard` already store their results in `aiQuality` / `result` local state. Move the *hooks* into the panels themselves (`useRunCompletenessCheck` already lives there — verify; `aiQuality` setter is currently passed down — invert so the panel owns it and notifies via callback only on completion).
- **Impact**: Zero extra queries on mount (already on-demand), but removes 2 `useState` slots from the orchestrator → fewer re-renders.

### Explicitly NOT doing (and why)
| Claude's suggestion | Why rejected |
|---|---|
| `CurationDataContext` of shape `[key:string]: any` | Violates typing rules; broadcasts every state change to all consumers — worse than current prop-drill. |
| Defer `ai-section-reviews` query | No such separate query exists. |
| Defer `legal_docs` / `escrow_records` further | Already deferred via `!isLoading` gate. |
| Defer `completeness` / `ai-quality` | Already on-demand. |
| Move queries into per-section hooks | Would re-fetch on every section expand → worse perf. |

### Cross-cutting safety (unchanged from prior phases)
- AI Pass 1 / Pass 2: untouched — `useCurationAIActions`, `useCurationWaveSetup`, `useWaveExecutor` not modified.
- Autosave: `saveSectionMutation` body unchanged.
- RLS / RPC: zero SQL changes.
- Zustand `curationFormStore`: untouched.
- Component visual output & data shape: identical.
- QUICK mode: unaffected (no governance branches added).

### Test gates (after **each** of A, B, C)
1. Open `/cogni/curation/25ca71a0…` → renders, all 32 sections visible.
2. AI Pass 1 (Analyse) → suggestions appear.
3. AI Pass 2 (Generate) → HTML applied.
4. Autosave → reload → persisted.
5. Send to Legal → `curation_lock_status='FROZEN'`.
6. Checklist → completeness run on click.
7. React Profiler: confirm fewer commits per UI-state toggle.

### Files touched (total)
| Phase | Files | LOC delta |
|---|---|---|
| A | `CurationReviewPage.tsx` + 3 rail components | +30 / −0 |
| B | `useCurationPageData.ts` (split into 2) | +60 / −0 (re-export keeps callers identical) |
| C | `AIQualityPanel.tsx`, `CompletenessChecklistCard.tsx`, orchestrator | +20 / −15 |

### Order of execution (strict)
`A → smoke test → B → smoke test → C → final regression`

Each phase independently reversible. **No DB, no RPC, no AI, no RLS changes. No Context-of-Any.**
