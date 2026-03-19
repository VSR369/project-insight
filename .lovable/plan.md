

# Supervisor-Configurable Governance Parameters

## Understanding

You are saying: the governance rules — which fields are **Required**, **Optional**, **Hidden**, **Auto-populated**, or **AI-drafted** — for each of the 3 modes (QUICK/STRUCTURED/CONTROLLED) should be **configured by the Supervisor in master data**, not hardcoded in TypeScript constants. The existing DB RPCs (`get_mandatory_fields`, `get_governance_behavior`, `get_gate_requirements`) already support this pattern. The frontend must consume these DB-driven configs at runtime.

## Current State

- **DB RPCs exist**: `get_mandatory_fields(p_governance_profile)`, `get_governance_behavior(p_governance_profile, p_phase)`, `get_gate_requirements(p_gate_id, p_governance_profile)` — these already accept governance profile and return JSON
- **`useMandatoryFields` hook exists** in `useChallengeForm.ts` — already calls `get_mandatory_fields` RPC
- **Problem**: The schema min-lengths (`PROBLEM_MIN_QUICK = 200`, etc.) and field visibility rules are hardcoded in `challengeFormSchema.ts` and `StepProblem.tsx` instead of being read from the DB
- **No admin UI** exists for Supervisor to configure governance field rules

## What Changes

### 1. New DB Table: `md_governance_field_rules`

Stores per-field, per-mode visibility and validation rules. Supervisor manages this via admin UI.

```text
Columns:
  id             UUID PK
  governance_mode TEXT  ('QUICK' | 'STRUCTURED' | 'CONTROLLED')
  field_key      TEXT  (e.g. 'problem_statement', 'scope', 'hook', 'ip_model')
  wizard_step    INT   (1-7, for grouping in admin UI)
  visibility     TEXT  ('required' | 'optional' | 'hidden' | 'auto' | 'ai_drafted')
  min_length     INT   (nullable — e.g. 200 for problem_statement in QUICK)
  max_length     INT   (nullable)
  default_value  TEXT  (nullable — for auto-populated fields)
  display_order  INT
  is_active      BOOL
  created_by     UUID
  updated_at     TIMESTAMPTZ
```

This replaces the hardcoded `PROBLEM_MIN_QUICK/STRUCTURED/CONTROLLED` constants.

### 2. New RPC: `get_governance_field_rules(p_governance_mode)`

Returns all active field rules for a given mode. This supplements the existing `get_mandatory_fields` RPC with richer metadata (visibility, min/max lengths, defaults).

### 3. New Hook: `useGovernanceFieldRules(governanceMode)`

Fetches field rules from the DB via the new RPC. Returns a map: `Record<string, FieldRule>` where each FieldRule has `{ visibility, minLength, maxLength, defaultValue }`.

### 4. New Admin Page: Governance Field Rules (`/admin/seeker-config/governance-rules`)

- Supervisor sees a 3-tab view (QUICK | STRUCTURED | CONTROLLED)
- Each tab shows a table of all ~57 challenge fields grouped by wizard step
- Per field: dropdown for visibility (R/O/H/Auto/AI), numeric inputs for min/max length
- Save updates `md_governance_field_rules` rows
- Added to Admin Sidebar under "Seeker Config" group

### 5. Refactor `challengeFormSchema.ts`

Replace hardcoded min-length constants with a dynamic schema builder that accepts the DB-driven field rules:

```text
BEFORE: const problemMin = mode === 'QUICK' ? 200 : mode === 'STRUCTURED' ? 300 : 500;
AFTER:  const problemMin = fieldRules['problem_statement']?.minLength ?? 200;
```

The `createChallengeFormSchema` function signature changes to accept field rules from the hook instead of (or in addition to) the governance mode string.

### 6. Refactor Wizard Step Components

Each step component (`StepProblem`, `StepRewards`, `StepProviderEligibility`, etc.) reads field rules from the hook to determine:
- Whether to show/hide a field
- Whether to mark it required or optional
- Whether to show AI-draft badge
- Min/max length for character counters

### 7. Migrate 13 Files from Hardcoded `isLightweight` Booleans

All files identified in the previous audit that still use `isLightweight` / `isEnterprise` booleans will be migrated to use `resolveGovernanceMode()` + the DB-driven field rules.

## Files

| File | Change |
|------|--------|
| **NEW** `supabase/migrations/xxx_governance_field_rules.sql` | Create `md_governance_field_rules` table + `get_governance_field_rules` RPC + seed data for all 3 modes |
| **NEW** `src/hooks/queries/useGovernanceFieldRules.ts` | Hook to fetch field rules per mode |
| **NEW** `src/pages/admin/seeker-config/GovernanceRulesPage.tsx` | Admin CRUD UI for field rules |
| **EDIT** `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Dynamic schema from DB rules, remove hardcoded constants |
| **EDIT** `src/components/cogniblend/challenge-wizard/StepProblem.tsx` | Read visibility/min-lengths from field rules hook |
| **EDIT** `src/components/cogniblend/challenge-wizard/StepRewards.tsx` | Escrow visibility from field rules |
| **EDIT** `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx` | Visibility from field rules |
| **EDIT** `src/components/cogniblend/challenge-wizard/StepTimeline.tsx` | Visibility from field rules |
| **EDIT** `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx` | Mode-aware from field rules |
| **EDIT** `src/pages/cogniblend/ChallengeWizardPage.tsx` | Pass field rules to steps, read governance from org |
| **EDIT** `src/components/org-settings/GovernanceProfileTab.tsx` | Read-only 3-mode display |
| **EDIT** `src/App.tsx` | Add governance rules admin route |
| **EDIT** `src/components/admin/AdminSidebar.tsx` | Add "Governance Rules" link under Seeker Config |
| **EDIT** 8 more files | Replace `isLightweight` boolean with `resolveGovernanceMode()` |

## Seed Data

The migration seeds default rules for all 3 modes matching the current hardcoded values, so behavior is identical on day 1. Supervisor can then adjust via the admin UI.

## Zero Breaking Changes

- Existing challenges keep working — the RPC fallbacks match current hardcoded behavior
- `get_mandatory_fields` RPC continues to work alongside the new `get_governance_field_rules`
- Legacy `isLightweight` boolean paths removed but behavior preserved through the resolver

