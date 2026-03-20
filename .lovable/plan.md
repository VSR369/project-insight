

## Plan: Add Edit Capability for Deliverables, Evaluation Criteria, and Solver Type Sections

### Problem
The `EditableSectionCard` hides the pencil (edit) button for any section with a structured renderer (`renderer !== 'text'`). This means:
- **Deliverables**: No edit option — display only
- **Evaluation Criteria**: No edit option — display only
- **Solver Eligibility/Visibility**: Already editable inline (checkboxes), but the edit button is hidden

### Changes — Single File: `src/pages/cogniblend/AISpecReviewPage.tsx`

**1. Deliverables — Add inline editor**
- Create `DeliverablesEditor` component: editable list where each item is a text input, with add/remove buttons
- When user clicks pencil on Deliverables section, switch to edit mode showing the editor
- On save, convert back to array format and persist via `sectionValues`

**2. Evaluation Criteria — Add inline editor**
- Create `EvaluationCriteriaEditor` component: editable table rows with inputs for name, weight (number), and description
- Add/remove row buttons; show live weight total with validation (must sum to 100%)
- On save, convert back to criteria array format

**3. Solver Eligibility & Visibility — Already editable**
- These already render `SolverTypeEditor` with checkboxes in STRUCTURED mode
- Just need to show the pencil/accept buttons for consistency (remove the `!isStructured` guard for these sections)

**4. Update `EditableSectionCard` logic**
- Remove the blanket `!isStructured` guard that hides the edit button
- Instead, allow edit mode for deliverables and evaluation_criteria renderers
- For solver sections, keep current always-visible editor behavior but add accept button

### Technical Details

- `DeliverablesEditor`: State is `string[]`, renders indexed `Input` fields + "Add Deliverable" button + per-item remove button
- `EvaluationCriteriaEditor`: State is `Array<{name, weight, description}>`, renders editable table rows + "Add Criterion" + per-row remove
- Save handler serializes structured data back to JSON string for `sectionValues`, and also stores raw data for display
- Need to add a `rawSectionData` state alongside `sectionValues` to handle structured data separately from plain text

