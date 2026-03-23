

# Fix: Clamp Governance Mode to Tier-Allowed Modes

## Problem
When loading a challenge in edit mode, the code at line 484-486 sets governance mode directly from `ch.governance_profile` via `resolveGovernanceMode()`, without checking if that mode is allowed for the org's current tier. A Basic-tier org seeing a challenge stored as STRUCTURED violates BR: Basic tier = QUICK only.

## Fix
**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`**

Line 484-487 — clamp the resolved mode to available modes for the org's tier:

```typescript
if (ch.governance_profile && !propGovernanceMode) {
  const resolved = resolveGovernanceMode(ch.governance_profile as string);
  const allowed = getAvailableGovernanceModes(currentOrg?.tierCode);
  setLocalGovernanceMode(allowed.includes(resolved) ? resolved : allowed[0] ?? 'QUICK');
}
```

Also apply the same clamping at line 399-401 (the org-defaults sync), which already uses `getDefaultGovernanceMode` and is correct — no change needed there.

This is a 1-line logic change in a single file.

