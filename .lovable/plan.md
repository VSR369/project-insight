

# Fix: Governance-Aware Data Pipeline (Snapshot, Curator Data, Test Fill)

## Three Problems Identified

### Problem 1: Fill Test Data ignores governance mode
`handleFillTestData` in `ChallengeCreatorForm.tsx` calls `form.reset(seed)` with the FULL seed content (all Tab 1 + Tab 2 fields) regardless of whether the governance mode is QUICK, STRUCTURED, or CONTROLLED. A QUICK challenge should only fill ~6 fields, but currently gets all 14+ fields populated including `context_background`, `root_causes`, `affected_stakeholders`, etc.

### Problem 2: Submit sends ALL fields to DB regardless of governance
`useSubmitSolutionRequest.ts` writes every field from the form payload to the `challenges` table and `extended_brief` JSONB — including fields that were hidden for QUICK mode but populated by test data. The submission should only persist fields that are visible per governance rules.

### Problem 3: Creator snapshot captures ALL fields
The `creator_snapshot` object (lines 214-242 in `useSubmitSolutionRequest.ts`) captures every field regardless of governance mode. When displayed in "My Version," even with the governance filter we added, the snapshot contains data for hidden fields. While the display now filters, the snapshot itself should be clean.

## Fix Plan

### 1. Governance-aware Fill Test Data
**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

Before calling `form.reset(seed)`, filter the seed content against the governance field rules. Fetch the field rules (already available via `useGovernanceFieldRules`) and strip any field where visibility is `hidden`.

Create a helper that maps seed keys to governance field_keys and removes hidden ones:

```typescript
const handleFillTestData = useCallback(() => {
  const seed = engagementModel === 'AGG' ? AGG_SEED : MP_SEED;
  // Strip fields hidden by governance mode
  const filtered = filterSeedByGovernance(seed, governanceMode);
  form.reset({ ...filtered, domain_tags: domainIds, ... });
}, [engagementModel, governanceMode, ...]);
```

### 2. Governance-aware submission filtering
**File: `src/hooks/cogniblend/useSubmitSolutionRequest.ts`**

Before writing to DB, fetch governance field rules for the effective mode and exclude hidden fields from both:
- The `challenges` table update (lines 166-210)
- The `creator_snapshot` object (lines 214-242)
- The `extended_brief` JSONB object

This ensures the curator only receives data the creator was supposed to provide.

### 3. Shared governance field filter utility
**New file: `src/lib/cogniblend/governanceFieldFilter.ts`**

Create a utility that:
- Takes a governance mode
- Fetches field rules from `md_governance_field_rules` (one-shot, not a hook — for use in mutation functions)
- Returns a filter function that strips hidden fields from any payload

```typescript
export async function fetchGovernanceFieldRules(mode: string): Promise<FieldRulesMap> {
  const { data } = await supabase.rpc('get_governance_field_rules', { p_governance_mode: mode });
  // ... build map
}

export function stripHiddenFields(
  payload: Record<string, unknown>,
  rules: FieldRulesMap,
  fieldKeyMap: Record<string, string> // payload key → governance field_key
): Record<string, unknown> {
  const result = { ...payload };
  for (const [payloadKey, fieldKey] of Object.entries(fieldKeyMap)) {
    if (rules[fieldKey]?.visibility === 'hidden') {
      delete result[payloadKey];
    }
  }
  return result;
}
```

### 4. Field key mapping for Creator form → governance rules

Define which Creator form fields map to which governance `field_key`:

| Form field | Governance field_key |
|-----------|---------------------|
| `context_background` | `context_background` |
| `root_causes` | `root_causes` |
| `affected_stakeholders` | `affected_stakeholders` |
| `current_deficiencies` | `current_deficiencies` |
| `preferred_approach` | `preferred_approach` |
| `approaches_not_of_interest` | `approaches_not_of_interest` |
| `scope` / `constraints` | `scope` |
| `submission_guidelines` | `submission_guidelines` |
| `ip_model` | `ip_model` |
| `budget_min` / `budget_max` | `platinum_award` |
| `expected_timeline` | `expected_timeline` |

## Files Changed

| File | Change |
|------|--------|
| `src/lib/cogniblend/governanceFieldFilter.ts` | **New** — shared utility for fetching rules + stripping hidden fields |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Filter seed data by governance mode before `form.reset()` |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Filter payload + snapshot + extended_brief by governance rules before DB write |

## Impact

- QUICK challenges: Fill Test Data only populates ~6 essential fields; submission only writes those fields; curator only sees those fields
- STRUCTURED: ~9 fields populated and persisted
- CONTROLLED: All fields populated and persisted
- No phantom data leaking from test fill or submission into hidden governance fields
- Curator receives exactly what the Creator was asked to provide — nothing more

