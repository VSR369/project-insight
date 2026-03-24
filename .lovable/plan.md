

# Final Matrix: Pricing Tier × Engagement Model × Governance × Role Fusion

## Current Implemented State (verified from DB + codebase)

---

## 1. Configuration Scope: Org-Level vs Challenge-Level

```text
┌─────────────────────────┬───────────┬─────────────┬──────────────────────────┐
│ Setting                 │ Org-Level │ Challenge   │ Notes                    │
│                         │ (default) │ (override)  │                          │
├─────────────────────────┼───────────┼─────────────┼──────────────────────────┤
│ Pricing Tier            │ ✅ Fixed   │ ✗ No        │ Set via subscription     │
│ Engagement Model (MP/   │ ✅ Default │ ✅ Override  │ Locked once ACTIVE       │
│   AGG)                  │           │ at Step 0   │ (phase 7+)               │
│ Governance Mode         │ ✅ Default │ ✅ Override  │ Clamped to tier ceiling  │
│   (Q/S/C)               │           │ at Step 0   │                          │
│ Role Fusion Rules       │ ✗ Not     │ ✅ Derived   │ Auto-resolved from       │
│                         │ directly  │ from gov.   │ challenge governance     │
│                         │ set       │ mode        │                          │
└─────────────────────────┴───────────┴─────────────┴──────────────────────────┘
```

---

## 2. Pricing Tier → Governance Mode Ceiling

```text
┌──────────────┬───────────────────────────┬─────────────────────┐
│ Tier         │ Allowed Governance Modes  │ Default Mode        │
├──────────────┼───────────────────────────┼─────────────────────┤
│ Basic        │ QUICK only                │ QUICK               │
│ Standard     │ QUICK, STRUCTURED         │ STRUCTURED          │
│ Premium      │ QUICK, STRUCTURED,        │ STRUCTURED          │
│              │ CONTROLLED                │                     │
│ Enterprise   │ QUICK, STRUCTURED,        │ STRUCTURED          │
│              │ CONTROLLED                │                     │
└──────────────┴───────────────────────────┴─────────────────────┘
```

Already implemented in `TIER_GOVERNANCE_MODES` and `getDefaultGovernanceMode()`.

---

## 3. Engagement Model (MP/AGG) — Independent of Governance

```text
┌──────────────┬────────────────┬──────────────────┬──────────────────┐
│ Feature      │ Marketplace    │ Aggregator (AGG) │ Set Where?       │
│              │ (MP)           │                  │                  │
├──────────────┼────────────────┼──────────────────┼──────────────────┤
│ Lifecycle    │ Platform Admin │ Seeking Org      │ Per-challenge    │
│ owner        │ team           │ Admin            │ (Step 0)         │
│ Provider     │ Direct         │ Platform-        │                  │
│ contact      │ visible        │ mediated         │                  │
│ Messaging    │ Direct         │ Disabled         │                  │
│ Intake role  │ AM             │ RQ               │ Auto from model  │
│ Spec role    │ CA (Architect) │ CR (Creator)     │ Auto from model  │
└──────────────┴────────────────┴──────────────────┴──────────────────┘
```

Engagement model does NOT affect role fusion rules. It only determines which role *names* apply (AM vs RQ, CA vs CR). Role fusion is governed purely by governance mode.

---

## 4. Governance Mode → Role Fusion Matrix (from live DB)

```text
┌─────────────────────────────────────────────────────────────────┐
│                        QUICK MODE                               │
│                                                                 │
│  Zero conflict rules. One person can hold ALL roles.            │
│  Solo operator / startup mode.                                  │
│  All 9 roles auto-assigned to creator.                          │
│                                                                 │
│  Role pairs: Any combination = ALLOWED                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     STRUCTURED MODE                             │
│                                                                 │
│  5 SOFT_WARN rules (warnings, not blocks):                      │
│                                                                 │
│  CR + CU  →  SOFT_WARN  (creator shouldn't curate own work)    │
│  CR + ID  →  SOFT_WARN  (creator shouldn't approve own work)   │
│  CU + ID  →  SOFT_WARN  (curator shouldn't approve own queue)  │
│  CR + ER  →  SOFT_WARN  (creator shouldn't evaluate own work)  │
│  ID + ER  →  SOFT_WARN  (approver shouldn't also evaluate)     │
│                                                                 │
│  All other pairs: ALLOWED (including AM+CR, RQ+CU, LC+FC)      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLED MODE                             │
│                                                                 │
│  3 HARD_BLOCK rules (system prevents assignment):               │
│  CR + CU  →  HARD_BLOCK                                        │
│  CR + ID  →  HARD_BLOCK                                        │
│  CU + ID  →  HARD_BLOCK                                        │
│                                                                 │
│  6 SOFT_WARN rules (warnings):                                  │
│  AM + CR  →  SOFT_WARN  (requestor shouldn't write spec)       │
│  AM + CU  →  SOFT_WARN  (requestor shouldn't curate)           │
│  RQ + CR  →  SOFT_WARN  (requestor shouldn't write spec)       │
│  RQ + CU  →  SOFT_WARN  (requestor shouldn't curate)           │
│  CR + ER  →  SOFT_WARN  (creator shouldn't evaluate)           │
│  ID + ER  →  SOFT_WARN  (approver shouldn't evaluate)          │
│                                                                 │
│  All other pairs: ALLOWED (LC, FC can combine freely)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Combined Matrix: Tier × Governance → Role Fusion Behavior

```text
┌───────────────┬────────────┬──────────────┬──────────────────────────┐
│ Tier          │ Gov Mode   │ Role Fusion  │ Min Users Needed         │
├───────────────┼────────────┼──────────────┼──────────────────────────┤
│ Basic         │ QUICK      │ All merged   │ 1 (solo operator)        │
│               │            │ No blocks    │                          │
├───────────────┼────────────┼──────────────┼──────────────────────────┤
│ Standard      │ QUICK      │ All merged   │ 1                        │
│               │ STRUCTURED │ Warn on 5    │ 1 (can override warns)   │
│               │            │ overlaps     │ Ideal: 2-3               │
├───────────────┼────────────┼──────────────┼──────────────────────────┤
│ Premium /     │ QUICK      │ All merged   │ 1                        │
│ Enterprise    │ STRUCTURED │ Warn on 5    │ 1 (can override warns)   │
│               │ CONTROLLED │ Block 3 core │ Min 3 distinct users     │
│               │            │ Warn on 6    │ (CR, CU, ID separate)    │
└───────────────┴────────────┴──────────────┴──────────────────────────┘
```

---

## 6. What Is Already Implemented vs What Remains

| Layer | Status | Detail |
|-------|--------|--------|
| Tier → governance ceiling | Done | `TIER_GOVERNANCE_MODES` in `governanceMode.ts` |
| Governance mode selector at Step 0 | Done | `StepModeSelection.tsx` |
| Engagement model selector at Step 0 | Done | Per-challenge, locked at ACTIVE |
| `validate_role_assignment()` | Done | Uses canonical mode mapping, checks `role_conflict_rules` |
| `auto_assign_roles_on_creation()` | Done | QUICK = all roles to creator |
| Conflict rules in DB | Done | 14 rows: 0 QUICK, 5 STRUCTURED, 9 CONTROLLED |
| `resolveGovernanceMode()` | Done | Legacy LIGHTWEIGHT/ENTERPRISE mapped |
| Per-challenge governance override | **Not yet** | `governance_mode_override` column not added |
| `resolve_challenge_governance()` | **Not yet** | Challenge override → org default → tier ceiling |
| Frontend `isQuick` prop wiring | Done | 18 files renamed |

The per-challenge governance override (allowing a Premium org to run one challenge as QUICK and another as CONTROLLED) is the remaining enhancement from the earlier discussion. Everything else in this matrix is live.

---

## No Implementation Needed

This message is a reference matrix only. The governance cleanup migration and frontend refactor are already complete. The only future work item is the per-challenge governance override if you want to proceed with that.

