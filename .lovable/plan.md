

# Plan — Finish wiring the diff extensions so removed content shows as strikethrough

## Why you can't see strikethroughs today

`src/components/cogniblend/lc/Pass3EditorExtensions.ts` exists and exports the three custom extensions (`ParagraphWithClass`, `HeadingWithClass`, `DiffAddedMark`), and `src/styles/legal-document.css` already styles `.legal-diff-removed` (muted box, line-through, "− REMOVED" badge) and `.legal-diff-removed-section` (trailing dashed panel). The diff utility correctly emits both classes.

But `LcPass3ReviewPanel.tsx` still mounts the editor with **plain `StarterKit`** — its built-in Paragraph and Heading nodes have no `class` attribute defined, so when `editor.commands.setContent(annotated)` runs, TipTap parses the HTML and silently drops every `class="legal-diff-removed"` and `class="legal-diff-added"` on `<p>` / `<h1-h6>`, plus every `<span class="legal-diff-added">` wrapper. The annotated HTML reaches the editor; the markup is then thrown away during parse; you see plain text (and removed paragraphs that match existing ones get visually deduped, looking like "they disappeared").

## Single fix — wire the three extensions into the editor

**File:** `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`

1. Add a static (non-lazy) import:
   ```ts
   import {
     ParagraphWithClass,
     HeadingWithClass,
     DiffAddedMark,
   } from './Pass3EditorExtensions';
   ```
2. In the existing `useEditor({ extensions: [...] })` call, replace `StarterKit` with `StarterKit.configure({ paragraph: false, heading: false })` and insert the three custom extensions **before** any other extensions that depend on Paragraph/Heading (e.g. `TextAlign`):
   ```ts
   extensions: [
     StarterKit.configure({ paragraph: false, heading: false }),
     ParagraphWithClass,
     HeadingWithClass,
     DiffAddedMark,
     Underline,
     TextAlign.configure({ types: ['heading', 'paragraph'] }),
     Placeholder.configure({ placeholder: '…' }),
     buildHeadingGuard(review.protectedHeadings),
   ]
   ```
3. No other changes in the panel. Keep the file ≤ 250 lines (add 4 lines, remove 1).

That's the entire code change. Everything else (diff utility output, CSS, `stripDiffSpans` on save/accept, the provenance strip, the delta-aware toast) is already in place from the prior plan.

## Mount-safety check

After the edit:
- Reload `/cogni/challenges/{id}/lc-legal` — no schema errors in the console.
- DevTools: confirm the editor DOM contains live `<p class="legal-diff-removed">…</p>` and `<span class="legal-diff-added">…</span>` after a Re-organize / Re-run. (Before the fix, these classes are absent from the rendered DOM even though they exist in the HTML passed to `setContent`.)

If TipTap throws *"Schema is missing node type 'paragraph'"* at mount, it means `ParagraphWithClass` isn't being registered before `StarterKit.configure({paragraph:false})` evaluates — the static import + explicit array order above prevents this.

## Behaviour after fix (using the row currently in your DB)

The current `organized` row contains 6 placeholder sections + 4 sections drawn from the DOCX. After wiring the extensions:

1. **Re-run AI Pass 3** → editor will show:
   - Red `<span>` insertions inside each section that AI Pass 3 expands beyond the placeholder.
   - For each old placeholder paragraph the AI replaces, the placeholder shows above the new clause as **struck-through, muted, with a "− REMOVED" badge**.
   - Toast: *"Re-run AI Pass 3 complete — N paragraphs added, M removed."*
2. **Re-organize again** → reverse direction; AI-Pass-3 clauses that aren't in the new merge appear as struck-through removed blocks (or grouped in the trailing *"Removed in this version"* panel if their `<h2>` heading no longer exists in the merge).
3. **Clear** → all red and strikethrough markings vanish; document content intact.
4. **Save Draft** → DB row contains zero `legal-diff-*` substrings (`stripDiffSpans` already runs in `useLcPass3Mutations.saveEdits`).
5. **Accept Legal Documents** → `.is-accepted` rule hides removed blocks and neutralises additions; clean signed contract.

## Files touched

| File | Change |
|---|---|
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | Add 3-line import + reconfigure StarterKit + insert 3 custom extensions in the `useEditor` array |

No DB migration. No edge function change. No new dependency (`@tiptap/extension-paragraph` and `@tiptap/extension-heading` were installed in the previous step).

## Verification

1. `npx tsc --noEmit` passes.
2. Load LC Legal page → no console errors → editor renders the current `organized` content as before (no markings yet, because no new run has been triggered post-wiring).
3. Click **Re-run AI Pass 3** → red insertions visible **and** strikethrough removed blocks visible (or trailing "Removed in this version" panel) → toast shows the add/remove count.
4. DOM inspection: `document.querySelectorAll('.legal-diff-added').length > 0` and `.legal-diff-removed` (or `.legal-diff-removed-section`) present.
5. **Save Draft** → query `challenge_legal_docs.ai_modified_content_html` → no `legal-diff-` substring.
6. File size: `LcPass3ReviewPanel.tsx` stays ≤ 250 lines.

## Out of scope

- Real PDF text extraction (would unblock the `legal_architecture_requirements.md.pdf` source so the 6 placeholder sections become populated — separate ~80-line `pdfjs-dist` change; flag if you want it as a follow-up).
- Word-level intra-paragraph diff.
- Any server-side / prompt change — server is already producing the right organize output.

