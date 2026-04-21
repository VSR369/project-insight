

# Plan — Make track-changes actually visible in the editor + surface the "PDF had no text" disclosure

## Root cause (confirmed)

### Defect A — TipTap silently strips the diff markup

`useLcPass3DiffHighlight` correctly arms `armRegenerate(prevHtml,'changed')` and `annotateDiff` correctly produces `<span class="legal-diff-added">…</span>` and `<p class="legal-diff-removed">…</p>`. But `LcPass3ReviewPanel` then runs `editor.commands.setContent(annotated)` and `StarterKit` does **not** preserve unknown spans or unknown class attributes:

- `<span class="legal-diff-added">` — unregistered mark → span dropped, only inner text kept. Red highlight gone.
- `<p class="legal-diff-removed">` — Paragraph node spec has no `class` attribute defined → class discarded on parse. Strikethrough gone.

Net effect: the banner shows because `highlightActive=true`, but the editor renders the new content with **zero markings** and removed paragraphs simply vanish.

### Defect B — "PDF had no extractable text" reality is hidden

DB row for this challenge:

| Source doc | `content_html` |
|---|---|
| `M&M_Strategic Blueprint.docx` | 9,111 chars ✓ |
| `legal_architecture_requirements.md.pdf` | **NULL** |

The provenance strip says *"merged from 2 source documents"* — counting both even though the PDF contributed nothing. Misleading.

## Fix

### 1. Teach TipTap to preserve the diff markup

**New file:** `src/components/cogniblend/lc/Pass3EditorExtensions.ts` (~60 lines)

Three synchronous-export extensions:

- **`DiffAddedMark`** — TipTap `Mark` named `diffAdded`, parsed from `span.legal-diff-added`, rendered as `<span class="legal-diff-added">`.
- **`ParagraphWithClass`** — `Paragraph.extend({ addAttributes(){ return { class: { default: null, parseHTML: el => el.getAttribute('class'), renderHTML: a => a.class ? { class: a.class } : {} } } } })`.
- **`HeadingWithClass`** — same `class`-attribute extension applied to `Heading` (the diff util also tags `<h1>-<h6>`).

**Edit:** `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx`

Wire all three into `useEditor` exactly in this order, and disable StarterKit's built-in Paragraph + Heading so the overrides win:

```ts
extensions: [
  StarterKit.configure({ paragraph: false, heading: false }),
  ParagraphWithClass,    // synchronous import — required at mount
  HeadingWithClass,      // synchronous import — required at mount
  DiffAddedMark,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder: '…' }),
  buildHeadingGuard(review.protectedHeadings),
]
```

Imports are static `import { ParagraphWithClass, HeadingWithClass, DiffAddedMark } from './Pass3EditorExtensions'` — never lazy/dynamic — because TipTap requires the full extension set at mount or the schema crashes.

### 2. Defend the diff utility against orphan removed blocks (`src/lib/cogniblend/legal/diffHighlight.ts`)

- When a `prev` block has no preceding `<h2>` match in `next`, group all such removed blocks into a single trailing `<section class="legal-diff-removed-section">` after the last block, with a small heading *"Removed in this version (N clauses)"*.
- Skip injecting a removed block whose fingerprint also appears in `next` after lower-casing AND stripping leading list/section numbering (so "1.1 Definitions" vs "Definitions" doesn't false-positive).
- Extend `stripDiffSpans` selector to remove BOTH `.legal-diff-removed` and `.legal-diff-removed-section` (already removes additions). Save/Accept paths already call `stripDiffSpans` first → no diff markup ever persisted.
- **New export:** `summarizeBlockDiff(prev, next): { added: number; removed: number }` — reuses the existing block-walk; no new parsing pass.

### 3. Style the new section (`src/styles/legal-document.css`)

```css
.legal-doc .legal-diff-removed-section {
  margin-top: 32px;
  padding: 16px;
  border: 1px dashed hsl(var(--muted-foreground) / 0.4);
  border-radius: 4px;
  background: hsl(var(--muted) / 0.2);
}
.legal-doc .legal-diff-removed-section::before {
  content: 'Removed in this version';
  display: block;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  margin-bottom: 8px;
}
.legal-doc .legal-diff-removed-section > * {
  text-decoration: line-through;
  text-decoration-color: hsl(var(--destructive) / 0.5);
  color: hsl(var(--muted-foreground));
  opacity: 0.85;
}
.legal-doc.is-accepted .legal-diff-removed-section { display: none; }
```

### 4. Make source-doc provenance honest (`src/components/cogniblend/lc/Pass3EditorBody.tsx`)

- Filter `sourceDocNames` to docs where `content_html` is non-null/non-empty. Pass through a new `skippedSourceDocNames` prop for docs with no extractable text.
- Provenance strip now reads: *"Organize merged content from 1 source document: M&M_Strategic Blueprint.docx."* with a secondary line *"1 source had no extractable text and was skipped: legal_architecture_requirements.md.pdf."*
- When `hasUnverifiedSourceMatch` is true, add a small *"View AI summary"* `<details>` toggle showing `ai_changes_summary` from the unified-doc row (already in the React-Query cache via `useLcPass3Review` — no new fetch).

**Edit:** `LcPass3ReviewPanel.tsx` — compute the filtered + skipped lists from the existing `useSourceDocs` data and pass both into `Pass3EditorBody` along with `aiChangesSummary`.

### 5. Delta-aware success toast (`src/hooks/cogniblend/useLcPass3Regenerate.ts`)

In `reportOutcome`, when `outcome === 'changed'`, call `summarizeBlockDiff(prev, next)` and replace the generic toast with:

- Re-organize: *"Re-organize complete — N paragraphs added, M removed (red = added, strikethrough = removed)."*
- Re-run AI Pass 3: *"Re-run AI Pass 3 complete — N paragraphs added, M removed."*

When `outcome === 'unchanged'`, keep the existing "no substantive changes" toast.

## Files touched (all ≤ 250 lines after edit)

| File | Change |
|---|---|
| `src/components/cogniblend/lc/Pass3EditorExtensions.ts` (new, ~60 lines) | `DiffAddedMark`, `ParagraphWithClass`, `HeadingWithClass` — synchronous exports |
| `src/components/cogniblend/lc/LcPass3ReviewPanel.tsx` | Reconfigure StarterKit; wire 3 extensions; compute filtered + skipped source lists; pass `aiChangesSummary` through |
| `src/components/cogniblend/lc/Pass3EditorBody.tsx` | Honest provenance strip + skipped-sources line + `<details>` toggle |
| `src/lib/cogniblend/legal/diffHighlight.ts` | Trailing removed-section grouping; numbering-stripped fingerprint dedup; extend strip selector; export `summarizeBlockDiff` |
| `src/styles/legal-document.css` | `.legal-diff-removed-section` styles + `.is-accepted` hide rule |
| `src/hooks/cogniblend/useLcPass3Regenerate.ts` | Delta-aware success toast via `summarizeBlockDiff` |

No DB / migration / edge-function changes.

## Mount-safety check (per the StarterKit risk)

After the change I'll verify the editor mounts cleanly by:
1. Loading `/cogni/challenges/{id}/lc-legal` — no console schema errors.
2. Confirming `editor.schema.nodes.paragraph` and `editor.schema.nodes.heading` both exist (overrides registered).
3. Confirming `editor.schema.marks.diffAdded` exists.

If any of these fail at mount, TipTap throws a clear schema error and we'd see it immediately — but the synchronous-import + explicit-add ordering above prevents this.

## Verification

1. Reload LC Legal page (current state: `ai_review_status='organized'`, `unverified_source_match` flag set). Provenance strip: *"merged from 1 source document: M&M_Strategic Blueprint.docx. 1 source had no extractable text and was skipped: legal_architecture_requirements.md.pdf."*; `<details>` shows server `ai_changes_summary`.
2. Click **Re-run AI Pass 3** → editor shows red `<span>` insertions and a trailing struck-through *"Removed in this version (N clauses)"* section. Toast: *"Re-run AI Pass 3 complete — N added, M removed."*
3. Click **Re-organize** → same diff visualisation in reverse.
4. Click **Clear** → all markings vanish; document content intact.
5. Click **Save Draft** → query `challenge_legal_docs.ai_modified_content_html` → no `legal-diff-*` substring (confirmed via `stripDiffSpans` running before persistence in `useLcPass3Mutations.saveEdits`).
6. Click **Accept Legal Documents** → `.is-accepted` rule hides removed-section + neutralises additions; clean signed contract.
7. `npx tsc --noEmit` passes; every touched file ≤ 250 lines.

## Out of scope

- Real PDF text extraction (separate ~80-line `pdfjs-dist` change to unblock the second source).
- Word-level intra-paragraph diff.
- Server-side prompt or fidelity-check changes (already shipped).

