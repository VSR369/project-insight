

# Reuse CR/CA Intake Form for Dashboard "View" — Pre-filled with AM Data

## Status: ✅ IMPLEMENTED

## Changes Made

### 1. ConversationalIntakeContent — Edit Mode Added
- Added `challengeId` and `mode` props to `ConversationalIntakeContent`
- When `mode="edit"`, fetches existing challenge via `useChallengeDetail` and pre-fills all fields:
  - `problem_statement` → "Describe your challenge" textarea
  - `scope` → "Expected Outcomes" textarea
  - `maturity_level` → Maturity card selection
  - `reward_structure.budget_max` → Prize Amount
  - `currency_code` → Currency selector
  - `submission_deadline` → Deadline date picker
  - `extended_brief` → Expand Challenge Details fields (auto-expanded if populated)
  - `governance_profile` → Governance Mode cards
  - `operating_model` → Engagement Model selector
- Edit mode buttons: "Update Challenge" (saves and navigates to spec) + "Go to Spec Review"
- Create mode buttons: unchanged ("Generate with AI" + "Continue manually")

### 2. AMRequestViewPage — Unified Layout
- Now renders `ConversationalIntakeContent` in edit mode (exact same layout as "New Challenge")
- Users see the same template cards, form fields, and formatting as during creation

### 3. Spec Review Fixes (previously applied)
- `DomainTargetingCard`: Collapsed by default (no `defaultOpen`)
- Solver sections: Wrapped in `Collapsible` containers, collapsed by default
- Auto-repair useEffect: Removed (solver types start empty for manual selection)
- `SafeHtmlRenderer`: Used for HTML content in `SectionContent` to preserve AM formatting
