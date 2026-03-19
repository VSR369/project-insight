

# Analysis: Data Isolation Between AI Intake and Advanced Editor Tabs

## Problem Found

The two tabs maintain **completely independent state**. They are separate React components, each with their own `useForm` instance:

- **AI Intake** (`ConversationalIntakeContent`): owns `intakeSchema` with 2 fields (`problem_statement`, `maturity_level`) plus `selectedTemplate` state
- **Advanced Editor** (`ChallengeWizardPage`): owns `ChallengeFormValues` with 50+ fields via a separate `useForm`

When a user toggles between tabs:
- Data typed in AI intake does **not** appear in the Advanced Editor
- Data filled in the Advanced Editor does **not** appear back in AI intake
- If AI generates a spec, it creates a new challenge record and navigates away — it never populates the editor tab
- The user sees two blank, disconnected forms that feel like separate products

This is confusing. A user who types a problem statement in "Create with AI", then clicks "Advanced Editor", expects to see that text carried over. Instead they see an empty wizard.

## Fix Plan

### 1. Lift shared state into `ChallengeCreatePage`

**File**: `src/pages/cogniblend/ChallengeCreatePage.tsx`

Create shared state at the parent level and pass it down to both tabs:

```text
ChallengeCreatePage (shared state owner)
  ├── problemStatement, selectedTemplate, maturityLevel
  ├── ConversationalIntakeContent (reads/writes shared state)
  └── ChallengeWizardPage (initializes form from shared state)
```

Shared state: `problemStatement`, `maturityLevel`, `selectedTemplate`, `generatedSpec` (AI output).

### 2. Update ConversationalIntakeContent to use lifted state

**File**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Accept props: `sharedProblem`, `sharedMaturity`, `sharedTemplate`, `onStateChange`
- Sync its internal form with the shared state on change
- When AI generates a spec, store it in shared state AND auto-switch to editor tab

### 3. Update ChallengeWizardPage to accept initial values from shared state

**File**: `src/pages/cogniblend/ChallengeWizardPage.tsx`

- Accept new prop: `initialFromIntake?: { problemStatement, maturityLevel, template, generatedSpec }`
- When `initialFromIntake` changes, populate the wizard form fields (title, problem_statement, scope, maturity_level, domain_tags, etc.)
- When user edits wizard fields, sync key fields back to shared state via `onStateChange` callback

### 4. Auto-switch to editor after AI generation

**File**: `src/pages/cogniblend/ChallengeCreatePage.tsx`

- When the AI intake generates a spec successfully, store the full spec in shared state
- Auto-switch to the "Advanced Editor" tab
- The wizard picks up the generated spec and pre-fills all fields
- This replaces the current behavior of navigating to a separate spec review page

### 5. Visual continuity indicator

**File**: `src/pages/cogniblend/ChallengeCreatePage.tsx`

- Show a small status line below the tabs: "Problem statement and template selections are shared between views"
- When AI has generated a draft, show: "AI draft loaded — review and refine below"

## Technical Details

- Shared state is a simple `useState` in `ChallengeCreatePage` — no context provider needed since both consumers are direct children
- The wizard's `useForm` will use `form.reset()` when `initialFromIntake` changes via a `useEffect`
- The AI intake's internal form syncs to shared state via `onChange` handlers on the problem textarea and maturity cards
- The `generatedSpec` object matches the existing `generate-challenge-spec` response shape, so the wizard can map it directly to `ChallengeFormValues`
- Standalone page usage (backward compat) still works — when props aren't provided, components fall back to internal state

