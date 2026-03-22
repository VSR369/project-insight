

# Fix: Seed Data `phase_status` Constraint Violation

## Root Cause
The `challenges` table has a CHECK constraint (`chk_challenges_phase_status`) that only allows:
`ACTIVE`, `COMPLETED`, `ON_HOLD`, `TERMINAL`, `BLOCKED`, `LEGAL_VERIFICATION_PENDING`

The seed function uses `phase_status: "SPEC_REVIEW"` which violates this constraint.

## Fix

### File: `supabase/functions/setup-test-scenario/index.ts`

Change both challenge inserts to use `phase_status: "ACTIVE"` (the valid status for a challenge currently in Phase 2 awaiting CR/CA action). The `current_phase: 2` already tells the system which phase the challenge is in — `phase_status` indicates whether that phase is active, not which phase it is.

- Line 318: `phase_status: "SPEC_REVIEW"` → `phase_status: "ACTIVE"`
- Line 358: `phase_status: "SPEC_REVIEW"` → `phase_status: "ACTIVE"`

This aligns with the existing `complete_phase` RPC which sets `phase_status = 'ACTIVE'` when advancing to a new phase.

## Governance & Pricing Tier Compliance

Regarding your questions:

**Governance model**: Yes — the seed correctly sets `governance_profile: "ENTERPRISE"` (maps to STRUCTURED mode via `resolveGovernanceMode`), and `lc_review_required: true` for enterprise. The field visibility rules come from `md_governance_field_rules` at runtime.

**Pricing tiers**: The seed creates an org but does not assign a subscription tier. This means the org defaults to "basic" tier behavior (QUICK mode only). To properly test STRUCTURED/CONTROLLED governance, we should also seed a subscription tier association. However, this is a separate enhancement — the immediate fix is the `phase_status` value.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/setup-test-scenario/index.ts` | Fix `phase_status` from `SPEC_REVIEW` to `ACTIVE` on both challenge inserts |

