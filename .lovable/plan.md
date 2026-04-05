

# Fix My Challenges View — 5-Why Root Cause Analysis + Fix (IMPLEMENTED)

## Root Cause (5-Why)

1. Only 2 sections show → sections have null content
2. Null content → snapshot keys don't match builder reads
3. Keys missing → seed uses old names (`currency`, `budget_max`) and omits `domain_tags`, `maturity_level`, etc.
4. Old keys → seed written before schema fix, never updated
5. No shared field spec → `CREATOR_SECTION_KEYS` included phantom keys (`title`, `currency_code`) with no sections; `resolveChallengeGovernance(null)` clamped everything to QUICK

## Changes Applied

### 1. `CreatorChallengeDetailView.tsx` — Governance resolution fix
- Replaced `resolveChallengeGovernance` (tier-clamped) with `resolveGovernanceMode` (direct)
- Removed `useGovernanceFieldRules` hook and `fieldRules` prop from My Version tabs
- Curator Version tab still uses content-based filtering

### 2. `CreatorSectionBuilders.tsx` — Keys + snapshot reads
- Removed phantom keys (`title`, `currency_code`) from `CREATOR_SECTION_KEYS`
- QUICK: 3 keys | STRUCTURED: 6 keys | CONTROLLED: 10 keys
- Budget reads `platinum_award` OR `budget_max`, currency reads `currency_code` OR `currency`
- Context reads from root OR `extended_brief`
- Eval criteria checks top-level `weighted_criteria` OR nested in `evaluation_criteria`
- Domain tags checks `domain_tags` OR `domain_tag_ids`

### 3. `setup-test-scenario/index.ts` — Seed snapshots
- CONTROLLED: all 12 Creator fields with correct keys
- STRUCTURED: all 8 Creator fields
- QUICK: all 5 Creator fields
- Added `currency_code` and `domain_tags` columns to challenge INSERTs
