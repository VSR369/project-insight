

# Plan — Fix: "Organize & Merge" wrongly triggers full Pass 3 AI run

## Bug confirmed

Clicking **Organize & Merge** on the LC legal workspace ends up running the full **Re-run Pass 3** flow. The two operations are conceptually distinct:

- **Organize & Merge** → AI runs in *organize-only* mode: deduplicates and harmonises clauses from uploaded SOURCE_DOCs verbatim into matching SPA section_keys. **No new substantive content.** Status becomes `organized`.
- **Run/Re-run Pass 3** → AI runs in *full generation* mode: merges, enhances, fills gaps, rewrites in legal voice. Status becomes `ai_suggested`.

They MUST stay separated end-to-end (UI label, mutation called, edge-function payload, resulting status, toast text, progress label).

## Root cause (verified in code)

Three independent issues conspire so that Organize ends up running Pass 3:

### Cause 1 — Page-level Organize button calls the wrong mutation

`LcLegalWorkspacePage` hoists `useLcPass3Review` (good) but the page-level Organize button in `LcSourceDocUpload` is wired to the same handler that triggers `runPass3()` instead of `organizePass3()`. Need to confirm the exact prop/handler name in `LcSourceDocUpload` and fix the wiring so the page passes two distinct callbacks: `onRunPass3 → review.runPass3()` and `onOrganize → review.organizePass3()`.

### Cause 2 — Stale-banner "Re-organize" inside the panel calls runPass3

In `Pass3ReviewHeader` (or its stale-alert subcomponent), the **Re-organize** button has been pointed at the same `onRerunPass3` handler that runs the full Pass 3. It must call a separate `onReorganize` prop bound to `organizePass3()`.

### Cause 3 — Progress label always says "AI is enhancing the unified agreement…"

`Pass3ProgressBar` decides its label from `isOrganizing` vs `isRunning`. Because Cause 1/2 routed everything through `runPass3`, `isOrganizing` is always `false` → the bar shows the Pass 3 label even when the user clicked Organize, reinforcing the impression that "Organize runs Pass 3". Once Causes 1+2 are fixed the label resolves correctly, but we'll also add an explicit assertion: the `Pass3ProgressBar` is the only place that derives the label, and it consumes booleans from the single shared `useLcPass3Review` instance — no other source.

## Fix

### A. Two distinct handlers, all the way down

In `LcLegalWorkspacePage`:

```ts
const handleRunPass3 = () => review.runPass3();         // full AI generation
const handleOrganize = () => review.organizePass3();    // organize-only
```

Pass BOTH down to `LcSourceDocUpload` and to `LcUnifiedAgreementCard` → `LcPass3ReviewPanel` → `Pass3ReviewHeader`. No component receives a single shared "regenerate" callback.

### B. Wire the buttons to the correct handler

- `LcSourceDocUpload`: **Run AI Pass 3** button → `onRunPass3`. **Organize & Merge** button → `onOrganize`. Remove any shared `onRegenerate` prop.
- `Pass3ReviewHeader` (and any stale-banner subcomponent): **Re-run Pass 3** button → `onRerunPass3`. **Re-organize** button → `onReorganize`. Two distinct props, two distinct confirmation dialogs (the existing confirm dialog gets a `mode: 'pass3' | 'organize'` prop so the warning text reads correctly: *"Re-running Pass 3 will replace the agreement with a freshly AI-generated version…"* vs *"Organize & Merge will rebuild the agreement verbatim from your uploaded source documents…"*).

### C. Confirmation dialog wording matches the action

`ConfirmRegenerateDialog` already exists. Add a `mode: 'pass3' | 'organize'` prop and switch the title + body copy + confirm button label accordingly. The dialog must visually show the user which of the two operations they're about to run.

### D. Toast + progress label always reflect the action that was clicked

- `useLcPass3Regenerate.runPass3.onSuccess` → success toast: *"Legal AI review completed"*.
- `useLcPass3Regenerate.organizePass3.onSuccess` → success toast: *"Source documents organized & merged"*.
- `Pass3ProgressBar` label is decided by `isOrganizing` first, then `isRunning` (current logic is correct — it just wasn't being reached). Verified.

### E. Edge function payload sanity check

`useLcPass3Regenerate.organizePass3` already invokes `suggest-legal-documents` with `{ pass3_mode: true, organize_only: true }` and `runPass3` invokes it with `{ pass3_mode: true }` (no `organize_only`). The edge function's `handlePass3` branches correctly on `organizeOnly`. **No edge function change needed** — the bug is purely in client wiring.

### F. Defensive guard at the mutation layer

Add an invariant inside `useLcPass3Regenerate`: log a warning (via `logWarning`) if both `runPass3` and `organizePass3` are pending simultaneously — this should never happen and indicates a wiring regression. Cheap insurance against future drift.

## Files touched

1. **`src/pages/cogniblend/LcLegalWorkspacePage.tsx`** — define two distinct handlers; pass both down via two props (`onRunPass3`, `onOrganize`).
2. **`src/components/cogniblend/lc/LcSourceDocUpload.tsx`** — replace any shared regenerate prop with `onRunPass3` + `onOrganize`; wire each button to its own handler + its own confirm-dialog mode.
3. **`src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx`** — forward `onRerunPass3` + `onReorganize` props down to the panel.
4. **`src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`** — accept and forward both handlers to `Pass3ReviewHeader`.
5. **`src/components/cogniblend/lc/Pass3ReviewHeader.tsx`** (and any stale-banner subcomponent) — wire the **Re-run Pass 3** button to `onRerunPass3` and the **Re-organize** button to `onReorganize`; pass correct `mode` to the confirm dialog.
6. **`src/components/cogniblend/lc/ConfirmRegenerateDialog.tsx`** — add `mode: 'pass3' | 'organize'`; switch title/body/confirm-button copy.
7. **`src/hooks/cogniblend/useLcPass3Regenerate.ts`** — add the defensive `logWarning` if both mutations pend simultaneously. No behavioural change to existing payloads.

No DB migration. No edge function change. No new dependency. Every touched file stays ≤ 250 lines (R1).

## Behaviour after fix

| Button clicked | Mutation fired | Edge fn payload | Confirm dialog text | Progress label | Resulting status | Success toast |
|---|---|---|---|---|---|---|
| **Run AI Pass 3** (page or stale-banner) | `runPass3` | `{ pass3_mode: true }` | *"Re-run Pass 3 will replace the agreement with a freshly AI-generated version…"* | *"AI is enhancing the unified agreement…"* | `ai_suggested` | *"Legal AI review completed"* |
| **Organize & Merge** (page) / **Re-organize** (stale-banner) | `organizePass3` | `{ pass3_mode: true, organize_only: true }` | *"Organize & Merge will rebuild the agreement verbatim from your uploaded source documents…"* | *"Organizing & merging source documents…"* | `organized` | *"Source documents organized & merged"* |

Red diff highlighting and the "No changes…" info toast continue to work for both flows because they're driven by the shared `armRegenerate` callback regardless of which mutation ran.

## Verification

1. Click **Organize & Merge** on the page → confirm dialog says "Organize & Merge…"; progress bar says "Organizing & merging source documents…"; on completion toast says "Source documents organized & merged"; DB row's `ai_review_status = 'organized'`.
2. Click **Run AI Pass 3** on the page → confirm dialog says "Re-run Pass 3…"; progress bar says "AI is enhancing the unified agreement…"; toast says "Legal AI review completed"; DB row's `ai_review_status = 'ai_suggested'`.
3. Same outcomes when triggered from the stale-banner inside the panel (Re-organize vs Re-run Pass 3).
4. Edge-function logs for `suggest-legal-documents` show `organize_only: true` only when Organize was clicked, and absent/false when Pass 3 was clicked.
5. Red highlights + "No changes…" info toast still work for both flows.
6. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Changing the regenerate-from-SOURCE_DOC architecture.
- Edge function changes.
- DB migrations.
- Renaming statuses or columns.
- Character-level diff or persisting highlights across reloads.

