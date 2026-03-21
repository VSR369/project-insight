

## Plan: Curation Review Page — Major UX Overhaul

### Summary
Redesign the Curation Review Page with: collapsible checklist, inline rich-text editing for most sections, escrow in checklist, per-section AI review with comments, and bulk approve.

---

### Changes

#### 1. Collapsible Checklist Panel (CurationChecklistPanel.tsx)
- Add item #15: "Escrow funding confirmed" — auto-checked when `escrow_status === 'FUNDED'`. Need to pass `escrowRecord` into the panel props.
- Wrap the full checklist items list in a `Collapsible` component, defaulting to **collapsed**.
- When collapsed, show only the summary bar: "9/15 complete" + progress bar.
- When expanded, show all 15 items as currently rendered.
- Items **10 (Tier 1 legal), 11 (Tier 2 legal), and 15 (Escrow)** remain read-only (no manual override). All other items keep their existing auto-check + manual override behavior.

#### 2. Inline Rich-Text Editing for Sections (CurationReviewPage.tsx)
- Add `editingSection` state and `editedValues` state to track which section is being edited and the current draft values.
- For editable sections (items 1-9, 12-14 — i.e. everything **except** Legal Docs #10, Legal Templates #11, and Escrow #15), add an "Edit" button on each accordion section header.
- When editing, replace `SafeHtmlRenderer` / static content with the existing `RichTextEditor` component (for text fields like problem_statement, scope, description) or structured inline editors (for JSON fields like deliverables, evaluation_criteria).
- For structured JSON fields (deliverables, eval criteria, reward structure, phase schedule), use editable input/table components rather than RichTextEditor.
- Add "Save" and "Cancel" buttons per section. Save writes directly to `challenges` table via Supabase update.
- Non-editable sections (Legal Docs, Legal Templates, Escrow) show content as read-only with a lock icon and tooltip "Managed by LC/FC".

#### 3. Per-Section AI Review with Comments (New: CurationAIReviewButton)
- Add a "Review by AI" button at the **page header level** (next to the title).
- When clicked, it calls a new edge function `review-challenge-sections` that:
  - Fetches challenge data + legal docs + escrow + any uploaded documents (from storage).
  - Sends each section's content to the AI for individual review.
  - Returns per-section review comments with severity (pass/warning/issue).
- Display AI review comments inline under each accordion section as a collapsible "AI Review" sub-panel with colored badges.
- Each section gets a checkbox for "Approve this section".

#### 4. Bulk Approve / Select All (CurationReviewPage.tsx)
- Add a "Select All" checkbox at the top of the sections list.
- Add section-level approval checkboxes that the curator can toggle individually or via "Select All".
- The existing "Submit to Innovation Director" button checks that all sections are approved.
- Approval state is local (not persisted) — it's a gating mechanism before submission.

#### 5. New Edge Function: `review-challenge-sections`
- Similar to `check-challenge-quality` but returns **per-section** review comments.
- Input: `{ challenge_id }`.
- Fetches: challenge fields, legal docs, escrow record, uploaded files metadata.
- AI prompt asks for section-by-section review with: section_key, status (pass/warning/needs_revision), comments (string[]).
- Uses structured output via tool calling.

---

### Files to Create
- `supabase/functions/review-challenge-sections/index.ts` — new per-section AI review edge function

### Files to Modify
- `src/pages/cogniblend/CurationReviewPage.tsx` — add editing state, RichTextEditor integration, per-section AI review display, section approval checkboxes, "Review by AI" button, "Select All" approval
- `src/pages/cogniblend/CurationChecklistPanel.tsx` — add escrow item #15, wrap in Collapsible, pass escrow data, lock items 10/11/15

### Technical Notes
- Existing `RichTextEditor` component (Tiptap-based) is reused for text fields.
- JSON fields (deliverables, eval criteria, etc.) will use editable input tables rather than rich text.
- The `check-challenge-quality` edge function is kept as-is (overall scoring). The new `review-challenge-sections` provides granular per-section commentary.
- Supabase `challenges` table update for saves — no schema changes needed.

