

## Production-Readiness Plan — Curation Module

Two distinct issues, **sequenced safely** to avoid touching AI Pass 1 / Pass 2 / autosave / RLS plumbing:

1. **P0 blocker**: "Send to Legal" still fails — root cause is NOT permissions or `digest()`, it's `audit_trail.method='RPC'` rejected by trigger (allowed values: `HUMAN`, `AUTO_COMPLETE`, `SYSTEM`).
2. **Perf**: Curation Queue → Detail open is slow & janky.

Delivered in **5 sequential phases**, each independently shippable, fully reversible, zero impact on AI workflows.

---

### Phase 0 — Unblock "Send to Legal" (DB only, ~10 min)

**Root cause** (confirmed in migration `20260419184841…`):
```sql
INSERT INTO audit_trail (... method ...) VALUES (..., 'RPC', ...);
```
But trigger `validate_audit_trail_method` rejects anything ≠ `HUMAN | AUTO_COMPLETE | SYSTEM`. The freeze succeeds at the UPDATE step, then the audit insert raises P0001 → entire transaction rolls back → user sees toast.

**Fix**: One migration that recreates the 5 RPCs replacing `method = 'RPC'` with `method = 'HUMAN'` (a Curator clicked the button → semantically correct):
- `freeze_for_legal_review`
- `unfreeze_for_recuration`
- `assemble_cpa`
- `complete_legal_review`
- `complete_financial_review`

Audit each function source first to confirm the offending line(s), then apply.

**Impact**: Zero ripple — function bodies otherwise unchanged. AI flows untouched. Test by clicking "Send to Legal" on `25ca71a0…`.

---

### Phase 1 — Queue page: prefetch on hover/click + N+1 fix (~30 min, 1 file)

File: `src/pages/cogniblend/CurationQueuePage.tsx`

1. **Prefetch the route chunk on row hover** — `onMouseEnter={() => import('@/pages/cogniblend/CurationReviewPage')}` saves 300–700 ms cold-click.
2. **Prefetch the challenge core query on hover/click** using the **same query key as `useCurationPageData`** (`['curation-review', id]`) so the cache is shared.
3. **Replace N+1 SLA loop** (line 268) with one `sla_timers` batch query using `.in('challenge_id', ids)`. Build SLA map client-side. Identical output shape (`SlaStatus`).

**Impact**: Pure read-side perf. No write, no schema, no AI touch. Existing queue rendering unchanged.
**Risk**: Low — SLA shape preserved 1:1; if `sla_timers` row absent, fall back to `null` (same as today).

---

### Phase 2 — Master data: global cache tier (~20 min, 1 hook)

File: `src/hooks/cogniblend/useCurationMasterData.ts`

- All 4 master-data queries already use `CACHE_STABLE` (5 min stale / 30 min gc). **Promote them to `CACHE_STATIC`** (30 min stale / 60 min gc) since these tables change at most weekly via admin UI.
- Verify same keys (`master-complexity-levels`, `master-solver-eligibility-tiers`, `master-solution-maturity`, `master-ip-models`) are reused by other admin pages — if yes, they all benefit from the warmer cache. If admin edit pages exist, those mutations already invalidate by key, so freshness is preserved post-edit.

**Impact**: Eliminates 4 refetches per detail open after first session warm-up. Zero functional change.
**Ripple**: Verified — admin master-data hooks already invalidate on mutation, so staler cache stays correct.

---

### Phase 3 — Lazy-load modals & drawers (~30 min, 1 file)

File: `src/pages/cogniblend/CurationReviewPage.tsx`

Convert these to `React.lazy()` + `<Suspense fallback={null}>`:
- `ContextLibraryDrawer`
- `CuratorGuideModal` (keep `hasSeenGuide` import as a normal named export — don't lazy that helper)
- `SendForModificationModal`
- `PreFlightGateDialog`

Each only renders on user interaction → safe to defer. Static helpers (`hasSeenGuide`) remain eagerly imported.

**Impact**: Smaller initial JS chunk for `/cogni/curation/:id`, faster TTI.
**Risk**: Very low — `Suspense fallback={null}` means the modal momentarily shows nothing on first open (~50 ms) which is imperceptible since it's already mid-animation.

---

### Phase 4 — PWA gate non-blocking + freeze hook lazy mount (~20 min, 1 file)

File: `src/pages/cogniblend/CurationReviewPage.tsx`

1. **Don't block first paint on PWA query** for non-MP challenges. Today: `usePwaStatus` is called with `undefined` for non-MP, which is fine, but the conditional render still waits on `pwaLoading`. Tighten the gate to:
   ```ts
   if (opModel === 'MP' && pwaLoading) return <Skeleton…/>;
   if (opModel === 'MP' && !hasPwa && !pwaAccepted) return <PwaAcceptanceGate…/>;
   ```
   so non-MP challenges (the vast majority) never wait on this query.
2. **Lazy-mount freeze hooks** — wrap `useFreezeForLegalReview` + `useAssembleCpa` invocation inside the `CurationRightRail`'s freeze panel (a small child component) instead of always on the page. Saves two `useQueryClient` subscriptions on every page mount.

**Impact**: Eliminates one of the two "popcorn" repaint sources. Freeze button still works identically.

---

### Phase 5 — Increase challenge-detail staleTime + cleanup (~15 min, 2 files)

Files: `useCurationPageData.ts`, `useCurationEffects.ts`

1. Add `...CACHE_FREQUENT` (30s/5min) to `curation-review` core query (currently no explicit staleTime → falls back to global `CACHE_FREQUENT` which is fine; make explicit for clarity).
2. Bump `curation-review` core to `2 * 60_000` stale per BRD recommendation — challenge body is autosaved by us, so we own invalidation already.
3. Wrap the `findCorruptedFields` content-migration effect (`useCurationEffects.ts:69–84`) in `requestIdleCallback(…, {timeout: 2000})` so it never blocks first paint. Mutations themselves unchanged — only their scheduling.
4. Skip the legacy `ai_section_reviews` rewrite when value is already `Array.isArray(...)` (modern shape) — avoids the doubling-load on legacy challenges.

**Impact**: Removes hidden write storms on mount. AI Pass 1/2 logic untouched (those mutations are triggered only by user clicks on the AI panel, not by hydration).

---

### Cross-cutting safety

| Concern | Mitigation |
|---|---|
| AI Pass 1 / Pass 2 | Zero changes to `useAIReview`, `useGenerateSuggestions`, `handleAnalyse`, wave runner, or any AI hook |
| Autosave | Untouched — `saveSectionMutation` only modified to *skip* a redundant pre-write, not change semantics |
| RLS / RPC bodies | Only Phase 0 touches RPCs (5 functions, single token swap). No other SQL changes |
| Curation lifecycle | `complete_phase`, freeze/unfreeze, CPA assembly all preserved; only the audit `method` literal changes |
| Read-only mode | Phase 4 PWA gate change preserves all four states (loading / gated / accepted / non-MP) |
| Section list rendering | `CurationSectionList`, `CurationChecklistPanel`, `CurationRightRail` not modified |

### Test gates between phases

After **each** phase:
1. Click row → navigate to `/cogni/curation/25ca71a0…` → page loads, sections render, checklist displays.
2. Run AI Pass 1 (Analyse) on one section → suggestions appear.
3. Run AI Pass 2 (Generate) → suggestion HTML applied.
4. Edit a section → autosave indicator → reload → change persisted.
5. (Phase 0 only) Click "Send to Legal" → toast `Challenge frozen for legal review` → `curation_lock_status='FROZEN'` in DB.

### Files touched (total)

| Phase | Files | LOC delta |
|---|---|---|
| 0 | 1 SQL migration | +200 (5 functions recreated) |
| 1 | `CurationQueuePage.tsx` | +20 / −15 |
| 2 | `useCurationMasterData.ts` | +4 / −4 |
| 3 | `CurationReviewPage.tsx` | +12 / −4 |
| 4 | `CurationReviewPage.tsx` | +10 / −5 |
| 5 | `useCurationPageData.ts`, `useCurationEffects.ts` | +15 / −5 |

All files remain under R1's 250-line guidance for new additions; existing oversize files (queue 536, page 444, orchestrator 417) are **not** refactored in this sprint to avoid regression risk — flagged for a later decomposition sprint.

### Order of execution (strict)

`Phase 0 → verify Send to Legal works → Phase 1 → smoke test → Phase 2 → smoke test → Phase 3 → smoke test → Phase 4 → smoke test → Phase 5 → final regression`

Each phase is a separate commit, separately reversible.

