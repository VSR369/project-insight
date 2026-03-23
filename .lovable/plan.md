

# Reuse Intake Form for Dashboard "View" + Spec Review Fixes

## Problem
When clicking "View" from the dashboard, users see a separate read-only page (`AMRequestViewPage`) with different layout than the "New Challenge" intake form. The user wants the **exact same form** used during creation to be shown — pre-filled with existing data and editable.

## Approach

### 1. Add Edit Mode to SimpleIntakeForm
- Add optional props: `challengeId?: string`, `initialData?: Partial<SimpleIntakeValues>`, `mode?: 'create' | 'edit'`
- When `challengeId` is provided, fetch challenge data from `challenges` table and pre-fill all form fields (title, problem_summary, solution_expectations, budget, timeline, sector, etc.)
- In edit mode, change "Submit" button to "Update" and call an update mutation instead of create
- Keep the same layout, formatting, and RichTextEditor with fullscreen support

### 2. Create a Wrapper Route for Edit/View
- Replace `AMRequestViewPage` route (`/cogni/my-requests/:id/view`) with a new lightweight wrapper page that:
  - Fetches the challenge ID from URL params
  - Loads challenge data
  - Renders `SimpleIntakeForm` with `mode="edit"` and pre-filled data
  - Includes the `GovernanceEngagementSelector` and `CreationContextBar` (same as the create page)

### 3. Update Dashboard Navigation
- In `MyActionItemsSection.tsx` and `MyRequestsTracker.tsx`, change the default "View" route from `/cogni/my-requests/:id/view` to `/cogni/challenges/:id/edit-intake` (or reuse the same `/cogni/my-requests/:id/view` path but swap the component)

### 4. Spec Review Page Fixes (from previous plan)
- **Domain Targeting**: Change `DomainTargetingCard` `<Collapsible defaultOpen>` → `<Collapsible>` (collapsed by default)
- **Solver Types**: Remove auto-repair `useEffect` that pre-selects solver types; wrap solver sections in `Collapsible` containers, collapsed by default
- **Content Formatting**: Use `SafeHtmlRenderer` for HTML content in `EditableSectionCard` read mode to preserve AM's original formatting

### 5. Role Equivalence (already migrated)
- The DB migration for CA/CR equivalence was already applied in the previous step

## Files to Modify

| File | Change |
|------|--------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add `challengeId`, `initialData`, `mode` props; add update mutation; pre-fill form from existing challenge data |
| `src/pages/cogniblend/AMRequestViewPage.tsx` | Replace with wrapper that renders `SimpleIntakeForm` in edit mode |
| `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | Keep route as-is (component swap handles it) |
| `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` | Keep route as-is |
| `src/components/cogniblend/spec/DomainTargetingCard.tsx` | Remove `defaultOpen` from Collapsible |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Remove solver auto-repair useEffect; wrap solver sections in collapsed Collapsible; use SafeHtmlRenderer for HTML content display |

## Data Flow

```text
Dashboard "View" click
  → /cogni/my-requests/:id/view
  → AMRequestViewPage (refactored)
  → Fetches challenge by ID
  → Renders SimpleIntakeForm(mode="edit", initialData={...})
  → Same layout as "New Challenge" page
  → User can edit and save updates
```

