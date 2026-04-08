

# Plan: Fix LC/FC Auto-Assignment for CONTROLLED Challenges

## Problem

When the Curator approves a CONTROLLED challenge (`CurationActions.tsx` line 95-98), it calls `autoAssignChallengeRole` for LC and FC roles. This function first checks the `platform_provider_pool` (empty in test environment), then falls back to `tryOrgFallback`. However, `tryOrgFallback` has a hard guard on line 214:

```typescript
if (input.roleCode !== "CU") return null;
```

This means LC and FC auto-assignment **always silently fails** when no pool members exist. The result: Leslie Chen (LC) and Frank Coleman (FC) never see CONTROLLED challenges in their queues.

**Not affected:**
- STRUCTURED mode: `complete_phase` auto-sets `lc_compliance_complete = TRUE` and `fc_compliance_complete = TRUE` (line 124-127 of the migration). No LC/FC users needed.
- QUICK mode: fully auto-completed, no compliance step.
- Pre-seeded demo challenges (C1, C2): already have LC/FC role records from the seed function.

**Only affected:** New CONTROLLED challenges created during testing via the creator form.

## Fix

### File: `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`

**Change 1 — Expand `tryOrgFallback` to support LC and FC roles (not just CU)**

Update line 214 from:
```typescript
if (input.roleCode !== "CU") return null;
```
to:
```typescript
const FALLBACK_ROLES = ["CU", "LC", "FC"];
if (!FALLBACK_ROLES.includes(input.roleCode)) return null;
```

**Change 2 — Fix the hardcoded SLM code for non-CU roles (line 254)**

Currently the org fallback hardcodes `p_slm_role_code: "R5_MP"` which is CU-specific. Map it dynamically:

```typescript
const ORG_FALLBACK_SLM: Record<string, string> = {
  CU: "R5_MP",
  LC: "R7_MP",
  FC: "R8_MP",
};
// ...
p_slm_role_code: ORG_FALLBACK_SLM[input.roleCode] ?? "R5_MP",
```

### No other files change

The `CurationActions.tsx` already calls `autoAssignChallengeRole` for LC and FC on CONTROLLED approval (lines 97-98). The `assign_challenge_role` RPC already accepts any role code. The `user_challenge_roles` table has no role restriction. The only gap is the org fallback refusing non-CU roles.

### Result
- When Curator approves a CONTROLLED challenge, LC and FC are auto-assigned from org_users
- Leslie Chen and Frank Coleman will see new CONTROLLED challenges in their respective queues
- Pre-seeded challenges continue to work as before
- STRUCTURED and QUICK modes are unaffected

## Other Audit Items — No Code Changes Needed

| Finding | Status | Action |
|---------|--------|--------|
| Solver match count = 0 | Visual only | Does not block publish |
| Complexity not pre-set | By design | Curator scores during curation |
| Escrow form needs manual input | By design | Use test values in audit doc |
| Org name "Tech Mahindra" | Already fixed | Previous deployment updated to M&M |
| org_legal_document_templates | Already fixed | Previous deployment seeds org templates |

