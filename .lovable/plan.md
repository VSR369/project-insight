

# Fix: Hardcoded "Deliverable" Label in Line Items Editor

## Problem
The `DeliverablesEditor` component in `CurationSectionEditor.tsx` hardcodes "Deliverable" in two places:
- Placeholder text: `"Deliverable 1"`, `"Deliverable 2"`, etc.
- Add button: `"Add Deliverable"`

This component is reused for ALL `line_items` format sections — root causes, expected outcomes, current deficiencies, submission guidelines, approaches not of interest, etc. They all incorrectly show "Deliverable" as the item label.

## Fix

### File: `src/components/cogniblend/curation/CurationSectionEditor.tsx`
- Add optional `itemLabel` prop to `DeliverablesEditorProps` (default: `"Item"`)
- Use it in placeholder: `{itemLabel} {i + 1}` instead of `Deliverable {i + 1}`
- Use it in button: `Add {itemLabel}` instead of `Add Deliverable`

### File: `src/components/cogniblend/curation/renderers/LineItemsSectionRenderer.tsx`
- Accept and pass through an `itemLabel` prop to `DeliverablesEditor`

### File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Where `LineItemsSectionRenderer` is used for each section, pass the correct label:
  - `deliverables` → "Deliverable"
  - `expected_outcomes` → "Outcome"
  - `submission_guidelines` → "Guideline"
  - `root_causes` → "Root Cause"
  - `current_deficiencies` → "Deficiency"
  - `extended_brief_expected_outcomes` → "Outcome"
  - `approaches_not_of_interest` → "Approach"

### File: `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`
- Same — pass section-appropriate `itemLabel` where `DeliverablesEditor` or `LineItemsSectionRenderer` is used for Extended Brief subsections.

## Technical Detail
The label mapping can use the section's `label` from the `SECTIONS` array, or a simple lookup map to keep labels concise (e.g., "Root Cause" not "Root Causes & Contributing Factors").

