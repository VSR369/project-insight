

# Plan — Permanent fix for all Consolidate / Enhance / Edit / Accept scenarios (revised)

## Reviewer's correction — verified against live DB

The reviewer was working from migration files alone. Live DB inspection confirms:

- `uq_challenge_legal_docs_type_tier` (the legacy broad constraint) is **gone** — the migration just applied (`20260421104230_…sql`) dropped it.
- `uq_challenge_legal_docs_unified_per_tier` **exists** as a partial unique index: `(challenge_id, document_type, tier) WHERE document_type <> 'SOURCE_DOC'`.

This partial index is a **superset** of the reviewer's proposed `WHERE document_type = 'UNIFIED_SPA'` index — it enforces uniqueness for `UNIFIED_SPA` (the only invariant we need today) **and** for any other future non-SOURCE_DOC document type. No additional migration is needed.

**Fix C stands as written. No DB change in this plan.**

## Verified problem map

| # | Scenario | Today | Risk |
|---|---|---|---|
| 1 | Enhance → Consolidate | Replaces enhanced with consolidated | Correct, but silent |
| 2 | Consolidate → Enhance | Replaces consolidated with enhanced | Correct |
| 3 | Edit → Re-run (either) | **LC edits silently lost** | **Critical** |
| 4 | Edit → Upload → Re-run | Edits lost, new doc included | **Critical** |
| 5 | Accepted → editor locked | Buttons disabled | Safe |
| 6 | Accepted → upload → stale banner shows | Re-run could attempt second `UNIFIED_SPA` | **Minor risk** (DB index now backstops) |

Both `Consolidate` and `Enhance with AI` always read **only** SOURCE_DOC rows + curated context, then replace the `UNIFIED_SPA`. They never read the editor draft. That's the root of the remaining issues.

## Decision

Stay with the **simple, deterministic** model:

- SOURCE_DOC rows = single source of truth for inputs.
- UNIFIED_SPA = always-regenerable output.
- LC edits live only in the editor draft. They are protected by a **confirmation dialog** before any action that would discard them.
- After Accept, every regenerative action is hard-disabled at the UI **and** mutation layers.
- DB partial index already prevents a second `UNIFIED_SPA` row.

## Fixes

### Fix A — Confirm before destructive regenerate (Scenarios 3 & 4)

Use shadcn `AlertDialog` (project standard, accessible).

Affected entry points:
- **Re-run Pass 3** in `src/components/cogniblend/lc/Pass3EditorBody.tsx`
- **Re-organize** in `src/components/cogniblend/lc/Pass3ReviewHeader.tsx`
- **Consolidate** / **Enhance with AI** entry buttons in `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` (whichever surfaces them)

Behaviour:
- Dialog only when `unifiedDocHtml` is non-empty AND status ∈ {`organized`, `ai_suggested`}.
- Title: *"Replace current draft?"*
- Body (when editor is dirty): *"This will regenerate the agreement from your uploaded source documents. Any manual edits in the editor will be discarded."*
- Body (when not dirty): *"Regenerate the agreement from the latest source documents?"*
- Buttons: `Cancel` (default) / `Regenerate` (destructive variant).
- First-time Consolidate/Enhance from `idle` status → no dialog.

Implementation:
- New presentational component `src/components/cogniblend/lc/ConfirmRegenerateDialog.tsx` (≤ 60 lines) wrapping `AlertDialog`. Reused by all call sites — keeps each parent ≤ 250 lines.
- Each call site: `<ConfirmRegenerateDialog trigger={<Button…/>} onConfirm={onAction} skipConfirm={!hasDraft} isDirty={editorDirtySinceLoad} />`.

### Fix B — Hide stale UI and lock regeneration after Accept (Scenario 6)

In `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`:

```tsx
<Pass3ReviewHeader
  ...
  isStale={review.isStale && !review.isPass3Accepted}
  isBusy={review.isBusy || review.isPass3Accepted}
  ...
/>
```

In `src/hooks/cogniblend/useLcPass3Mutations.ts`, add a guard at the top of both `runPass3` and `organizePass3` mutationFns:

```ts
if (currentDoc?.ai_review_status === 'accepted') {
  throw new Error('Legal documents have already been accepted and cannot be regenerated.');
}
```

Belt-and-braces — UI hides the button, mutation refuses the call, and the DB partial index would refuse a second `UNIFIED_SPA` insert as the final backstop.

### Fix C — DB single-row guarantee (already in place)

Partial unique index `uq_challenge_legal_docs_unified_per_tier` on `(challenge_id, document_type, tier) WHERE document_type <> 'SOURCE_DOC'` — verified live. **No migration needed.**

### Fix D — Dirty-state-aware dialog copy

- Track `editorDirtySinceLoad` by comparing the editor's current HTML against the last persisted `ai_modified_content_html` (already exposed by the autosave hook; expose a boolean if not).
- `ConfirmRegenerateDialog` shows the "edits will be discarded" copy only when `isDirty === true`. Otherwise the softer "regenerate from latest source documents?" copy. Avoids dialog fatigue.

## Files touched

1. `src/components/cogniblend/lc/ConfirmRegenerateDialog.tsx` — new (≤ 60 lines).
2. `src/components/cogniblend/lc/Pass3EditorBody.tsx` — wrap Re-run button.
3. `src/components/cogniblend/lc/Pass3ReviewHeader.tsx` — wrap Re-organize button.
4. `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` — pass guarded `isStale` / `isBusy`.
5. `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` — wrap Consolidate / Enhance entry buttons (if surfaced here).
6. `src/hooks/cogniblend/useLcPass3Mutations.ts` — `accepted` guard in both mutations; expose `editorDirtySinceLoad` if not already available.

All files stay ≤ 250 lines (R1). No DB migration. No edge function change. No new dependencies.

## NOT changing

- The "always regenerate from SOURCE_DOC rows" architecture (intentional and correct).
- The two-tab layout.
- DB schema (partial unique index already in place).
- `suggest-legal-documents` edge function.
- QUICK auto-accept path, Pass 1, Pass 2, `complete_legal_review` RPC.
- Any naming or terminology.

## Verification

1. Fresh challenge → Consolidate → no dialog (idle), draft appears.
2. Edit a clause → click Consolidate → dialog with "edits will be discarded"; Cancel keeps edits; Regenerate replaces.
3. Edit → click Enhance with AI → same dialog, same behaviour.
4. Enhance → without editing, click Consolidate → softer dialog ("regenerate from latest source documents?").
5. Upload a new SOURCE_DOC while editing → stale banner shows; Re-run Consolidate dialog warns about edits.
6. Accept → all regeneration buttons disabled, stale banner hidden, editor locked.
7. Manual mutation invocation after accept (e.g. via stale React Query cache) → mutation throws and toasts the error; DB partial index also blocks a duplicate `UNIFIED_SPA`.
8. Solution Provider preview reads `content_html` of the single accepted `UNIFIED_SPA` row — single source of truth at signing.
9. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Feeding the editor draft back into the AI (preserves predictability).
- Per-section diff/merge UI.
- URL/localStorage persistence of the active workspace tab.
- Renaming statuses or DB columns.
- Any further DB migration (verified unnecessary).

