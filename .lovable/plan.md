

## Plan: Converge All Role Content into Curator Review Page

### Problem
The Curation Review page (`/cogni/curation/:id`) currently shows:
- Challenge spec content (from Creator) — problem statement, scope, deliverables, etc.
- Legal doc tier summary (count only — "2/3 attached")
- Checklist panel + AI quality panel

**Missing from Curator view:**
1. **Legal document full content** — LC-approved doc names, types, content summaries, and LC approval status
2. **Escrow / FC banking data** — Whether escrow is funded, bank name, deposit reference, currency, amount, FC notes
3. **Uploaded files** — Any supporting documents the Creator attached during intake
4. **Role contribution attribution** — Who contributed what (Creator, LC, FC)

### Changes

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

1. **Add new query: Legal document details** — Fetch full `challenge_legal_docs` rows (not just tier/status counts) including `doc_type_code`, `content_summary`, `lc_status`, `status`, `file_url`. Display each document in the "Legal Documents" accordion section with:
   - Document type label
   - LC approval badge (approved/pending/rejected)
   - Expandable content summary text
   - File link if uploaded

2. **Add new query: Escrow record** — Fetch from `escrow_records` where `challenge_id` matches. Add a new accordion section "Escrow & Funding" after Legal Documents showing:
   - Escrow status badge (FUNDED / PENDING / NOT_REQUIRED)
   - If funded: bank name, branch, currency, deposit amount, deposit date, deposit reference, FC notes
   - If not funded: warning that FC has not yet confirmed

3. **Add new query: Uploaded files** — Check if challenge has any attached files (from Creator intake). Add section "Supporting Files" showing file names with download links.

4. **Add attribution labels** — Each section header gets a subtle "(by Creator)", "(by LC)", "(by FC)" tag so the Curator knows the source of each content block.

5. **Update the SECTIONS array** — Replace the existing simple legal doc summary render with the full document detail view. Add the escrow section and files section to the array.

### What This Delivers
- Curator sees **all converged content** in one view: spec (Creator), legal docs with full text (LC), escrow data (FC), and uploaded files
- Each section is attributed to its source role
- Curator can make informed curation decisions without navigating to other workspaces
- Existing checklist panel and AI quality panel remain unchanged

### Files Modified
- `src/pages/cogniblend/CurationReviewPage.tsx`

