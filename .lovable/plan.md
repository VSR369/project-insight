

# Simplify Expected Outcomes — Remove Acceptance Criteria

## What changes

Expected Outcomes will use a lighter card format with only **Name** and **Description** — no acceptance criteria field. This requires adding a `hideAcceptanceCriteria` mode flag to the existing card components rather than creating separate components.

## Files

### 1. `DeliverableCardRenderer.tsx`
- Add `hideAcceptanceCriteria?: boolean` prop
- When true, skip the acceptance criteria block entirely (both the green filled block and the dashed "No acceptance criteria defined" placeholder)

### 2. `DeliverableCardEditor.tsx`
- Add `hideAcceptanceCriteria?: boolean` prop
- When true, hide the Acceptance Criteria textarea field in the editor form
- Ensure saved items still include `acceptance_criteria: ""` for type safety

### 3. `LineItemsSectionRenderer.tsx`
- Add `hideAcceptanceCriteria?: boolean` prop, pass through to both `DeliverableCardRenderer` and `DeliverableCardEditor`

### 4. `CurationReviewPage.tsx` (line ~2208)
- Pass `hideAcceptanceCriteria={true}` on the `LineItemsSectionRenderer` for the `expected_outcomes` case
- Update the `onSaveStructured` mapper to only persist `{ name, description }` (drop `acceptance_criteria`)

### 5. `AIReviewResultPanel.tsx`
- Pass `hideAcceptanceCriteria` through to `DeliverableCardRenderer` when rendering AI suggested outcomes (based on `badgePrefix === "O"` or a new prop)

