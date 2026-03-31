

# Fix 7 Creator Role Bugs — Implementation Plan

## Summary

7 bugs remain in the Creator workflow. 4 are critical (broken navigation, data overwrite, silent legal failure, deprecated roles), 1 medium (non-clickable stats), 1 low (test data cleanup), plus 1 DB function fix.

## Changes

### 1. SQL Migration (Bugs 4, 5, 7)

Single migration file with three changes:

- **`get_phase_required_role`** — Replace `AM` → `CR` (phases 1-2), `ID` → `CU` (phases 4-6)
- **`auto_assign_roles_on_creation`** — Remove deprecated `ID`/`AM` from role arrays. QUICK assigns `['CR','CU','ER','LC','FC']`, STRUCTURED/CONTROLLED assigns `['CR']`
- **Test data cleanup** — Soft-delete draft challenges with empty/short problem statements; deactivate orphan `user_challenge_roles`

### 2. `src/hooks/cogniblend/useSubmitSolutionRequest.ts` (Bugs 2, 3)

- **Bug 3**: Fix legal template query — remove non-existent `is_default` and `content_summary` columns. Select `description` instead, use it as `content_summary` fallback
- **Bug 2**: Add `referenceUrls`, `currentDeficiencies`, `maturityLevel`, `ipModel` to `SubmitPayload` interface. Include `reference_urls`, `current_deficiencies`, `maturity_level`, `ip_model` in the single Write 1 update so the form's Write 2 doesn't need `extended_brief`

### 3. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` (Bug 2)

- **buildPayload**: Pass `referenceUrls`, `currentDeficiencies`, `preferredApproach`, `approachesNotOfInterest`, `contextBackground`, `rootCauses`, `affectedStakeholders`, `maturityLevel`, `ipModel` into the submit payload
- **Post-submit update (lines 248-264)**: Remove `extended_brief` entirely. Keep only `maturity_level` and `ip_model` — actually move these into the payload too, so the post-submit update is reduced to just file uploads

### 4. `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` (Bug 1)

- Line 138: Change `/cogni/my-requests/` → `/cogni/challenges/`

### 5. `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` (Bug 6)

- Wrap each stat `Card` with `onClick={() => navigate('/cogni/my-challenges')}` and add `cursor-pointer hover:shadow-md transition-shadow` classes

## Technical Details

### SubmitPayload additions
```typescript
interface SubmitPayload {
  // ... existing fields ...
  referenceUrls?: string[];
  currentDeficiencies?: string;
  maturityLevel?: string;
  ipModel?: string;
}
```

### Write 1 extended_brief expansion
```typescript
extended_brief: {
  ...existing spreads...,
  ...(payload.currentDeficiencies ? { current_deficiencies: payload.currentDeficiencies } : {}),
  ...(payload.referenceUrls?.length ? { reference_urls: payload.referenceUrls } : {}),
},
```

Plus `maturity_level` and `ip_model` as top-level columns in the same update.

### Post-submit update reduction
The entire block at lines 248-264 becomes file-upload only (no DB update needed since maturity/ip/extended_brief all handled in Write 1).

### Legal query fix
```typescript
.select('document_type, document_name, description')
.eq('tier', 'TIER_1')
.eq('is_active', true);
// No .eq('is_default', true) — column doesn't exist
```

## Files Changed

| File | Bug(s) |
|------|--------|
| New SQL migration | 4, 5, 7 |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | 2, 3 |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | 2 |
| `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | 1 |
| `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` | 6 |

Total: 1 migration + 4 frontend files.

