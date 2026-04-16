

## Plan: Export Challenge Preview as Professional PDF & Word

### Goal
Add **Download PDF** and **Download Word** buttons to the Preview page top bar that produce a top-tier consulting-firm-grade document with proper structure, typography, numbered headings, styled tables, bullet indentation, page breaks, header/footer, and cover page.

### Approach (client-side, fast, no backend)

Generate documents directly in the browser by building a clean, print-ready HTML representation of the challenge document using a dedicated stylesheet, then:

- **PDF**: render via `html2pdf.js` (already installed) — produces multi-page PDF with proper page breaks
- **Word**: convert the same HTML using a lightweight `html-docx-js` blob converter (new dep) — Word opens HTML-as-DOCX natively, preserving headings/tables/lists

This avoids server roundtrips, keeps the source-of-truth in one HTML builder, and gives a unified visual style across both formats.

### Visual design (consulting-firm grade)

- **Cover page**: Org logo placeholder, challenge title (large), hook/tagline, governance mode + status badges, "Prepared by [Org]", date, document classification footer
- **Table of Contents**: Auto-generated from numbered sections (1, 1.1, 1.2 …)
- **Typography**: Serif body (Georgia, similar to existing `legal-document.css`), sans-serif headings (system stack), proper hierarchy (H1 24pt, H2 18pt, H3 14pt, body 11pt, line-height 1.6)
- **Numbered sections**: Auto-numbered chapter/section/sub-section (CSS counters for PDF, manual prefixes for Word)
- **Bullets & nested lists**: Indented with proper marker styles (•, ◦, ▪)
- **Tables**: Header row with subtle background, zebra striping, thin borders, column padding, captions
- **Callouts/blockquotes**: Left-bordered styled blocks
- **Page header**: Challenge title (left) · page number (right)
- **Page footer**: "Confidential — [Org Name]" · generation date
- **Color palette**: Deep navy primary `#1a3a5c`, slate text `#1f2937`, light divider `#e5e7eb` (works in both PDF & Word; avoids CSS variables)

### Files to create

1. **`src/lib/cogniblend/preview/buildExportHtml.ts`** (≤200 lines)
   Pure function `buildChallengeExportHtml({ challenge, orgData, legalDetails, escrowRecord, digest, attachments, extendedBrief })` returning a complete `<html>…</html>` string. Walks the same `SECTIONS`/`GROUPS` order as `PreviewDocument`. Strips icons/emojis where inappropriate for print. Handles all section formats (rich text, lists, tables, checkboxes) by reusing existing renderers' output where safe and falling back to formatted plain text otherwise.

2. **`src/styles/export-document.css`** (≤180 lines)
   Self-contained print stylesheet (no Tailwind, no CSS vars) with @page rules, cover-page layout, numbered headings via CSS counters, table styling, list indentation, page-break rules (`page-break-inside: avoid` for tables/sections, `page-break-before: always` for groups).

3. **`src/lib/cogniblend/preview/exportChallengeDocument.ts`** (≤120 lines)
   Two functions:
   - `exportAsPdf(html, filename)` — uses `html2pdf.js` with A4, 15mm margins, image quality 0.98, page-break mode `['css','legacy']`
   - `exportAsDocx(html, filename)` — uses `html-docx-js` to convert HTML → DOCX blob, triggers download via FileSaver pattern

4. **`src/components/cogniblend/preview/PreviewExportMenu.tsx`** (≤120 lines)
   Dropdown button "Export ▾" with two items: "Download PDF" and "Download Word". Shows loading spinner while generating. Uses toast for success/error.

5. **`src/components/cogniblend/preview/PreviewTopBar.tsx`** (edit, +5 lines)
   Insert `<PreviewExportMenu …/>` next to existing badges, passing all required preview data.

6. **`src/pages/cogniblend/ChallengePreviewPage.tsx`** (edit, +1 prop)
   Pass `data` (challenge + org + legal + escrow + digest + attachments) into `PreviewTopBar` so the export menu has everything it needs.

### Dependency to add
- `html-docx-js` (~30KB, MIT, zero deps) — only new package; `html2pdf.js` already present

### Page-break & print quality details
- Each numbered section group (`PREVIEW_GROUPS`) starts on a new page in PDF (CSS `page-break-before: always`)
- Tables and signature blocks marked `page-break-inside: avoid`
- Headings get `page-break-after: avoid` so they never orphan
- Long rich-text sections allowed to flow across pages naturally
- Cover page is its own dedicated page

### Out of scope
- Server-side high-fidelity rendering (Puppeteer) — not needed for v1
- Brand logo upload (uses org name text on cover for now; can be added later)
- Localization of generated date/labels
- Saving generated files to Supabase Storage

### Verification after build
1. Open `/cogni/curation/:id/preview`, click Export → Download PDF — confirm cover page, TOC, numbered sections, styled tables, page header/footer
2. Click Export → Download Word — open in Word/Google Docs, confirm headings/lists/tables retain formatting
3. Verify long sections wrap across pages without clipping
4. Verify the export menu does not appear in print view (already excluded via top bar's print:hidden if needed)

### Files summary
- **NEW**: `buildExportHtml.ts`, `export-document.css`, `exportChallengeDocument.ts`, `PreviewExportMenu.tsx`
- **EDITED**: `PreviewTopBar.tsx`, `ChallengePreviewPage.tsx`
- **DEP**: `html-docx-js`

