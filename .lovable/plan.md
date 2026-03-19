

# Critical Fix: Governance, Engagement Model, AI Integration & Role Consistency

## Problems Found

### 1. Sidebar shows hardcoded "LIGHTWEIGHT" badge
**File**: `CogniSidebar.tsx` line 44 — `const governanceProfile = 'LIGHTWEIGHT'` is hardcoded instead of reading from `useCurrentOrg()`. The top bar (`CogniTopBar.tsx`) correctly reads from `useCurrentOrg()` and shows "STRUCTURED" (since the seeded org has `ENTERPRISE` governance → resolves to `STRUCTURED`). But the sidebar shows stale "LIGHTWEIGHT".

**Fix**: Replace hardcoded values with `useCurrentOrg()` hook data in `CogniSidebar.tsx`.

### 2. AM role shown for Aggregator org — incorrect
Per the memory: *"Aggregator model: An Account Manager (AM) role is not required"* and *"In Aggregator mode, the system correctly identifies the acting role as a 'Challenge Requestor' (RQ) instead of an AM."*

However, the seed data assigns `AM` role to Alex Morgan in the AGG org (New Horizon). The `ROLE_DISPLAY` map names it "Account Manager". The Submit Request page is accessible to both `AM` and `RQ` roles.

**Issues**:
- The seed gives `AM` to an AGG org user — AM is an MP-specific role. AGG should use `RQ` (Challenge Requestor).
- The top bar shows "AM Account Manager" for an Aggregator org, which is contradictory.

**Fix**: Update seed config for AGG orgs to use `RQ` instead of `AM`. Keep `AM` only for MP orgs.

### 3. No "Generate with AI" option on the Submit Request page
The Conversational Intake page (`/cogni/challenges/create`) has AI generation, but the Submit Request page (`/cogni/submit-request`) has no AI assistance at all. Users filling out the detailed request form have no AI help for drafting the problem statement or expected outcomes.

**Fix**: Add an "AI Assist" button on the Submit Request page that uses the existing `generate-challenge-spec` edge function to help draft the problem statement and expected outcomes.

### 4. No AI assistance anywhere in the Advanced Editor wizard
The 8-step wizard has zero AI integration. Each step (Problem, Evaluation, Rewards, etc.) is fully manual. There should be per-field "AI Suggest" buttons that can draft content using the Lovable AI Gateway.

**Fix**: Add AI-assist buttons to key wizard steps (Problem Statement, Evaluation Criteria, Deliverables, Hook, Eligibility) that call the existing edge function or a new `ai-field-assist` edge function.

### 5. Governance mode display inconsistency
- `resolveGovernanceMode('ENTERPRISE')` → `STRUCTURED` (correct)
- `resolveGovernanceMode('LIGHTWEIGHT')` → `QUICK` (correct)
- But the sidebar badge uses a legacy `GovernanceBadge` component that checks `profile === 'ENTERPRISE'` instead of using the shared `GovernanceProfileBadge` component.

**Fix**: Replace sidebar's inline `GovernanceBadge` with the shared `GovernanceProfileBadge` component.

---

## Implementation Plan

### Step 1: Fix Sidebar — Use real org data & shared badge
**File**: `src/components/cogniblend/shell/CogniSidebar.tsx`
- Import `useCurrentOrg` and `GovernanceProfileBadge`
- Replace hardcoded `orgName` and `governanceProfile` with data from `useCurrentOrg()`
- Replace inline `GovernanceBadge` function with `<GovernanceProfileBadge>` component

### Step 2: Fix seed data — AGG orgs should use RQ, not AM
**File**: `supabase/functions/setup-test-scenario/index.ts`
- Change `new_horizon_demo` Alex Morgan's role from `["AM"]` to `["RQ"]`
- Change `agg_ent` scenario's AM user from `["AM"]` to `["RQ"]`
- Change `agg_light` scenario's admin from `["AM", "CR", ...]` to `["RQ", "CR", ...]`
- Sam Solo's multi-role set: replace `AM` with `RQ` in AGG orgs
- Redeploy edge function

### Step 3: Add AI Assist to Submit Request page
**File**: `src/pages/cogniblend/CogniSubmitRequestPage.tsx`
- Add a "Draft with AI" button next to the Problem Statement textarea
- When clicked, send the current problem text to `generate-challenge-spec` edge function
- Auto-fill expected outcomes, constraints, and suggest domain tags from the AI response
- Show sparkle badge on AI-assisted fields

### Step 4: Add AI Assist buttons to Advanced Editor wizard steps
**New file**: `src/components/cogniblend/challenge-wizard/AiFieldAssist.tsx`
- Reusable "AI Suggest" button component that takes field context and populates form fields
- Uses the existing `generate-challenge-spec` edge function

**Modified files** (add AI assist to key fields):
- `StepProblem.tsx` — AI assist for problem statement, scope, hook
- `StepEvaluation.tsx` — AI assist for evaluation criteria
- `StepProviderEligibility.tsx` — AI assist for eligibility text
- `StepTemplates.tsx` — AI assist for deliverables

### Step 5: Create `ai-field-assist` edge function for per-field AI
**New file**: `supabase/functions/ai-field-assist/index.ts`
- Accepts: `{ field_name, context: { title, problem_statement, maturity_level, governance_mode } }`
- Returns: suggested content for that specific field
- Uses Lovable AI Gateway with field-specific prompts
- Handles 429/402 errors properly

### Step 6: Update RoleSwitcher display for engagement model context
**File**: `src/components/cogniblend/shell/RoleSwitcher.tsx`
- When org operating model is AGG, show "RQ Challenge Requestor" instead of "AM Account Manager"
- This ensures the role badge in the top bar matches the engagement model

---

## Technical Details

**Edge function for per-field AI assist** — lightweight endpoint that takes a field name and challenge context, returns a draft for just that field. System prompt varies by field:
- `problem_statement`: "Draft a clear problem statement..."
- `evaluation_criteria`: "Generate 3-5 evaluation criteria with weights..."
- `hook`: "Write a 3-line pitch..."
- `eligibility`: "Suggest eligibility requirements..."

**AI assist UX pattern** — Small button with Wand2 icon next to each AI-assistable field. Click → loading spinner → field populated with draft → sparkle badge appears. User can edit or regenerate.

**Sidebar badge fix** — Simply swap the inline component for the shared one that uses `resolveGovernanceMode()` to correctly map ENTERPRISE→STRUCTURED, LIGHTWEIGHT→QUICK.

**Seed data role fix** — Per business rules: Marketplace uses AM (Account Manager), Aggregator uses RQ (Challenge Requestor). The current seed incorrectly assigns AM to AGG orgs.

