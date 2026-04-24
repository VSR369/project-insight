

## Problem
CPA template content is stored as **plain text with `\n` line breaks** (verified via DB). It gets passed straight through `dangerouslySetInnerHTML` in `LegalDocumentViewer`, which expects HTML. Result: all newlines collapse into one unformatted blob with no paragraph breaks, no section spacing, no heading hierarchy, and the numbered-list CSS in `.legal-doc` never engages.

This affects every preview surface (QUICK, STRUCTURED, CONTROLLED) on the Creator form, the challenge detail card, and the curator renderer — wherever a CPA template is shown pre-freeze.

## Fix — client-side, preview-only
Add a small **plain-text-to-legal-HTML formatter** that runs inside the existing `interpolateCpaTemplate` pipeline (or right before it). It detects “this string has no HTML tags” and converts it to properly structured HTML following the contract patterns the templates already use:

- First line → `<h1>` (the “CHALLENGE PARTICIPATION AGREEMENT (…)” title)
- “Challenge: …” / “Organization: …” lines → centered subtitle paragraphs
- Lines matching `^\d+\.\s+[A-Z ]+$` (e.g. `1. PARTICIPATION`, `4. PRIZE AND PAYMENT`) → `<h2>` section headings
- Lettered sub-clauses inside a paragraph (`(a) … (b) …`) → preserved inline; or, if on their own lines, wrapped in `<ol class="legal-clauses">`
- Blank line → paragraph break
- Single newline inside a paragraph → space (re-flow)
- All other lines → `<p>…</p>`

The result feeds into the existing `.legal-doc` stylesheet, which already styles `h1`, `h2`, `h3`, `p`, `ol`, signature blocks, etc. with proper Georgia serif, indentation, line height 1.8, and section borders.

## Important
- **DB content is NOT changed.** Server-side `assemble_cpa` is untouched. Stored templates keep their plain-text form.
- **Variable interpolation order:** format-to-HTML runs FIRST (raw text), then `interpolateCpaTemplate` substitutes `{{vars}}` into the formatted HTML. This way the `[Not set: …]` chips render correctly inside `<p>` tags.
- **Already-HTML content** (uploaded `SOURCE_DOC` DOCX/TXT replacements processed via mammoth, or the SPA template if it’s HTML) is detected by presence of `<` tags and passes through untouched.

## Files

### NEW — `src/services/legal/legalTextFormatter.ts` (~80 lines)
Pure function `formatLegalPlainText(input: string): string`.
- Returns `input` unchanged if it already contains HTML tags (`<p>`, `<h1>`, `<div>`, etc.)
- Otherwise applies the rules above to produce contract-grade HTML
- One-line helper `isLikelyHtml(s)` shared with the interpolator

### EDIT — `src/services/legal/cpaPreviewInterpolator.ts`
- Inside `interpolateCpaTemplate`: call `formatLegalPlainText(template)` first, then run the `{{var}}` regex on the resulting HTML. Variable replacement still works because the regex only matches `{{key}}` tokens, not HTML tags.
- Update `analyzeTemplateCompleteness` to scan the **raw template** (not the formatted version) — already does; no change.

### EDIT — `src/components/cogniblend/creator/CreatorLegalPreview.tsx`
- For the “View Template” dialog when showing the **uploaded replacement** (currently rendered without interpolation), also pass it through `formatLegalPlainText` so a plain-text TXT upload still renders cleanly. DOCX uploads are already converted to HTML via mammoth and will pass through untouched.

### EDIT — `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`
- Same one-line change: when rendering `viewingDoc.content`, run it through `formatLegalPlainText` before (or as part of) `interpolateCpaTemplate`. Assembled post-freeze docs are already HTML, so the formatter is a no-op for them. Pre-freeze previews and TXT uploads benefit.

### EDIT — `src/components/cogniblend/curation/renderers/LegalDocsSectionRenderer.tsx`
- Same one-line change inside the View dialog renderer.

### EDIT — `src/styles/legal-document.css`
Two small additions to support the formatted content:
- `.legal-doc .doc-meta` for the centered “Challenge: …” / “Organization: …” lines under the title (font-size 13.5px, muted, center-aligned, no bottom margin between them)
- `.legal-doc h2 + p` slight `margin-top` so the first paragraph after a numbered section heading breathes

## Non-changes
- `assemble_cpa` RPC, `seed_default_legal_docs`, all stored templates, AI passes, reviewed-mode flow, Solver `CpaEnrollmentGate`, LC/FC workspaces, org-level template editor — all untouched.

## Verification checklist
- Open “View Template” for QUICK / STRUCTURED / CONTROLLED with empty draft:
  - Title centered as `<h1>`
  - “Challenge: …” / “Organization: …” centered under title
  - Each `1. PARTICIPATION`, `2. CONFIDENTIALITY`, … rendered as bordered `<h2>` section with proper spacing
  - Body paragraphs in Georgia serif, 1.8 line-height, justified, with paragraph spacing
  - Lettered sub-clauses `(a)/(b)/(c)` readable
  - Missing variables still show as amber `[Not set: …]` chips inside paragraphs
- Fill in title, prize, IP model → values appear in correctly-formatted paragraphs
- TXT replacement upload also renders with formatting (no longer one blob)
- DOCX replacement (already HTML via mammoth) renders unchanged
- Post-freeze assembled doc on challenge detail card renders unchanged
- `npx tsc --noEmit` passes

