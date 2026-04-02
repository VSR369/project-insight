

# Fix: Curator Assignment + Governance Badge

## Problems Found

### 1. Governance mode resolved from org, not challenge
`AISpecReviewPage.tsx` line 857:
```typescript
const govMode = resolveGovernanceMode(currentOrg?.governanceProfile);
```
This uses the **org's** governance profile (CONTROLLED for New Horizon Company), ignoring the challenge-level `governance_profile` or `governance_mode_override` the Creator selected (QUICK). The sidebar and top bar also show the org default — not the active challenge's mode.

### 2. Casey's pool entry only has `R5_MP`
The migration inserted Casey with `ARRAY['R5_MP']` only. For "All models" coverage, Casey needs `['R5_MP', 'R5_AGG']`.

### 3. Auto-assignment may never fire
Line 1330: `if (industrySegmentId && challengeId && user?.id)` — if the Creator didn't select an industry segment (common in QUICK mode), the entire auto-assignment block is skipped silently.

### 4. Silent error swallowing
Both auto-assign call sites catch and discard all errors (`catch {}`) with no logging. If the RPC fails, there's zero visibility.

---

## Implementation Plan

### Step 1: Database Migration
- Update Casey's pool entry: `role_codes = ARRAY['R5_MP', 'R5_AGG']` to match both engagement models.
- Verify `ON CONFLICT DO NOTHING` didn't skip the original insert (the email uniqueness index may have blocked it if a prior entry existed).

### Step 2: Fix governance resolution in `AISpecReviewPage.tsx`
Change line 857 from:
```typescript
const govMode = resolveGovernanceMode(currentOrg?.governanceProfile);
```
to:
```typescript
const govMode = resolveChallengeGovernance(
  challenge?.governance_mode_override,
  challenge?.governance_profile ?? currentOrg?.governanceProfile,
  currentOrg?.tierCode,
);
```
This uses the 3-layer resolution: challenge override > challenge profile > org default, clamped by tier.

### Step 3: Fix governance badge in shell components
**`CogniSidebar.tsx`** (line 27) and **`CogniTopBar.tsx`** (line 69): These show `currentOrg?.governanceProfile` globally. Since these are shell-level (not challenge-specific), keep org default here but ensure it resolves through `resolveGovernanceMode()` properly. The user's request is specifically about the curator seeing CONTROLLED when the challenge is QUICK — this is the AISpecReviewPage issue (Step 2).

### Step 4: Remove industrySegmentId guard for auto-assignment
Change the guard from:
```typescript
if (industrySegmentId && challengeId && user?.id)
```
to:
```typescript
if (challengeId && user?.id)
```
Pass `industrySegmentId` as `''` when not set. Update `filterAndScore` to skip the industry filter when `industrySegmentId` is empty (it already does — empty pool `industry_segment_ids` = ALL, but an empty input would fail the `!industryIds.includes('')` check).

Both call sites (~line 1330 and ~line 1426) need this fix.

### Step 5: Add error logging to auto-assignment calls
Replace the empty `catch {}` blocks with:
```typescript
catch (err) {
  logWarning('Auto-assign CU failed', {
    operation: 'auto_assign_challenge_role',
    additionalData: { challengeId, error: String(err) },
  });
}
```

### Step 6: Make industrySegmentId optional in AssignmentInput
Update the `AssignmentInput` interface to make `industrySegmentId` optional (`string | undefined`). Update `filterAndScore` to skip the industry match filter when no segment is provided (wildcard behavior for testing).

---

## Files Modified

| File | Change |
|------|--------|
| Migration | Update Casey pool entry to `['R5_MP', 'R5_AGG']` |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Fix governance resolution to use challenge-level mode; remove `industrySegmentId` guard; add error logging |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Make `industrySegmentId` optional; skip industry filter when not set |

## Expected Result After Fix
1. Creator creates QUICK challenge → AISpecReviewPage shows QUICK mode (not CONTROLLED)
2. Creator approves spec → auto-assign fires regardless of industry segment selection
3. Casey's pool entry matches both MP and AGG models with wildcard taxonomy
4. RPC creates CU role for Casey → `get_user_all_challenge_roles` returns CU
5. Casey sees Curation Queue in sidebar and can access challenges

