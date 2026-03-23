

# Reuse CR/CA Intake Form for Dashboard "View" — Pre-filled with AM Data

## Problem
When CA/CR clicks "View" or "Review Spec" from the dashboard, they're taken to the `AISpecReviewPage` (spec review). The user wants the **exact same form** as the "New Challenge" creation page (the `ConversationalIntakeContent` layout shown in the screenshot) — with template cards, problem description, expected outcomes, maturity level, prize, deadline, files — but pre-filled with the AM's data and editable.

## Current Flow
```text
CA clicks "Review Spec" → /cogni/challenges/:id/spec → AISpecReviewPage
CA clicks "View"        → /cogni/my-requests/:id/view → SimpleIntakeForm (AM's form, wrong layout)
```

## Target Flow
```text
CA clicks "Review" → /cogni/challenges/:id/spec → ConversationalIntakeContent in edit mode
                     Same layout as "New Challenge" screenshot
                     Pre-filled with AM's data (title, problem, budget, timeline, etc.)
                     Editable → "Update" button instead of "Generate with AI"
```

## Implementation

### 1. Add Edit Mode to ConversationalIntakeContent
File: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Add props: `challengeId?: string`, `mode?: 'create' | 'edit'`
- When `mode="edit"`, fetch challenge data and pre-fill all fields:
  - `selected_template` → from challenge metadata
  - `problem` → from `problem_statement`
  - `expected_outcomes` → from `scope`
  - `maturity_level` → from `maturity_level`
  - `prize_amount` / `currency` → from `reward_structure`
  - `deadline` → from `submission_deadline` or `phase_schedule`
  - Industry segment → from `eligibility`
  - Solution expectations → from `scope` / `extended_brief`
- In edit mode:
  - Change "Generate with AI" button to "Update Challenge"
  - Change "Continue manually" to "Save & Continue to Spec Review"
  - Call update mutation instead of create
  - Keep all field formatting, fullscreen support, template cards (read-only in edit mode)

### 2. Update AISpecReviewPage Route to Use Intake Form
File: `src/pages/cogniblend/AISpecReviewPage.tsx` (or a new wrapper)

- When CA/CR navigates to `/cogni/challenges/:id/spec`, show the ConversationalIntakeContent in edit mode instead of the current spec review layout
- OR create a wrapper page that embeds `ConversationalIntakeContent` with `mode="edit"` and the challenge ID

### 3. Update AMRequestViewPage
File: `src/pages/cogniblend/AMRequestViewPage.tsx`

- For CA/CR viewing, render `ConversationalIntakeContent` in edit mode (same as creation layout)
- Keep AM/RQ using `SimpleIntakeForm` for their own view

### 4. Update Dashboard Routing
Files: `MyActionItemsSection.tsx`, `MyRequestsTracker.tsx`

- CA/CR "Review" action should route to the edit-mode intake form page
- No changes needed if we reuse the existing `/cogni/challenges/:id/spec` route with the new component

### 5. Spec Review Fixes (carried forward)
- `DomainTargetingCard.tsx`: Remove `defaultOpen` from Collapsible
- `AISpecReviewPage.tsx`: Remove solver auto-repair useEffect; wrap solver sections in collapsed Collapsible; use SafeHtmlRenderer for HTML content

## Data Mapping (AM fields → Intake form fields)

| AM Field (DB) | Intake Form Field |
|---|---|
| `problem_statement` | "Describe your challenge" textarea |
| `scope` | "Expected Outcomes" textarea |
| `maturity_level` | "What do you need back?" maturity cards |
| `reward_structure.budget_max` | "Prize Amount" input |
| `reward_structure.currency` | Currency selector |
| `submission_deadline` / `phase_schedule` | "Submission Deadline" date picker |
| `extended_brief` fields | "Expand Challenge Details" collapsible |
| `eligibility.industry_segment_id` | Industry segment (if shown) |

## Files Modified

| File | Change |
|---|---|
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Add `challengeId` + `mode="edit"` props; fetch & pre-fill; swap buttons |
| `src/pages/cogniblend/AMRequestViewPage.tsx` | Render ConversationalIntakeContent for CA/CR, SimpleIntakeForm for AM/RQ |
| `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | Verify routing for CA/CR view actions |
| `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` | Verify routing for CA/CR view actions |
| `src/components/cogniblend/spec/DomainTargetingCard.tsx` | Collapse by default |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Remove solver auto-repair; collapse solver sections; SafeHtmlRenderer for HTML |

