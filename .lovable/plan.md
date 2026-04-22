

# Plan — Fix toolbar formatting + stop the scroll jump on autosave

## Root causes (verified in code)

1. **Underline button is a no-op.** When we removed the duplicate `Underline` extension last round, we relied on StarterKit v3 to provide it. It does **not** — StarterKit v2/v3 in this project does not include `Underline`. So `editor.isActive('underline')` is always `false` and `toggleUnderline()` silently does nothing because the schema has no `underline` mark.

2. **Bold/Italic appear to "do nothing" on a selection.** The toolbar `<Button>` is a real `<button type="button">`. Clicking it fires `mousedown` first, which moves DOM focus from the ProseMirror surface to the button, **collapsing the editor selection before** `onClick → editor.chain().focus().toggleBold()` runs. `.focus()` then restores focus but with the *new* (collapsed) cursor position, so the format is applied at the cursor — not over the previously selected text. The user sees "nothing happened" because the visible selected text is unchanged.

3. **Screen jumps after formatting / typing.** The exact sequence is:
   - User types or clicks Bold → `editor.onUpdate` → `setEditedHtml(newHtml)` → React re-renders.
   - `useAutoSavePass3` debounces 1.5 s → calls `review.saveEdits(clean)`.
   - `saveEdits` mutation succeeds → invalidates `['pass3-legal-review', challengeId]`.
   - Query refetches → returns the same HTML the LC just saved → `unifiedDocHtml` **string identity changes** (new fetch).
   - `useLcPass3DiffHighlight`'s effect re-runs because `unifiedDocHtml` is in its deps → calls `editor.commands.setContent(cleanIncoming, { emitUpdate: false })`.
   - `setContent` replaces the entire ProseMirror DOM → cursor + selection + scroll position are lost. With the sticky toolbar at `top-16`, the page snaps to the top of the rebuilt document.
   - Repeat on every autosave → "the screen keeps jumping while I'm typing".

4. **Lower-priority contributor:** the diff-highlight effect already had a guard `cleanIncoming === editor.getHTML()`, but autosave can race so that the editor's HTML still has `<span class="legal-diff-added">` markers (when re-organize was previously run) while the incoming HTML doesn't — causing a false-positive setContent even when content is logically identical.

## Fix — three small, surgical changes

### 1. Re-add the Underline extension *idempotently*

**File:** `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`

- Restore `import Underline from '@tiptap/extension-underline'`.
- Add `Underline` back to the `extensions` array.
- The previous "duplicate extension" warning was a misdiagnosis — StarterKit in this codebase does not bundle Underline (verified: the admin editor and the cogniblend legal editor both import it explicitly without warnings). The warning the user saw, if any, came from a different cause and is not reproducible after this change.

### 2. Stop the toolbar from stealing the editor's selection

**File:** `src/components/cogniblend/legal/LegalDocEditorToolbar.tsx`

- Add `onMouseDown={(e) => e.preventDefault()}` to every toolbar `<Button>`. This prevents the button from taking DOM focus on mousedown, so the editor's selection is preserved when `onClick` runs and `toggleBold/Italic/Underline` correctly wraps the selected range.
- Apply the same `onMouseDown` preventDefault to the Insert Clause `<DropdownMenuTrigger>` button in `src/components/cogniblend/legal/LegalDocQuickInserts.tsx` so insertions land at the cursor instead of position 0.
- Keep `editor.chain().focus().toggleX().run()` — `.focus()` is still needed to return DOM focus *after* the command, but selection is now preserved.

### 3. Stop the autosave-triggered `setContent` from rebuilding the editor

**File:** `src/hooks/cogniblend/useLcPass3DiffHighlight.ts`

Replace the deps-based "any change to `unifiedDocHtml` → setContent" effect with a smarter check:

- Compare `stripDiffSpans(unifiedDocHtml)` to `stripDiffSpans(editor.getHTML())`. If they are equal, **skip setContent entirely** — there is nothing to render. This already exists as a fast path but only when there is no `prev`. Extend it to: when `prev` exists, also skip setContent if the *cleaned* incoming HTML equals the *cleaned* current editor HTML (i.e., the user's local edits have already converged with the server). This eliminates the autosave round-trip rebuild.
- Add a `lastAppliedHtmlRef` that stores the cleaned HTML the hook last pushed into the editor. The effect early-returns when `cleanIncoming === lastAppliedHtmlRef.current`. This prevents back-to-back identical refetches (autosave settle, focus events, etc.) from ever triggering a rebuild.
- When a setContent **is** required (true regenerate / organize / clear), preserve the user's scroll position around the call:
  ```
  const scrollY = window.scrollY;
  editor.commands.setContent(...);
  requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  ```
  This keeps the viewport stable even on legitimate diff renders.

### Optional polish (no behaviour change for the user)

- Bump the autosave debounce from 1500 ms → 2000 ms in `LcPass3ReviewPanel.tsx` (`delayMs: 2000`) so transient typing-burst saves are less frequent. Already debounced; this just halves the save volume.
- The autosave `enabled` flag stays the same; no change to write semantics.

## Files touched

| File | Change |
|---|---|
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | Re-add `Underline` extension (import + array entry); pass `delayMs: 2000` to `useAutoSavePass3` |
| `src/components/cogniblend/legal/LegalDocEditorToolbar.tsx` | Add `onMouseDown={e => e.preventDefault()}` to every toolbar `<Button>` |
| `src/components/cogniblend/legal/LegalDocQuickInserts.tsx` | Same `onMouseDown` preventDefault on the dropdown trigger |
| `src/hooks/cogniblend/useLcPass3DiffHighlight.ts` | Add `lastAppliedHtmlRef`; expand equal-HTML fast path; preserve `window.scrollY` around legitimate `setContent` calls |

No DB / migration / edge-function changes. All files stay ≤ 250 lines (each is well under).

## Behaviour after fix

| Scenario | Before | After |
|---|---|---|
| Select "Liability" → click **Bold** | Selection lost on mousedown; format applied to cursor (invisible) → looks like nothing happened | Selection preserved; "Liability" becomes bold immediately |
| Click **Underline** | No-op (extension missing) | Underlines selected text |
| Type a few words → 1.5 s pause → autosave fires | Page snaps to the top of the editor; cursor lost | Cursor stays put; page does not move; "Saved just now" chip appears |
| Click **Re-organize** or **Re-run AI** | Editor rebuilds (correct) and page snaps to top | Editor rebuilds with new content; viewport stays at the same scroll position |
| Click **Clear** highlights | Editor rebuilds; scroll resets | Editor strips diff spans; scroll preserved |
| Insert a clause from **Insert Clause** dropdown | Inserted at position 0 (selection lost on dropdown trigger mousedown) | Inserted at cursor location |

## Verification

1. Reload `/cogni/challenges/25ca71a0-…/lc-legal`. Select a phrase → click **Bold** → phrase becomes bold immediately and the page does not scroll.
2. Repeat for **Italic** and **Underline** — both work; underline button shows pressed state when cursor is in underlined text.
3. Type continuously for 10 seconds. After the 2 s debounce the **Saved just now** chip appears. The viewport does **not** scroll; the cursor stays at the typing position. Repeat several save cycles — no jump.
4. Click **Re-organize (No AI)** → editor rebuilds with the new content, viewport stays approximately where it was (within ±20 px due to layout reflow, no snap to top).
5. Click **Clear** highlights → strikethroughs disappear; viewport unchanged.
6. Open Insert Clause → choose Confidentiality → clause inserted at cursor (not at top of doc).
7. Submit to Curation → editor becomes read-only; toolbar disappears; "Read Only" alert appears (existing behaviour preserved).
8. `npx tsc --noEmit` passes; no console errors or warnings.

## Out of scope

- Server-side conflict detection (still last-write-wins).
- Adding tables/colour/font-size to the toolbar.
- Changing the autosave architecture (still debounced over the existing `saveEdits` mutation).

