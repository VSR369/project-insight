

# Fix: Default Challenge Creation Should Open AI Intake, Not Advanced Editor

## Problem

Several navigation points across the app link to `/cogni/challenges/new` (the Advanced Editor / 8-step wizard) when they should link to `/cogni/challenges/create` (the Conversational AI Intake page). This means users bypass the simpler AI-powered flow.

## Affected Locations (3 files, 3 changes)

### 1. ActionItemsWidget — "Create Challenge" from active request
**File**: `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` (line 261)

Change: `/cogni/challenges/new` → `/cogni/challenges/create`

When a request is active and the user clicks "Create Challenge", it should open the AI intake flow.

### 2. Submit Request Page — "Create Challenge Directly" bypass button
**File**: `src/pages/cogniblend/CogniSubmitRequestPage.tsx` (line 451)

Change: `/cogni/challenges/new` → `/cogni/challenges/create`

The bypass banner button should also go to the AI intake, not the advanced editor.

### 3. New Solution Request Page — "Create Challenge Directly" bypass button
**File**: `src/pages/requests/NewSolutionRequestPage.tsx` (line 433)

Change: `/challenges/new` → `/cogni/challenges/create`

Same bypass pattern, wrong route.

## No other changes needed

The sidebar navigation is already correct:
- "Create Challenge" → `/cogni/challenges/create` (AI Intake) ✓
- "Advanced Editor" → `/cogni/challenges/new` (Wizard) ✓

The Conversational Intake page itself has correct links to the Advanced Editor as a fallback/alternative. Routes in `App.tsx` are correct.

