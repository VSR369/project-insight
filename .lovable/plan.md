

# Fix: Filter Detail View Sections by Governance Field Rules

## Problem

The "My Version" and "Curator Version" tabs in `CreatorChallengeDetailView` display ALL sections regardless of the challenge's governance mode. For a QUICK challenge, fields like `context_background`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach`, and `approaches_not_of_interest` are marked `hidden` in `md_governance_field_rules` but still render if the snapshot has any data in them.

This means a Creator who never filled these fields (because the form hid them) may still see empty or spurious content, and fields that shouldn't exist for their governance/tier combination are shown — a significant data integrity and UX bug.

## Root Cause

`CreatorChallengeDetailView` has no awareness of governance field rules. It renders every section that has non-null data, without consulting `md_governance_field_rules` to check whether the field should be visible for the challenge's governance mode.

## Fix Plan

### 1. Fetch governance mode + field rules in the detail view

**`usePublicChallenge.ts`** — Add `governance_mode_override` to the select query and type so the effective governance mode can be resolved.

**`CreatorChallengeDetailView.tsx`** — Call `useGovernanceFieldRules` with the resolved governance mode:

```typescript
const effectiveGovernance = resolveChallengeGovernance(
  (data as any).governance_mode_override,
  data.governance_profile,
  null // tier ceiling not needed for display filtering
);
const { data: fieldRules } = useGovernanceFieldRules(effectiveGovernance);
```

### 2. Map section titles to governance field_keys

Create a mapping from section title/key to the `field_key` used in `md_governance_field_rules`:

```text
Problem Statement     → problem_statement
Scope / Constraints   → scope
Expected Outcomes     → expected_outcomes
Context & Background  → context_background
Root Causes           → root_causes
Affected Stakeholders → affected_stakeholders
Current Deficiencies  → current_deficiencies
Preferred Approach    → preferred_approach
Approaches Not of Interest → approaches_not_of_interest
Domain Tags           → domain_tags
Maturity Level        → maturity_level
IP Model              → ip_model
Budget Range          → platinum_award (or reward section)
Expected Timeline     → expected_timeline
Submission Guidelines → submission_guidelines
Evaluation Criteria   → weighted_criteria
Deliverables          → deliverables_list
```

### 3. Filter sections before rendering

Add a `governanceFieldKey` property to each `SectionDef` and filter out sections whose field rule visibility is `hidden`:

```typescript
interface SectionDef {
  title: string;
  icon: React.ElementType;
  content: React.ReactNode | null;
  fieldKey?: string; // maps to md_governance_field_rules.field_key
}
```

In `FilteredSections`, add filtering:

```typescript
const filtered = sections.filter(s => {
  if (s.content === null) return false;
  if (s.fieldKey && fieldRules && fieldRules[s.fieldKey]?.visibility === 'hidden') return false;
  if (searchTerm && !s.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
  return true;
});
```

### 4. Apply to BOTH tabs

Both "My Version" (snapshot sections) and "Curator Version" (live sections) must respect the same governance filtering, since the governance mode is a challenge-level attribute.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/cogniblend/usePublicChallenge.ts` | Add `governance_mode_override` to select, type, and buildResult |
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Import governance hooks, resolve effective mode, add `fieldKey` to each section, filter hidden fields |

## Impact

- QUICK challenges will only show the 6-8 fields the Creator actually filled
- STRUCTURED and CONTROLLED will show progressively more
- No governance field rule data is leaked to the wrong tier
- Both tabs respect the same filtering
- Existing rendering logic unchanged; only visibility gating added

