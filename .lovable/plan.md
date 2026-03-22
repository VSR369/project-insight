

# Plan: Link Challenge Configuration to Demo Roles & Workflow

## Problem

The demo login page's "Challenge Configuration" section (Governance Mode + Engagement Model) is visually present but **disconnected** from the demo user list and workflow steps below. When the user selects **Marketplace (MP)**, the first role card should show **Account Manager (AM)** — not Challenge Requestor (RQ). The workflow steps should also adapt (e.g., Step 1 role label changes from "RQ / CR" to "AM / CR").

## Business Rules

- **Marketplace (MP)**: Step 1 actor = Account Manager (AM), direct provider browsing
- **Aggregator (AGG)**: Step 1 actor = Challenge Requestor (RQ), platform-mediated

## Changes

### 1. `src/pages/cogniblend/DemoLoginPage.tsx`

**a) Dynamic DEMO_USERS list based on engagement model:**
- Replace the static `DEMO_USERS` array with a function `getDemoUsers(engagementModel: string)` that returns the appropriate user list
- When MP: First entry uses `nh-am@testsetup.dev` (or falls back to existing email) with roles `['AM']`, label "Account Manager", and MP-specific descriptions
- When AGG: First entry uses `nh-rq@testsetup.dev` with roles `['RQ']` (current behavior)
- The Solo user also adapts: MP includes AM in their role set, AGG includes RQ

**b) Dynamic workflow steps based on engagement model:**
- Pass `engagementModel` as a prop to `DemoWorkflowSteps`
- Step 1 role label changes: MP → "AM / CR", AGG → "RQ / CR"
- Step 1 AI/manual notes adapt accordingly

### 2. `src/components/cogniblend/demo/DemoWorkflowSteps.tsx`

- Add optional `engagementModel` prop
- Dynamically resolve Step 1 role label and notes based on engagement model
- MP: "AM submits problem brief" / AGG: "RQ shares idea"

### 3. `src/pages/cogniblend/DemoLoginPage.tsx` (continued)

**c) Wire governance mode to workflow display:**
- Pass `governanceMode` to `DemoWorkflowSteps` so the step descriptions can reflect governance differences (e.g., QUICK mode shows "auto-complete" notes, CONTROLLED shows "formal gates")

## Files Modified

| File | Changes |
|------|---------|
| `DemoLoginPage.tsx` | Make DEMO_USERS dynamic based on engagement model; pass engagement model + governance mode to workflow steps |
| `DemoWorkflowSteps.tsx` | Accept engagement model prop; adapt Step 1 role/notes dynamically |

## What is NOT Changed

- `ChallengeCreatePage.tsx` — already correctly reads sessionStorage overrides
- `SimpleIntakeForm.tsx` — already adapts based on operating model at runtime
- `ConversationalIntakePage.tsx` — already receives props

