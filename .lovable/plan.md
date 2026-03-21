

## Plan: Grouped Focus Areas Redesign of Curation Review Page

### What Changes
Replace the current 2-panel layout (15 flat accordions left + sidebar checklist/AI/payment right) with a single-column grouped layout following the 5 design principles from the mockup.

### Architecture

**4 Groups replacing 15 flat items:**

| Group | Color | Items (section keys) |
|-------|-------|---------------------|
| Content (5) | Green | problem_statement, scope, deliverables, submission_guidelines, maturity_level |
| Evaluation (4) | Blue | evaluation_criteria, reward_structure, payment_schedule, complexity |
| Legal & Finance (4) | Amber | ip_model, legal_docs, escrow_funding, domain_tags |
| Publication (2) | Gray | phase_schedule, visibility_eligibility |

### Layout Changes

1. **Progress Strip (top)** — Horizontal bar with 4 group pills showing `Content (3/5)` etc. Color-coded: green=done, blue=in-progress, amber=needs-attention, gray=not-started. Clicking a pill scrolls/focuses that group.

2. **Right Rail (narrow, ~250px)** — Contains only: action buttons (Submit to ID, Return to Creator, Put on Hold), AI quality summary (score circle + gap count + "Full AI analysis" button), and modification cycle indicator. No checklist here.

3. **Main Content (left, ~75% width)** — Shows the currently focused group's items. Each item is a card with:
   - Checkbox + title + status badge (approved/missing/needs review) + AI flag inline
   - One-line summary when collapsed
   - Full content + Approve/Edit buttons when expanded
   - Only ONE item expanded at a time (single-value accordion)

4. **Payment Schedule** — Moves from sidebar into Evaluation group as an expandable item (reusing `PaymentScheduleSection` component inline).

5. **AI flags inline** — Instead of separate AI quality panel listing gaps, show gap messages directly on the affected item's header as amber warning text.

### Files to Modify

**`src/pages/cogniblend/CurationReviewPage.tsx`** (major rewrite of render section):
- Define `GROUPS` array mapping group name/color to section keys
- Replace `Accordion type="multiple"` with `Accordion type="single"` per group
- Add progress strip component at top
- Move action buttons + AI summary into narrow right rail
- Integrate PaymentScheduleSection as inline item in Evaluation group
- Map AI quality gaps to section keys for inline display
- Remove the right panel's `CurationChecklistPanel` and `AICurationQualityPanel` as separate blocks

**`src/pages/cogniblend/CurationChecklistPanel.tsx`**:
- Extract action buttons, return modal, submit logic, and modification cycle into a new exportable `CurationActions` component (or keep in checklist but render differently)
- The 15-item checklist rendering is no longer needed as a standalone panel; its auto-check logic is reused for the progress strip counts

**No new files needed** — this is a CSS/layout restructuring. Same data, same queries, same mutations, same 15 items.

### Technical Details

**Progress strip component** (inline in CurationReviewPage):
```
┌──────────────┬──────────────┬──────────────────┬──────────────┐
│ ● Content    │ ● Evaluation │ ● Legal&Finance  │ ○ Publication│
│   3/5        │   2/4        │   2/4            │   0/2        │
└──────────────┴──────────────┴──────────────────┴──────────────┘
```
- Each pill is a button that sets `activeGroup` state
- Filled count computed from existing `isFilled` functions per section
- Colors: all items done = green bg, some done = blue bg, has AI flag = amber bg, none = gray

**Single expanded item**: `Accordion type="single" collapsible` so only one item open at a time within the active group.

**AI flags inline**: When `AICurationQualityPanel` assessment exists, match `gap.field` to section keys and render `⚠ AI flagged: {message}` directly in the item header row.

**Right rail content** (slim):
- Submit to ID button
- Return to Creator button  
- Put on Hold button
- AI quality score circle (just the number + gap count)
- "Full AI analysis" button (opens modal or expands)
- Modification cycle: `1 of 3`

**Item card layout when expanded**:
- Full section content (same render functions)
- Bottom row: [Approve] [Edit] buttons
- AI review comments inline below content

### Migration Notes
- `CurationChecklistPanel`'s auto-check logic (`autoChecks[]`, `CHECKLIST_LABELS`) will be imported/reused for progress strip computation
- Action buttons, return modal, submit handler move from `CurationChecklistPanel` into the main page's right rail
- `PaymentScheduleSection` renders inline when payment_schedule item is expanded
- `AICurationQualityPanel` becomes a compact summary in right rail + its gaps render inline on items

