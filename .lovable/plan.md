

# Plan — Stop "Re-run Pass 3" from being the only regenerate button inside the editor

## 5-Whys analysis (evidence-based)

I inspected the live DB row, the edge function logs, the session replay, and every component on the path. **The Organize action is, in fact, running Organize end-to-end** — the system is behaviorally correct. The bug is a **UX confusion bug**, not a wiring bug.

| Why | Finding |
|---|---|
| **Why 1.** When the user clicked **Organize**, did Pass 3 run on the server? | **No.** Edge function logs show ONE invocation at 13:27 with the Organize prompt. The DB row written at 13:28 has `ai_review_status='organized'`. |
| **Why 2.** Why does the user perceive "Pass 3 ran"? | The session replay shows the dialog said "Organize & Merge", the progress bar said "Organizing & merging…", and the success toast said "Source documents organized & merged". So far correct. **But the editor's bottom action row shows ONE big button labelled "Re-run Pass 3"** as the only regenerate option. After Organize completes the user's eyes land on that button and they read it as "Pass 3 is being / was run". |
| **Why 3.** Why is "Re-run Pass 3" the only button at the bottom of the editor? | `Pass3EditorBody.tsx` (line 107-118) has a single `ConfirmRegenerateDialog` wired to `onRerun` — which the parent always wires to `review.runPass3()`. There is no Organize counterpart at the bottom. |
| **Why 4.** Why does that bottom button's confirm dialog reinforce the confusion? | The bottom dialog has **no `mode` prop**, so `ConfirmRegenerateDialog` falls back to `mode='pass3'`. Even if the user just ran Organize, clicking that bottom button shows the **Pass 3** confirmation copy. |
| **Why 5. (root cause)** Why was the editor bottom never updated when we added the dual Organize / Pass 3 model? | When we split the two flows (handler in regenerate hook, dialog mode prop, page-level button pair, stale-banner button pair), the **bottom-of-editor regenerate row was missed**. It's still the single legacy "Re-run Pass 3" button, with no Organize sibling and no `mode` on its dialog. |

## What's actually broken

`Pass3EditorBody.tsx`:
- Has **one** regenerate button labelled *"Re-run Pass 3"* always wired to `onRerun → runPass3()`.
- Its `<ConfirmRegenerateDialog>` has no `mode` prop → defaults to `pass3` copy.
- After the user has just run **Organize**, the only visible regenerate button beneath the document still says "Re-run Pass 3" — which makes the user think Pass 3 is what runs. There is no way to **Re-organize** from inside the editor without scrolling back up or waiting for the stale banner.

What's NOT broken (verified):
- Page-level Organize / Run AI Pass 3 buttons in `LcSourceDocUpload` are correctly wired to two separate handlers (`onOrganizeOnly → organizePass3`, `onRunPass3 → runPass3`) with correct dialog modes.
- Stale-banner buttons in `Pass3StatusStrip` are correctly wired to `onReorganize` and `onRerunAi` with correct dialog modes.
- `useLcPass3Regenerate` invokes the edge function with the correct payloads (`organize_only: true` only for Organize).
- The edge function writes `ai_review_status='organized'` for Organize, `'ai_suggested'` for Pass 3.
- The status strip correctly shows "Organized & Merged from sources" after Organize.

## Fix — Two regenerate buttons at the bottom of the editor, both labelled clearly

### A. `Pass3EditorBody.tsx` — replace the single `onRerun` button with two

Add a sibling **Organize & Merge** button next to the existing **Re-run Pass 3** button. Each gets its own confirm dialog with the correct `mode`.

New props (additive — no breaking change to other callers):
```ts
onReorganize: () => void;   // wired to organizePass3
isOrganizing: boolean;      // distinct loading state for the Organize button
```

Render in the bottom action row:
```tsx
<ConfirmRegenerateDialog
  onConfirm={onRerun}
  skipConfirm={!hasDraft}
  isDirty={isDirty}
  disabled={isRunning || isOrganizing || isSaving || isAccepting}
  mode="pass3"
  trigger={<Button variant="outline" className="gap-2"><Sparkles className="h-4 w-4"/>Re-run AI Pass 3</Button>}
/>
<ConfirmRegenerateDialog
  onConfirm={onReorganize}
  skipConfirm={!hasDraft}
  isDirty={isDirty}
  disabled={isRunning || isOrganizing || isSaving || isAccepting}
  mode="organize"
  trigger={<Button variant="outline" className="gap-2"><FileText className="h-4 w-4"/>Re-organize (No AI)</Button>}
/>
```

The existing **Re-run Pass 3** button gets `mode="pass3"` explicitly (instead of falling back), and a `Sparkles` icon to match the page-level Pass 3 button.

### B. `LcPass3ReviewPanel.tsx` — pass the Organize handler down

Wire the new prop:
```tsx
<Pass3EditorBody
  ...
  onRerun={() => review.runPass3()}
  onReorganize={() => review.organizeOnly()}
  isRunning={review.isRunning}
  isOrganizing={review.isOrganizing}
/>
```

This re-uses the **single shared** `useLcPass3Review` instance hoisted on the page, so the editor-bottom buttons use the same mutations as the page-level and stale-banner buttons. Loading state, progress bar, diff highlight, and "no changes" toast all flow through the existing single source of truth.

### C. Defensive: explicit `mode` everywhere

Audit every `<ConfirmRegenerateDialog>` instance (page-level, stale banner, editor bottom) to ensure every one passes an explicit `mode` prop. Remove the `mode='pass3'` default from `ConfirmRegenerateDialog` so a future missing prop becomes a TypeScript error rather than a silent confusion bug.

`ConfirmRegenerateDialog.tsx`: change `mode?: ConfirmRegenerateMode` (default `'pass3'`) to **`mode: ConfirmRegenerateMode`** (required, no default).

## Files touched

1. **`src/components/cogniblend/lc/Pass3EditorBody.tsx`** — add `onReorganize` + `isOrganizing` props; add the second confirm dialog + button; give the existing button explicit `mode="pass3"` and a `Sparkles` icon.
2. **`src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`** — pass `onReorganize={() => review.organizeOnly()}` and `isOrganizing={review.isOrganizing}` to `Pass3EditorBody`.
3. **`src/components/cogniblend/lc/ConfirmRegenerateDialog.tsx`** — make `mode` a required prop (remove default), so any future missing-mode wiring fails at compile time.

No DB migration. No edge function change. No new dependency. Every touched file stays ≤ 250 lines (R1).

## Behaviour after fix

| Surface | Buttons visible | Each button shows |
|---|---|---|
| **Source-doc card (top of page)** | Run AI Pass 3 · Organize & Merge | Correct dialog mode, correct mutation |
| **Stale banner inside panel** | Re-run AI Pass 3 · Re-organize | Correct dialog mode, correct mutation |
| **Bottom of editor (NEW)** | Re-run AI Pass 3 · Re-organize (No AI) · Save · Accept | Correct dialog mode, correct mutation |

A user editing the document who wants to re-trigger Organize no longer has to scroll up. A user who clicks the bottom "Re-organize" button gets the correct Organize confirmation copy and the Organize mutation runs (not Pass 3). The Sparkles vs FileText icon difference matches the page-level pair, reinforcing the conceptual split.

## Verification

1. Click **Organize & Merge** on the page → dialog says "Organize & Merge?", progress says "Organizing & merging…", toast says "Source documents organized & merged", DB row `ai_review_status='organized'`.
2. With the editor showing the organized draft, click the **bottom "Re-organize (No AI)"** button → dialog says "Organize & Merge?", progress says "Organizing & merging…", toast says "Source documents organized & merged", DB row `ai_review_status='organized'` (run_count incremented).
3. Click the **bottom "Re-run AI Pass 3"** button → dialog says "Re-run AI Pass 3?", progress says "AI is enhancing the unified agreement…", toast says "Legal AI review completed", DB row `ai_review_status='ai_suggested'`.
4. Red diff highlights and "No changes…" toast continue to work for both editor-bottom buttons (they use the same shared review state).
5. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.
6. After making `mode` required on `ConfirmRegenerateDialog`, the TypeScript compiler verifies every call site provides one.

## Out of scope

- Renaming statuses, columns, or mutations.
- Edge function changes (none needed — server is correct).
- DB migration.
- Character-level diff or persisting highlights across reloads.

