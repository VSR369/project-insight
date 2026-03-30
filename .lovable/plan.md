

# Reference Materials System — Files, URLs, Solver Sharing, Per-Section Matrix

## Summary

Implement a comprehensive reference materials system that extends the existing `challenge_attachments` infrastructure with URL support, solver sharing controls, and per-section upload configuration. This spans a DB migration, edge function updates (extraction + AI prompts), a new UI component, and a solver-facing reference panel.

## 4 Items, 6 Implementation Steps

### Step 1: Migration — Extend `challenge_attachments`

Add 7 new columns: `source_type`, `source_url`, `url_title`, `shared_with_solver`, `display_name`, `description`, `display_order`. Make `storage_path` and `mime_type` nullable for URL rows. Add CHECK constraints for source type validation.

**File:** New SQL migration

### Step 2: Edge Function — URL Extraction Branch

**File:** `supabase/functions/extract-attachment-text/index.ts`

Add a top-level branch before the existing file extraction logic:
- When `att.source_type === 'url'`: fetch the page with 15s timeout, strip HTML tags/scripts/nav/footer, store cleaned text
- Auto-populate `url_title` from `<title>` tag if missing
- Handle PDF URLs gracefully (placeholder message)
- Keep all existing file extraction code in an `else` block unchanged

### Step 3: Edge Function — Unified Prompt Injection

**File:** `supabase/functions/review-challenge-sections/index.ts`

Three changes to existing attachment handling code:

**3a. Fetch query** (lines ~1478-1498): Expand `select()` to include `source_type`, `source_url`, `url_title`, `shared_with_solver`. Change the type from `{ fileName, content }[]` to include `sourceType`, `sourceUrl`, `sharedWithSolver`.

**3b. Pass 1 attachment block** (lines ~1652-1661): Replace the simple `ATTACHED DOCUMENTS` block with the unified version that tags each reference as `[WEB PAGE]` or `[DOCUMENT]` and `[SHARED WITH SOLVERS]` or `[AI-ONLY]`. Append the `REFERENCE MATERIAL USAGE RULES` block.

**3c. Pass 2 per-section block** (lines ~688-693): Update to use the new type tags and sharing status.

### Step 4: Constants — Section Upload Config + Sharing Guidance

**File:** `src/lib/cogniblend/sectionUploadConfig.ts` (new)

Export `SECTION_UPLOAD_CONFIG` (all 27 sections: 18 enabled, 9 disabled) and `SHARING_GUIDANCE` (context-sensitive help text per section). Directly from the user's spec.

### Step 5: UI Component — `SectionReferencePanel`

**File:** `src/components/cogniblend/curation/SectionReferencePanel.tsx` (new)

A collapsible panel rendered inside each `CuratorSectionPanel` for upload-enabled sections:

- Collapsed by default, shows item count badge "📎 Reference Materials (3)"
- Two action buttons: "Upload File" (filtered by `acceptedFormats`) and "Add Web Link" (inline URL input)
- Per-item card showing: type icon, name, size/URL, extraction status, sharing toggle, display_name + description fields (visible when sharing ON), section-specific `SHARING_GUIDANCE` text
- Remove button per item
- Max count enforcement (files and URLs counted independently)
- File upload: creates `challenge_attachments` row with `source_type='file'`, uploads to storage, triggers `extract-attachment-text`
- URL add: creates row with `source_type='url'`, triggers `extract-attachment-text`
- Uses React Query for fetching/mutating attachments

**Integration into `CurationReviewPage.tsx`:** Render `<SectionReferencePanel>` inside each section's content area (within the `CuratorSectionPanel` children), checking `SECTION_UPLOAD_CONFIG[sectionKey].enabled`.

### Step 6: Solver Reference Panel

**File:** `src/components/cogniblend/curation/SolverReferencePanel.tsx` (new)

Read-only panel for published challenge view:
- Queries `challenge_attachments` where `shared_with_solver = true`
- Groups by section, displays `display_name`, `description`, file size/type
- Files: Download button via signed URL
- URLs: "Open Link" button linking to `source_url`

**Integration:** This needs to be placed in the published challenge detail page. Will identify the correct page component and add it.

## Files Modified/Created

| File | Action |
|------|--------|
| New SQL migration | Create — extend `challenge_attachments` |
| `supabase/functions/extract-attachment-text/index.ts` | Modify — add URL branch |
| `supabase/functions/review-challenge-sections/index.ts` | Modify — unified attachment fetch + prompt injection |
| `src/lib/cogniblend/sectionUploadConfig.ts` | Create — config + sharing guidance |
| `src/components/cogniblend/curation/SectionReferencePanel.tsx` | Create — curator UI |
| `src/components/cogniblend/curation/SolverReferencePanel.tsx` | Create — solver view |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Modify — render SectionReferencePanel per section |

