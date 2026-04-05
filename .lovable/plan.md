

# Fix QUICK Challenge Seed Data in setup-test-scenario

## Problem
Challenge 3 (QUICK) in the seed function includes fields that should NOT exist for QUICK mode:
- `maturity_level: "BLUEPRINT"` — hidden for QUICK
- `evaluation_criteria` with 3 weighted criteria — hidden for QUICK
- `domain_tags` has 4 tags (max 3 per schema)
- `phase_schedule: { expected_timeline: "1-3" }` — should be platform default `"8w"`

Challenges 1 (CONTROLLED) and 2 (STRUCTURED) are already correct.

## Changes

**File: `supabase/functions/setup-test-scenario/index.ts`**

Lines 468-491 — Replace the QUICK challenge INSERT:

1. Remove `maturity_level: "BLUEPRINT"` from the challenge record
2. Remove the entire `evaluation_criteria` block (lines 476-480)
3. Change `domain_tags` from 4 tags to 3: `["sustainability", "dashboard", "ESG"]`
4. Change `phase_schedule` from `{ expected_timeline: "1-3" }` to `{ expected_timeline: "8w" }`
5. Add `ip_model: "IP-NEL"` as auto-default (platform-set, not Creator-filled)
6. Update `c3DomainTags` declaration (line 458) to 3 tags

Also update the snapshot `c3DomainTags` reference (line 458) to match.

## Result
- QUICK challenge record: no `maturity_level`, no `evaluation_criteria`, auto `ip_model`
- QUICK snapshot: exactly 5 fields + legacy `reward_structure`
- Matches governance rules: Creator fills only title, problem, domain_tags, currency, prize

