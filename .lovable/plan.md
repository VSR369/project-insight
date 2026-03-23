

# Fix: AM Dashboard View — Same Screen as New Challenge, with View/Edit Toggle

## What's Wrong
`AMRequestViewPage` renders `ConversationalIntakeContent` (CA/CR form) for all roles. AM users should see the exact same `SimpleIntakeForm` layout they used to create the challenge, starting in **read-only view mode** with an option to switch to edit.

## Changes

### 1. Add `view` mode to `SimpleIntakeForm`
**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

- Extend `mode` prop type: `'create' | 'edit' | 'view'`
- Add `isViewMode = mode === 'view'` flag
- When `isViewMode`:
  - All form fields become read-only/disabled (inputs get `disabled`, selects get `disabled`, rich text editors render as `SafeHtmlRenderer` instead of editable)
  - Hide "Expand" buttons on rich text fields
  - Hide action buttons (Submit/Save Draft)
  - Hide approval gate toggle (or show it disabled)
  - Content boxes dynamically hug their content (apply `editor-content-display` class on rich text containers)
- Pre-fill logic reuses the existing `useExistingChallenge` hook (same as edit mode)

### 2. Update `AMRequestViewPage` — role-aware with view/edit toggle
**File: `src/pages/cogniblend/AMRequestViewPage.tsx`**

- Import `useCogniRoleContext` to detect active role
- Add local state: `const [pageMode, setPageMode] = useState<'view' | 'edit'>('view')`
- Show a top-right "Edit" button when in view mode, "Back to View" when in edit mode
- Route by role:
  - **AM/RQ** → `<SimpleIntakeForm challengeId={id} mode={pageMode} />`
  - **CA/CR** → `<ConversationalIntakeContent challengeId={id} mode={pageMode} />` (existing behavior)
- Include `CreationContextBar` for both

### 3. Dynamic content box heights
Already handled by the `isViewMode` flag — rich text fields will render via `SafeHtmlRenderer` with `editor-content-display` class (content-hugging), and disabled select/input fields will retain their natural height. No fixed min-heights in view mode.

## Summary
- **SimpleIntakeForm** gets a third `view` mode (read-only, content-hugging)
- **AMRequestViewPage** becomes role-aware, defaults to view mode with edit toggle
- CA/CR dashboard view is untouched

