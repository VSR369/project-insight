

# Legal Docs & Escrow Funding — Two Independent Action Areas

## Current State

The current implementation partially implements this but has these deviations from the specification:

1. **Accept Section** button is inside the panel body (at bottom, after content) — spec says it should be in the **panel header** next to the View Only badge and fullscreen button.
2. **"Send for Modification"** button is also in the panel body — spec says the only send action should be inside the **AI review result panel** as "Send to LC" / "Send to FC", not a standalone button.
3. **AI review panel** for locked sections currently shows "Refine with AI" → Accept/Discard flow (content rewriting), which makes no sense for read-only sections. For legal_docs/escrow_funding, the AI panel should only show **comments** with a "Send to LC" or "Send to FC" button — never "Refine with AI" or "Accept & Save".
4. **No confirmation dialog** for Accept Section.
5. **No Undo** after acceptance.
6. **No "Pending Response" / "Response Received" / "AI Reviewed"** status states — only "view_only", "pending_modification", "curator_approved" exist currently.
7. **No audit trail recording** of accept/send actions with metadata (ai_review_was_run, comments_sent_to_coordinator).

---

## Implementation Plan

### 1. Update `SectionStatus` type and `StatusBadge` component

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**

Add new status values: `"ai_reviewed"`, `"pending_response"`, `"response_received"`, `"accepted"`.

Update `StatusBadge` to render:
- `ai_reviewed` → Blue "AI Reviewed"
- `pending_response` → Amber "Pending Response"
- `response_received` → Teal "Response Received"
- `accepted` → Green "Accepted" (replaces `curator_approved`)

### 2. Restructure CuratorSectionPanel header for locked sections

**File: `src/components/cogniblend/curation/CuratorSectionPanel.tsx`**

Move the **Accept Section** button into the header bar (next to the fullscreen ⤢ button), only for locked sections. The header layout becomes:

```text
[▼] Label  [View Only]  [Status badge]  [⤢]  [Accept Section]
```

When accepted: replace button with gray "Accepted" label + small "Undo" link.

Remove the Approve/Send for Modification buttons from the panel body entirely. The body only shows content + AI review slot.

Add **confirmation dialog** for Accept Section:
- "Confirming that [Legal Documents / Escrow & Funding] has been reviewed and is approved for challenge publication."
- [Cancel] [Confirm Accept]

Add **Undo Accept** that reverts status by deleting the approval record.

### 3. Modify AIReviewInline for locked sections — comments-only mode

**File: `src/components/cogniblend/shared/AIReviewInline.tsx`**

Add `isLockedSection` prop. When true:
- **Hide** "Refine with AI" / "Draft with AI" button entirely
- **Hide** Accept/Discard in the result panel
- **Show** editable comments (same as now — curator can edit AI comments)
- **Show** "Send to LC" or "Send to FC" button at the bottom of the comments area
- The button label is determined by `sectionKey`: `legal_docs` → "Send to LC", `escrow_funding` → "Send to FC"
- After a send has been done, button changes to "Send Follow-up"

Pass new props: `isLockedSection`, `onSendToCoordinator`, `coordinatorRole` ("LC" | "FC"), `hasSentBefore` (boolean).

### 4. Wire "Send to LC/FC" to open SendForModificationModal with pre-filled AI comments

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

For locked sections, when building `aiReviewContent`:
- Pass `isLockedSection={true}` to `CurationAIReviewInline`
- Pass `onSendToCoordinator` callback that opens the `SendForModificationModal` pre-filled with the edited AI comments
- Pass `coordinatorRole` based on section key

### 5. Update SendForModificationModal to accept pre-filled comments

**File: `src/components/cogniblend/curation/SendForModificationModal.tsx`**

Add optional `initialComment` prop and `aiOriginalComments` prop. When provided:
- Pre-fill the comment field with the curator's edited AI comments
- Store `aiOriginalComments` separately in the record for audit

### 6. Update handleApproveLockedSection with audit metadata

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

Enhance the approval insert to include:
- `ai_review_was_run`: boolean (check if aiReviews has entry for this section)
- `comments_sent_to_coordinator`: boolean (check sectionActions for send records)

Add Undo handler that deletes the approval record and invalidates query cache.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/cogniblend/curation/CuratorSectionPanel.tsx` | New status types, Accept in header, confirmation dialog, Undo, remove body action buttons |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Add `isLockedSection` mode — hide refine/accept, show Send to LC/FC |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | No changes — locked sections won't reach the result panel |
| `src/components/cogniblend/curation/SendForModificationModal.tsx` | Accept `initialComment` + `aiOriginalComments` props |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Wire new props, update approval handler with audit fields, add undo handler |

## No Database Changes

The existing `curator_section_actions` table already supports the required fields (`action_type`, `status`, `comment_html`, `priority`). The `ai_original_comments` field can be stored in the existing `comment_html` alongside the curator edits, or we add it as a new column. Given the prompt requires it stored separately, a migration to add `ai_original_comments TEXT` to `curator_section_actions` would be needed.

**Migration**: Add `ai_original_comments` column to `curator_section_actions` table.

