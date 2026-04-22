

# Plan — Restore editor + add autosave before LC submits to curator

## Why the editor is locked today

Your unified agreement row has `ai_review_status='accepted'` because you clicked **Accept Legal Documents**. The panel reads that as "frozen forever" and:

1. Hides the toolbar (`{!isPass3Accepted && <Toolbar/>}` in `Pass3EditorBody.tsx:76`).
2. Hides the **Insert Clause** dropdown.
3. Sets `editor.editable = false` (`LcPass3ReviewPanel.tsx:86, 130`).
4. Hides the **Save Draft / Accept** action row (`Pass3EditorBody.tsx:182`).
5. Adds the `is-accepted` CSS class (greys diff markers).

But `lc_compliance_complete` is still `false` and the challenge is at `current_phase=2`. You **have not yet submitted to the curator**, so the document is not legally locked — it just looks that way because of the over-eager "accepted" gating. There is no autosave anywhere — only a manual Save Draft button, which is itself hidden once accepted.

A second, smaller defect: TipTap v3's `StarterKit` already bundles `Underline`, so the explicit `Underline` import causes a *"Duplicate extension names found"* console warning.

## What changes (3 files, all ≤ 250 lines)

### 1. `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`

- **Unlock editing as long as the LC has not submitted to the curator.** Replace the single `isPass3Accepted` gate that drives `editable` with a new prop `isLocked` (computed by the parent page from `challenge.lc_compliance_complete`). The doc-level `accepted` state still drives the green badge and the diff CSS dim, but no longer freezes the editor.
- Pass `isLocked` down to `Pass3EditorBody` instead of `isPass3Accepted` for the *write-permission* gates (toolbar visibility, Insert Clause visibility, action row visibility, `EditorContent` editable). Keep `isPass3Accepted` only for: the green "Approved" badge, the `is-accepted` CSS class on the document, and the attribution badge.
- **Wire autosave.** Add a `useAutoSavePass3` hook call (new file, see §3) that debounces `editedHtml` changes and calls `review.saveEdits` after 1.5 s of inactivity, only when `!isLocked`. Surface its `status` (`'idle' | 'saving' | 'saved' | 'error'`) and last-saved timestamp; pass them to `Pass3EditorBody` for an inline indicator.
- **Fix the duplicate-Underline warning.** Remove the explicit `import Underline from '@tiptap/extension-underline'` and the `Underline` entry in the `extensions` array — StarterKit v3 already includes it, and the toolbar's `editor.isActive('underline')` keeps working.

### 2. `src/components/cogniblend/lc/Pass3EditorBody.tsx`

- Add props `isLocked: boolean`, `autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'`, `autoSavedAt: string | null`.
- Replace every `!isPass3Accepted` gate that controls *write affordances* (toolbar, Insert Clause, action row) with `!isLocked`. Keep `isPass3Accepted` only for the `is-accepted` CSS class on the `.legal-doc` wrapper and the `Pass3AttributionBadge`.
- **Re-label** the bottom action row when the doc is `accepted` but not yet locked:
  - "Save Draft" stays as-is (now also redundant because of autosave, but kept for explicit user reassurance).
  - "Accept Legal Documents" becomes "Re-confirm Acceptance" (same handler) — so the LC can re-accept after edits.
- Add a small inline **autosave indicator** beside the toolbar:
  - `idle` → no chip
  - `saving` → spinner + "Saving…"
  - `saved` → check + "Saved {relative time}"
  - `error` → red dot + "Auto-save failed — click Save Draft"

### 3. `src/hooks/cogniblend/useAutoSavePass3.ts` (NEW, ≤ 80 lines)

```ts
useAutoSavePass3({
  html: string,                  // current editedHtml from editor
  baselineHtml: string,          // last persisted html (review.unifiedDocHtml)
  enabled: boolean,              // !isLocked
  saveFn: (html: string) => void,// review.saveEdits
  isSaving: boolean,             // review.isSaving
  delayMs?: number,              // default 1500
}) → { status, lastSavedAt }
```

- Internally: `useEffect` watches `html`. If `enabled && stripDiffSpans(html) !== stripDiffSpans(baselineHtml) && !isSaving`, schedule `setTimeout(saveFn, delayMs)`. Clears any prior timer on every change (debounce). Cancels on unmount.
- Status transitions: typing → `saving` (when timer fires + mutation starts) → `saved` (on `isSaving` falling edge with no error) → back to `idle` after 4 s → `error` if the mutation rejects (caught via React Query `onError` already routed through `handleMutationError`; here we read `review.isSaving === false && lastError != null`).
- No direct DB access — pure orchestration over the existing `review.saveEdits` mutation. Lives under `src/hooks/cogniblend/` per the layer rules.

### 4. `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

- Compute `const isLocked = !!challenge?.lc_compliance_complete;` and pass it to `<LcUnifiedAgreementCard isLocked={isLocked} … />`.

### 5. `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx`

- Forward the new `isLocked` prop straight into `LcPass3ReviewPanel`. (Pass-through only.)

## DB / migrations / edge functions

None. The existing `saveEdits` mutation already does `update challenge_legal_docs set ai_modified_content_html = …` with `withUpdatedBy`, and the existing RLS policy permits updates to drafts owned by an active LC. Autosave reuses it verbatim.

## Behaviour after fix

| State | Before | After |
|---|---|---|
| Doc `accepted`, not yet submitted to curator | Toolbar hidden, editor read-only, no Save button. User cannot edit. | Toolbar visible, editor editable, autosave active, "Accept" relabelled "Re-confirm Acceptance". Green "Approved" badge still shown. |
| User types in the editor | — | After 1.5 s of pause: silent autosave → `Saved a moment ago` indicator. |
| Autosave fails | — | Red `Auto-save failed — click Save Draft`; manual button still works. |
| LC clicks **Submit to Curation** → `lc_compliance_complete=true` | Identical | Editor becomes read-only, toolbar hides, "Legal Review Complete — Read Only" alert shows (existing behaviour). |
| Console | "Duplicate extension names found: ['underline']" warning | Gone. |

## Files touched

| File | Change |
|---|---|
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | Add `isLocked` prop; remove duplicate Underline; wire `useAutoSavePass3`; thread `isLocked` + autosave status into body |
| `src/components/cogniblend/lc/Pass3EditorBody.tsx` | Replace `!isPass3Accepted` write-gates with `!isLocked`; add autosave indicator chip; relabel Accept button when re-accepting |
| `src/hooks/cogniblend/useAutoSavePass3.ts` | NEW — debounced autosave orchestrator over `saveEdits` mutation |
| `src/pages/cogniblend/LcLegalWorkspacePage.tsx` | Compute and pass `isLocked` from `challenge.lc_compliance_complete` |
| `src/components/cogniblend/lc/LcUnifiedAgreementCard.tsx` | Pass-through new `isLocked` prop |

All files stay ≤ 250 lines. No `any`. No `console.*`. Mutation already uses `handleMutationError`. Hooks-before-returns order preserved.

## Verification

1. Reload `/cogni/challenges/25ca71a0-…/lc-legal`. Toolbar (Bold/Italic/Underline/H2/H3/Lists/Quote/HR/Undo/Redo) **and** Insert Clause dropdown are visible above the editor.
2. Type into the document → after ~1.5 s, indicator transitions `Saving… → Saved just now`.
3. Refresh the page → typed content persists (proves autosave wrote to DB).
4. DevTools console — no "Duplicate extension names" warning.
5. Click **Submit to Curation** → editor immediately becomes read-only, toolbar hides, the existing "Legal Review Complete — Read Only" alert renders.
6. As a CR (creator) opening the same workspace, behaviour is unchanged (CR has read-only access today).
7. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Adding a richer toolbar (tables/colour/font-size). Current toolbar covers Bold/Italic/Underline/H2/H3/Bullet/Numbered/Quote/HR/Undo/Redo + 8 quick-insert clauses, which is sufficient for legal markup.
- Server-side conflict detection (last-write-wins is fine for a single-LC workflow).
- Re-running AI Pass 3 / Re-organize after acceptance — those buttons remain in the action row and continue to work.

