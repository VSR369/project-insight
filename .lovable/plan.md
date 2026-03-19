

# Unified Challenge Creation Page with Seamless AI ↔ Advanced Editor Toggle

## Problem
Currently "Create with AI" and "Advanced Editor" are separate pages at different routes. The Submit Request page shows a dismissible banner linking to the AI view. The user wants:
1. **AI view (Create with AI) as the default** — always open first
2. **Seamless toggle** between AI intake and Advanced Editor on the **same page** — no page navigation, just a tab/toggle switch

## Plan

### 1. Create a unified wrapper page: `ChallengeCreatePage.tsx`

**New file**: `src/pages/cogniblend/ChallengeCreatePage.tsx`

- Single page at route `/cogni/challenges/create`
- Contains a **tab toggle** at the top: "Create with AI" (default) | "Advanced Editor"
- Tab 1 renders the existing `ConversationalIntakePage` content (template cards, problem input, Generate with AI)
- Tab 2 renders the existing `ChallengeWizardPage` content (8-step wizard)
- Both share the same underlying challenge data so switching preserves state
- Default tab is always "Create with AI"

### 2. Extract ConversationalIntakePage into an embeddable component

**Modify**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Extract the main JSX into a `ConversationalIntakeContent` component that accepts an `onSwitchToEditor` callback prop
- The existing page becomes a thin wrapper that renders `ConversationalIntakeContent`
- Add a visible "Switch to Advanced Editor" button within the AI view (replaces the separate sidebar nav item)

### 3. Extract ChallengeWizardPage into an embeddable component

**Modify**: `src/pages/cogniblend/ChallengeWizardPage.tsx`

- Extract the wizard body into a `ChallengeWizardContent` component that accepts an `onSwitchToSimple` callback
- Add a "Back to AI View" link at the top of the wizard

### 4. Update routing and sidebar

**Modify**: `src/components/cogniblend/shell/CogniSidebarNav.tsx`
- Remove the separate "Advanced Editor" nav item — it's now a tab inside "Create with AI"
- Keep "Create with AI" as the single entry point with `requiredRoles: ['CR', 'AM', 'RQ']`

**Modify**: Router config
- `/cogni/challenges/create` → `ChallengeCreatePage` (unified)
- `/cogni/challenges/new` can redirect to `/cogni/challenges/create?tab=editor` for backward compat

### 5. Toggle UX design

At the top of the unified page, a pill toggle:
```text
[ ✨ Create with AI ]  [ ⚙ Advanced Editor ]
```
- Uses the existing `Tabs` component from `@/components/ui/tabs`
- Governance badge shown next to the toggle
- When AI generates a spec, it auto-switches to the editor tab with fields pre-filled

## Technical Details

- State sharing: Both views read/write the same `useState` for `problemStatement`, `template`, `maturityLevel`. The wizard form can be initialized from AI intake state.
- The toggle is a controlled `Tabs` component with `value` / `onValueChange`
- URL param `?tab=editor` allows deep-linking to the Advanced Editor tab
- Submit Request page (`/cogni/submit-request`) remains separate as the detailed manual form for AM/RQ power users

