

# Fix: Focused Mode Hides Nav Items Instead of Dimming

## The Bug

When `activeRole = CA`, `effectiveRoles = ['CA']`, so `canCurate = false`. The `isVisible` function returns `false` for "Curation Queue" — **hiding it entirely** instead of dimming it. A user with roles [AM, CA, CU] who focuses on CA loses sight of their CU and AM nav items completely.

**Root cause**: `isVisible` uses action permissions (focused) when it should use visibility permissions (all available roles).

## Fix: 2 files

### File 1: `src/hooks/cogniblend/useCogniPermissions.ts`

Add a second resolver `sees` that always checks against `availableRoles` (not focused role). This separates "can this user see this nav item" from "can this user perform this action right now."

```typescript
const visibilityRoles = availableRoles;
const effectiveRoles = activeRole ? [activeRole] : availableRoles;
const can  = (codes: string[]) => codes.some(c => effectiveRoles.includes(c));
const sees = (codes: string[]) => codes.some(c => visibilityRoles.includes(c));
```

Add `canSee*` flags for nav visibility:
- `canSeeChallengePage: sees(['CA', 'CR'])`
- `canSeeRequests: sees(['AM', 'RQ'])`
- `canSeeCurationQueue: sees(['CU'])`
- `canSeeApprovalQueue: sees(['ID'])`
- `canSeeLegalWorkspace: sees(['LC'])`
- `canSeeEvaluation: sees(['ER'])`
- `canSeeEscrow: sees(['FC'])`

All existing `can*` and `is*` flags stay unchanged (they use focused `effectiveRoles`).

### File 2: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

Update `isVisible` functions in SECTIONS to use `canSee*` flags instead of `can*` flags:

| Nav Item | Old `isVisible` | New `isVisible` |
|---|---|---|
| New Challenge | `p.canCreateChallenge \|\| p.canSubmitRequest` | `p.canSeeChallengePage \|\| p.canSeeRequests` |
| My Challenges | `p.canEditSpec` | `p.canSeeChallengePage` |
| Curation Queue | `p.canCurate` | `p.canSeeCurationQueue` |
| Approval Queue | `p.canApprove` | `p.canSeeApprovalQueue` |
| Legal Workspace/Review | `p.canReviewLegal` | `p.canSeeLegalWorkspace` |
| Review Queue | `p.canReviewEvaluation` | `p.canSeeEvaluation` |
| Evaluation Panel | `p.canReviewEvaluation \|\| p.canApprove` | `p.canSeeEvaluation \|\| p.canSeeApprovalQueue` |
| Selection & IP | `p.canApprove` | `p.canSeeApprovalQueue` |
| Escrow/Payments | `p.canManageEscrow` | `p.canSeeEscrow` |

The existing `ROLE_NAV_RELEVANCE` dimming (opacity-50) continues to work on top — it dims non-relevant items. No other files change.

**Result**: User [AM, CA, CU] focused on CA sees ALL their nav items (visible), with CU and AM items dimmed. Dashboard/actions still respect focused permissions via `can*` flags.

