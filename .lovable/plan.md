

## Context Library Redesign — 8 Changes

### Overview
Three edge function improvements for better content extraction and digest quality, plus five frontend changes to redesign the Context Library UX with inline actions, explicit digest generation, and rich text editing.

### Change 1 — Smarter URL extraction (Edge Function)
**File:** `supabase/functions/extract-attachment-text/index.ts`

After HTML stripping (line 83), when content is sparse (<500 chars but >100 chars — the existing <100 check catches truly empty pages), extract meta tags (og:title, og:description, meta description, h1 tags) before stripping. Build a structured meta-only output instead of a placeholder bracket message. Set `method = 'url_meta_only'`.

Also: always extract meta tags from rawText before stripping, and store them even when HTML extraction succeeds (they provide clean titles/descriptions).

### Change 2 — Extraction quality gate before digest
**File:** `supabase/functions/generate-context-digest/index.ts`

After fetching accepted attachments (line 50), filter to only include sources with real content: `text.length > 100` and not starting with `[` (placeholder markers). If zero usable sources remain, return a clear error: `"No sources have extractable content yet"`.

### Change 3 — Full text in digest, raise limits
**File:** `supabase/functions/generate-context-digest/index.ts`

Replace the source block builder (lines 80-87) to use `extracted_text.substring(0, 15000)` instead of `extracted_summary || extracted_text.substring(0, 3000)`. Include full text, summary, and key data per source. Raise `max_tokens` from 3000 to 6000 in the AI call (line 157).

### Change 4 — Redesigned ContextLibraryDrawer
**Files:** New components, refactored `ContextLibraryDrawer.tsx`

Split the drawer into sub-components (each <200 lines):

| New/Changed File | Purpose |
|---|---|
| `ContextLibraryDrawer.tsx` | Thin orchestrator — state + layout only (~150 lines) |
| `context-library/DrawerHeader.tsx` (NEW) | Title, action buttons, URL/file input rows (~120 lines) |
| `context-library/DigestPanel.tsx` | Redesigned — always full-width below source panels, uses RichTextEditor, explicit "Generate Context" button |

Layout change: DigestPanel moves from inside the right column to a full-width section below the source list + detail split. The "Generate Context from N sources" button replaces the auto-regeneration.

### Change 5 — Decouple digest generation from accept
**File:** `src/hooks/cogniblend/useContextLibrary.ts`

- Remove `generate-context-digest` calls from `useAcceptSuggestion` (line 202-204), `useAcceptMultipleSuggestions` (line 252-254), `useAddContextUrl` (line 352-354), `useUploadContextFile` (line 315-317), and `useReExtractSource` (line 399).
- Add a new `useGenerateContextDigest` mutation (dedicated, explicit) that calls `generate-context-digest` and is wired to the "Generate Context" button in DigestPanel.
- The existing `useRegenerateDigest` can be renamed/reused for this purpose — it already does exactly this. The DigestPanel will expose a "Generate Context from N sources" button when `acceptedCount > 0` and no digest exists or curator wants to regenerate.
- "Confirm & Close" on DigestPanel sets `contextLibraryReviewed = true` and closes the drawer.

### Change 6 — Replace Textarea with RichTextEditor in DigestPanel
**File:** `src/components/cogniblend/curation/context-library/DigestPanel.tsx`

Replace the `<Textarea>` (line 181) with the existing `<RichTextEditor>` component. The editor already exists at `@/components/ui/RichTextEditor` and is used throughout the curation module. Props: `value={draft}`, `onChange={setDraft}`. The Compare tab's plain `whitespace-pre-wrap` divs become `dangerouslySetInnerHTML` renders since content will now be HTML.

### Change 7 — Source detail empty state handling
**File:** `src/components/cogniblend/curation/context-library/SourceDetail.tsx`

Add an extraction status banner at the top of the detail panel when `extraction_status !== 'completed'`:
- `pending` → "Content extraction in progress..."
- `processing` → "Extracting... (up to 30 seconds)"
- `failed` → "Extraction failed: {error}" + Retry button
- `url_html_sparse` (check `extraction_method`) → "Page requires JavaScript — only metadata captured. Consider adding key facts manually to the digest."

Per-tab empty states:
- **Summary tab**: "Content not yet extracted" + Extract Now button (if pending/failed)
- **Full Text tab**: Show extraction status indicator. If `url_html_sparse`, show the meta content and explain why. If failed, show error.
- **Key Data tab**: If null but extraction completed, show "No structured data found in this source" with neutral message.

### Change 8 — SourceList inline accept/reject already exists
The current `SourceList.tsx` already delegates to `SuggestionCard.tsx` which has inline Accept (check) and Reject (X) buttons per row (lines 91-107 of SuggestionCard). This is already implemented. The only addition needed: add an inline "remove" button on accepted source rows to move them back to suggested status.

**File:** `src/components/cogniblend/curation/context-library/SourceList.tsx`

Add an `onUnaccept` prop and render a small X button on each accepted source row to revert its status to `suggested`.

**File:** `src/hooks/cogniblend/useContextLibrary.ts`

Add `useUnacceptSource` mutation that updates `discovery_status` back to `suggested`.

### Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/extract-attachment-text/index.ts` | Meta tag extraction for sparse HTML |
| 2 | `supabase/functions/generate-context-digest/index.ts` | Quality gate + full text (15K) + max_tokens 6000 |
| 3 | `src/components/cogniblend/curation/context-library/DrawerHeader.tsx` | NEW — extracted header from ContextLibraryDrawer |
| 4 | `src/components/cogniblend/curation/ContextLibraryDrawer.tsx` | Simplified orchestrator, full-width digest below panels |
| 5 | `src/components/cogniblend/curation/context-library/DigestPanel.tsx` | RichTextEditor, explicit "Generate Context" button, full-width layout |
| 6 | `src/components/cogniblend/curation/context-library/SourceDetail.tsx` | Extraction status banner, per-tab empty states |
| 7 | `src/components/cogniblend/curation/context-library/SourceList.tsx` | Add unaccept button on accepted rows |
| 8 | `src/hooks/cogniblend/useContextLibrary.ts` | Remove auto-digest from accept/upload mutations, add useUnacceptSource |
| 9 | `src/components/cogniblend/curation/context-library/index.ts` | Export DrawerHeader |

