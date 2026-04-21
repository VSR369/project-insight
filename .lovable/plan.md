

# Plan — Fix invisible Organize action: single shared review state + progress + diff visibility

## Root cause (verified)

Two separate `useLcPass3Review` instances exist:

- **Page** (`LcLegalWorkspacePage`): owns the buttons in `LcSourceDocUpload` (Run AI Pass 3 / Organize & Merge). No `onRegenerateComplete` callback.
- **Panel** (`LcPass3ReviewPanel` rendered inside `LcUnifiedAgreementCard`): owns the editor + diff hook, with its own `onRegenerateComplete` arm callback.

Consequence when user clicks **Organize** at the top of the page:
1. The page-hook's `organizePass3` mutation fires.
2. The panel-hook is a *different* `useMutation` instance — its `isPending` stays `false`. **Panel shows no loader, no progress.**
3. The page-hook's `onRegenerateComplete` is `undefined` — diff hook is never armed. Even after the row is refetched, **no red highlight appears**.
4. React Query cache *does* invalidate (same key) so the editor content eventually swaps in silently — looking like "nothing happened" because the swap is byte-identical or visually the same.

## Fix — One source of truth

### 1. Hoist `useLcPass3Review` into the page, pass everything down

`LcLegalWorkspacePage` already calls `useLcPass3Review`. Make it the **only** instance:

- Add `onRegenerateComplete` to that single call. Store the callback in a ref that the panel registers via a new prop.
- Pass the live `pass3` object (or the precise fields needed) into both `LcSourceDocUpload` and `LcUnifiedAgreementCard`.
- `LcPass3ReviewPanel` accepts the shared `pass3` snapshot as a prop instead of calling the hook itself.

### 2. Wire the diff-arm callback through the shared instance

- `LcPass3ReviewPanel` exposes its `armRegenerate` upward via a new prop `onRegisterArm: (fn) => void` (set once on mount).
- `LcLegalWorkspacePage` stores the registered function in a `useRef` and forwards it as `onRegenerateComplete` to the single `useLcPass3Review` call.
- Result: regardless of which button fires the mutation (page-level or stale-banner inside the panel), the same arm callback runs → red highlight always appears on substantive changes; "No changes…" info toast always appears on identical regenerations.

### 3. Visible progress in the panel during Organize / Pass 3

Currently the panel only shows the loader when `pass3Status === 'running'`, which depends on `runPass3.isPending || organizePass3.isPending` from the *panel's own* hook instance. With Fix 1 this becomes correct, but also:

- Show a **`<Progress>`-style indeterminate bar** at the top of the panel while `isRunning || isOrganizing`, with a sub-line "Organizing & merging source documents…" or "AI is enhancing the unified agreement…" depending on which mutation is active.
- Disable buttons everywhere (`pass3Busy = isRunning || isOrganizing`) — already done in `LcSourceDocUpload`, will now be coherent.

### 4. Tighten the diff hook so it never silently no-ops on real changes

Small hardening (defensive after Fix 1 is in place):

- When `armRegenerate` is called with `outcome='changed'`, also force `setHighlightActive(true)` if `annotateAdditions` produced any annotation, *and* always run the editor `setContent` with the annotated HTML even if `cleanIncoming === editor.getHTML()` (this byte-equal short-circuit is the only path that can swallow a real diff when prev/next text matched but ordering changed).
- When `outcome='unchanged'`, the existing "No changes — identical to current draft" info toast continues to fire from `useLcPass3Regenerate.reportOutcome`. No change needed there once Fix 1 is in.

### 5. Toast timing

`reportOutcome` toasts BEFORE the React Query invalidation finishes the refetch. Move the toast call so it fires inside `onSuccess` *after* the latest row is fetched (the code already awaits `fetchLatestUnified` before invalidating — toast call comes right after that, which is correct). No structural change; verify only.

## Files touched

1. **`src/pages/cogniblend/LcLegalWorkspacePage.tsx`** — pass shared `pass3` + `armRef` down; remove duplicate hook usage.
2. **`src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx`** — accept `pass3` and `onRegisterArm` props; forward to `LcPass3ReviewPanel`.
3. **`src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`** — accept `pass3` snapshot + `onRegisterArm` props instead of calling `useLcPass3Review`; register the diff hook's `armRegenerate` once on mount; render new progress bar.
4. **`src/components/cogniblend/lc/Pass3ProgressBar.tsx`** *(new, ≤ 50 lines)* — small indeterminate progress + status sub-line component using existing `<Progress>`.
5. **`src/hooks/cogniblend/useLcPass3DiffHighlight.ts`** — remove the `cleanIncoming === editor.getHTML()` early return when `pendingHighlightAgainst.current` is set, so a real arm always renders annotations.

No DB migration. No edge function change. No new dependency. All files stay ≤ 250 lines (R1).

## Behaviour after fix

| Action | Visible during | Visible after |
|---|---|---|
| Click **Organize & Merge** (page button), substantive change | Indeterminate progress bar + "Organizing & merging source documents…" | Editor updates; **changed clauses in red**; "Source documents organized & merged" toast |
| Click **Organize & Merge**, identical output | Same progress bar | Editor unchanged; **"No changes — the regenerated document is identical to the current draft."** info toast |
| Click **Run AI Pass 3** (page button), substantive change | Progress bar + "AI is enhancing the unified agreement…" | Editor updates; red highlights; "Legal AI review completed" toast |
| Click **Re-organize** from stale banner inside panel | Same progress bar in same panel | Same as above |
| LC clicks **Accept** | Existing accept flow | All red turns black via `.is-accepted` |
| Page reload | — | Plain black (DB has no diff spans) |

## Verification

1. Hard reload the LC workspace, click Organize → progress bar appears within 100ms; ≤ 30s later editor renders; if content changed, clauses are red; if not, info toast says "No changes…".
2. Same outcome when clicking Re-organize from the stale alert inside the panel.
3. Same outcome for Run AI Pass 3 (both entry points).
4. Click Accept → red turns to black instantly; DB row contains zero `legal-diff-added` spans.
5. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Character-level diff.
- Persisting highlights across reloads.
- Changing the regenerate-from-SOURCE_DOC architecture.
- Renaming statuses or DB columns.

