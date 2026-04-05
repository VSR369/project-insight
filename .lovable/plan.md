

# Fix My Challenges Detail View — Revised Plan

## Root Cause (5-Why Summary)

The creator_snapshot in seed data uses old field names (`currency`, `budget_max`) and is missing fields (`domain_tags`, `maturity_level`, `evaluation_criteria`, `currency_code`, `platinum_award`, `context_background` at root level). The section builder reads keys that don't exist in the snapshot, producing `null` content, which gets filtered out. Additionally, `CREATOR_SECTION_KEYS` includes phantom keys (`title`, `currency_code`) that have no matching section definitions. Finally, `resolveChallengeGovernance` with `null` tier data clamps everything to QUICK.

## Changes — 3 files

### File 1: `CreatorChallengeDetailView.tsx` — Fix governance resolution

**Line 21:** Change import from `resolveChallengeGovernance` to `resolveGovernanceMode`.

**Lines 37-38:** Replace tier-clamped resolution with direct resolution:
```typescript
const effectiveGovernance = resolveGovernanceMode(
  data.governance_mode_override ?? data.governance_profile,
);
```

**Lines 141, 143, 166, 180:** Remove `fieldRules` prop from all `FilteredSections` calls for My Version tab (builder already filters by governance). Keep `fieldRules` only for Curator Version tab.

Remove the `useGovernanceFieldRules` import and hook call (line 20, 40) since section filtering is now handled entirely by the builders.

### File 2: `CreatorSectionBuilders.tsx` — Fix keys + snapshot reads

**Fix CREATOR_SECTION_KEYS** (lines 31-42) — remove phantom keys that have no sections:
```typescript
const CREATOR_SECTION_KEYS: Record<string, string[]> = {
  QUICK: ['problem_statement', 'domain_tags', 'platinum_award'],
  STRUCTURED: [
    'problem_statement', 'scope', 'domain_tags', 'maturity_level',
    'platinum_award', 'weighted_criteria',
  ],
  CONTROLLED: [
    'problem_statement', 'scope', 'domain_tags', 'maturity_level',
    'platinum_award', 'weighted_criteria',
    'hook', 'context_background', 'ip_model', 'expected_timeline',
  ],
};
```

**Fix `buildAllSnapshotSections`** (lines 55-163) — normalize reads for both old and new key names:

1. **Budget section (line 58-61, 104-121):** Read `platinum_award` OR `budget_max`; read `currency_code` OR `currency`:
```typescript
const currencyCode = (snapshot.currency_code as string) || (snapshot.currency as string) || (rs.currency as string) || 'USD';
const platinumAward = Number(snapshot.platinum_award ?? snapshot.budget_max ?? rs.platinum_award ?? rs.budget_max ?? 0);
```
Display as "Top Prize: $15,000 USD" instead of "Budget Range".

2. **Context & Background (line 80-82):** Read from root OR `extended_brief`:
```typescript
content: ((snapshot.context_background as string) || (eb.context_background as string))
  ? <RichTextSection ... html={(snapshot.context_background as string) || (eb.context_background as string)} />
  : null,
```

3. **Evaluation Criteria (lines 155-161):** Also check top-level `weighted_criteria`:
```typescript
const topWc = snapshot.weighted_criteria as Array<{name:string;weight:number}> | null;
const ec = snapshot.evaluation_criteria as Record<string,unknown> | null;
const nestedWc = (ec?.weighted_criteria ?? ec?.criteria ?? []) as Array<{name:string;weight:number}>;
const criteria = topWc?.length ? topWc : nestedWc;
```

4. **Domain Tags (lines 145-153):** Also check `domain_tag_ids`; handle UUID display:
```typescript
const tags = (snapshot.domain_tags ?? snapshot.domain_tag_ids) as string[] | undefined;
```

### File 3: `supabase/functions/setup-test-scenario/index.ts` — Fix seed snapshots

**CONTROLLED snapshot** (line 331) — include all 12 Creator fields with correct keys:
```typescript
creator_snapshot: {
  title: "AI-Powered Predictive Maintenance for Smart Manufacturing",
  hook: "Reduce $2.3M annual downtime through IoT-driven failure prediction",
  problem_statement: "Our manufacturing floor experiences unplanned equipment failures...",
  scope: "Integrate with existing SCADA/PLC systems across 12 production lines...",
  domain_tags: ["manufacturing", "IoT", "machine-learning"],
  maturity_level: "PROTOTYPE",
  context_background: "Facility operates 24/7 with 12 production lines...",
  evaluation_criteria: { weighted_criteria: [/* 5 criteria */] },
  currency_code: "USD",
  platinum_award: 75000,
  ip_model: "IP-EL",
  expected_timeline: "6-12",
  // Legacy compat
  extended_brief: { context_background: "Facility operates 24/7..." },
  reward_structure: { currency: "USD", platinum_award: 75000, budget_min: 50000, budget_max: 150000 },
},
```

**STRUCTURED snapshot** (line 354) — include all 8 Creator fields.

**QUICK snapshot** (line 376) — include all 5 Creator fields:
```typescript
creator_snapshot: {
  title: "Supply Chain Visibility Dashboard Prototype",
  problem_statement: "We lack real-time visibility...",
  domain_tags: ["supply-chain", "dashboard"],
  currency_code: "USD",
  platinum_award: 15000,
  reward_structure: { currency: "USD", platinum_award: 15000, budget_min: 5000, budget_max: 20000 },
},
```

Also add `currency_code` and `domain_tags` columns to each challenge INSERT statement.

## Expected Result After Fix

| Mode | Section Cards | Data Points |
|------|--------------|-------------|
| QUICK | 3 (Problem, Tags, Prize) | 5 (+ title in header, currency in prize) |
| STRUCTURED | 6 (Problem, Scope, Tags, Maturity, Prize, Criteria) | 8 |
| CONTROLLED | 10 (+ Hook, Context, IP, Timeline) | 12 |

## Verification

1. Re-seed demo data
2. QUICK (Sam Solo): 3 section cards, "Processing" status, no curator tab
3. STRUCTURED (Chris): 6 section cards, "In Curation" status, dual tabs
4. CONTROLLED (Chris): 10 section cards, dual tabs
5. No empty sections visible
6. No curator-only sections (complexity, effort_level, etc.)

