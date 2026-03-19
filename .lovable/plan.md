

# Completed: Governance, AI Integration & Role Consistency Fixes

## Changes Made

### 1. Fixed Sidebar Governance Badge
- **CogniSidebar.tsx** — Replaced hardcoded `LIGHTWEIGHT` with `useCurrentOrg()` data and shared `GovernanceProfileBadge` component
- Removed legacy inline `GovernanceBadge` function

### 2. Fixed Seed Data — AGG Orgs Use RQ Instead of AM
- **setup-test-scenario/index.ts** — Changed `AM` to `RQ` for all Aggregator org users:
  - `agg_enterprise_8`: `agg-ent-am` → `agg-ent-rq` with role `["RQ"]`
  - `agg_lightweight_bypass`: admin role set changed from `["AM", "CR", ...]` to `["RQ", "CR", ...]`
  - `new_horizon_demo`: Alex Morgan changed from `["AM"]` to `["RQ"]`; Sam Solo from `["AM", ...]` to `["RQ", ...]`

### 3. Created `ai-field-assist` Edge Function
- **supabase/functions/ai-field-assist/index.ts** — New edge function that:
  - Accepts `field_name` and `context` (title, problem_statement, maturity_level, governance_mode)
  - Uses Lovable AI Gateway (Gemini) with field-specific prompts
  - Supports 8 field types: problem_statement, scope, hook, evaluation_criteria, eligibility, deliverables, expected_outcomes, description
  - Handles 429/402 errors properly

### 4. Created Reusable `AiFieldAssist` Component
- **AiFieldAssist.tsx** — Wand2 icon button with loading/sparkle states
  - Compact (icon-only) and full (with label) modes
  - Calls `ai-field-assist` edge function and passes result to `onResult` callback
  - Toast notifications for success, rate limits, and errors

### 5. Added AI Assist to Submit Request Page
- **CogniSubmitRequestPage.tsx** — "Draft with AI" button on Problem Statement field
  - Calls `ai-field-assist` edge function with `problem_statement` field
  - Auto-fills the textarea with AI-generated content

### 6. Added AI Assist to Advanced Editor Wizard Steps
- **StepProblem.tsx** — AI assist on: Hook, Description, Problem Statement
- **StepEvaluation.tsx** — AI assist generates evaluation criteria (parsed as JSON array)
- **StepProviderEligibility.tsx** — AI suggest for eligibility text

### 7. Updated config.toml
- Added `[functions.ai-field-assist]` with `verify_jwt = false`

## Previous Changes (Step 0 + 3-Mode Governance)
- StepModeSelection.tsx, ChallengeProgressBar.tsx, ChallengeWizardBottomBar.tsx
- challengeFormSchema.ts, useFormCompletion.ts, ChallengeWizardPage.tsx
- All 10 tests pass with the 3-mode system
