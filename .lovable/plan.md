

# Fix: AI Intake Page Missing for Non-CR Roles + Clarify Simple vs Advanced Navigation

## Root Cause Analysis

The Conversational Intake page (template cards + "Generate with AI" button) at `/cogni/challenges/create` is **only visible to users with the CR (Creator) role**. Users with AM or RQ roles only see "Submit Request" — a detailed manual form with no template cards and no AI generation flow.

This means:
- **AM users (Marketplace)** never see the AI intake with template cards
- **RQ users (Aggregator)** never see the AI intake with template cards
- Only CR users get the simple AI-powered experience
- The "Submit Request" page is a completely separate, heavier form — not the AI-first experience

### Current Navigation (broken):
```text
AM/RQ roles:  Submit Request (manual form) → no AI cards
CR role:      Create Challenge (AI intake with templates) → Advanced Editor
```

### Target Navigation (fixed):
```text
ALL roles:    Create Challenge (AI intake with templates + Generate with AI)
                ├── Quick mode: AI generates, minimal review → done
                ├── Structured mode: AI assists → Advanced Editor for curation
                └── Controlled mode: AI assists → Advanced Editor (all fields mandatory)
              Submit Request stays as an alternative detailed form for AM/RQ
              Advanced Editor is always available as a power-user option
```

## Plan

### 1. Make AI Intake visible to AM and RQ roles (not just CR)

**File**: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

Change "Create Challenge" nav item from `requiredRoles: ['CR']` to `requiredRoles: ['CR', 'AM', 'RQ']`. This makes the template-card AI intake page accessible to all challenge-related roles.

### 2. Add governance mode awareness to the Conversational Intake page

**File**: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Read governance mode from `useCurrentOrg()` (org-level default)
- Show a small governance mode indicator (Quick/Structured/Controlled) at the top
- After AI generation:
  - **QUICK mode**: Go directly to AI Spec Review page (current behavior)
  - **STRUCTURED mode**: Go to AI Spec Review, then offer "Refine in Advanced Editor"
  - **CONTROLLED mode**: Go to AI Spec Review with warning that all fields must be manually verified, then require Advanced Editor review

### 3. Add "Simple View" link to Submit Request page

**File**: `src/pages/cogniblend/CogniSubmitRequestPage.tsx`

Add a prominent banner at the top: "Want a simpler start? Use AI to draft your challenge" with a link to `/cogni/challenges/create`. This ensures AM/RQ users who land on Submit Request can discover the AI intake.

### 4. Rename sidebar items for clarity

**File**: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

- "Create Challenge" → "Create with AI" (icon: Sparkles) — the AI intake
- "Submit Request" stays as-is for detailed manual submissions
- "Advanced Editor" stays as-is for power users
- Add a visual separator or grouping so the flow is: Create with AI → Submit Request → Advanced Editor

### 5. Add governance-aware routing helper

**File**: `src/lib/challengeNavigation.ts` (new)

Small utility that determines post-AI-generation routing based on governance mode:
- `getPostGenerationRoute(mode)` → returns the appropriate next page
- `shouldRequireAdvancedEditor(mode)` → true for CONTROLLED mode

This centralizes the routing logic so both the Conversational Intake and Submit Request pages behave consistently.

## Technical Details

**Sidebar nav change** — Single line: add `'AM', 'RQ'` to the `requiredRoles` array for the Create Challenge item. This uses the existing `isVisible()` function which checks if the user has any of the listed roles.

**ConversationalIntakePage governance awareness** — Read `currentOrg.governanceProfile`, resolve via `resolveGovernanceMode()`, and conditionally:
- Show a `GovernanceProfileBadge` near the header
- After AI generation, route based on mode (QUICK → spec review, CONTROLLED → spec review with mandatory editor step)

**Submit Request "Simple View" banner** — A styled info banner similar to the existing bypass banner, linking to `/cogni/challenges/create`.

