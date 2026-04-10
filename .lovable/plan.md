

## Fix: Curator Version Visibility Logic

### Root Cause

Line 70 in `CreatorChallengeDetailView.tsx`:
```typescript
const showCuratorContent = isPendingApproval || currentPhase >= 2;
```

This was broadened in the previous fix to include all Phase 2+, but Phase 2 with `ACTIVE` status means the curator is still working. Showing half-done curator edits misleads the Creator into thinking this is an approved/final version.

### Correct Business Logic

| Phase | Status | Show Curator Version? | Reason |
|-------|--------|----------------------|--------|
| 1 | any | No | Still in Creator's draft |
| 2 | ACTIVE | No | Curator is mid-review |
| 2 | CR_APPROVAL_PENDING | Yes | Curator explicitly sent back for Creator review |
| 2 | RETURNED | Yes | Curator returned with feedback |
| 3+ | any | Yes | Curation is complete, content is finalized |

### Change

**File: `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`**

Line 70 — change from:
```typescript
const showCuratorContent = isPendingApproval || currentPhase >= 2;
```
To:
```typescript
const showCuratorContent = isPendingApproval || currentPhase >= 3;
```

This restores the correct behavior: Curator Version is hidden during active curation (Phase 2 ACTIVE) and only shown when the curator has explicitly sent it back (`CR_APPROVAL_PENDING`) or advanced past curation (Phase 3+).

### One file, one line change. Zero risk.

