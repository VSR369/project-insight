

# Plan: Field Rules Correction + Governance-Aware Seed

Two changes to complete the Creator→Curator→LC/FC→Publish flow for all 3 governance modes.

## Change 1: Database Migration — Field Rules Visibility

New migration to UPDATE `md_governance_field_rules` visibility values. No schema changes, just data corrections:

- **Platform defaults** (13 fields): Set to `auto` across all modes (reward_type, silver_award, payment_mode, etc.)
- **Curator-owned fields** (20 fields): `hidden` in QUICK, `optional` in STRUCTURED/CONTROLLED
- **AI-drafted fields** (10 fields): `hidden` in QUICK, `ai_drafted` in STRUCTURED/CONTROLLED
- **Creator fields**: Mode-specific rigor (e.g., scope `hidden` in QUICK, ip_model `required` in STRUCTURED, context_background `required` in CONTROLLED)

Result: QUICK=5 required fields, STRUCTURED=8, CONTROLLED=12.

## Change 2: Edge Function — Governance-Aware Seed

Replace Step 4 (challenge creation) and Step 5 (role assignment) in `supabase/functions/setup-test-scenario/index.ts`:

**Step 4**: Replace the 2 challenges (MP + AGG) with 3 governance-aware challenges (all AGG):
1. CONTROLLED+AGG: "AI-Powered Predictive Maintenance" — 12 Creator fields, `creator_approval_required: true`
2. STRUCTURED+AGG: "Healthcare Claims Processing" — 8 Creator fields, `creator_approval_required: true`
3. QUICK+AGG: "Supply Chain Dashboard Prototype" — 5 Creator fields, `creator_approval_required: false`

**Step 5**: Replace "all users → all challenges" loop with governance-correct assignments:
- CONTROLLED: Chris=CR, Casey=CU, Evelyn+Ethan=ER, Leslie=LC, Frank=FC (strict separation)
- STRUCTURED: Chris=CR+LC, Casey=CU+ER (converged roles)
- QUICK: Sam Solo=CR+CU+ER+LC+FC (one person)

**Step 5c** (new): Attach legal doc templates to CONTROLLED + STRUCTURED challenges.

Update summary log to reference the 3 new challenge IDs.

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | New migration | UPDATE `md_governance_field_rules` visibility values per governance mode |
| 2 | `supabase/functions/setup-test-scenario/index.ts` | Replace Steps 4+5 with 3 governance-aware challenges and convergence-correct role assignments |

