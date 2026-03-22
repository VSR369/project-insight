

# Plan: Replace "Challenge Creator" with "Challenge Architect" for MP Model

## Root Causes

From network data, there are two distinct problems:

1. **Database: existing demo challenges have `CR` role, not `CA`** — The `get_user_all_challenge_roles` RPC returns `role_codes: ["CR"]` even for MP challenges. The seeding script assigned `CR` before the fix was added.

2. **Code: `isCR` check in AISpecReviewPage excludes `CA`** — Line 708: `const isCR = userRoles.includes('CR')` does not include `CA`, so Challenge Architects cannot trigger AI generation or see the spec review UI.

3. **Hardcoded "Challenge Creator" strings** — Multiple files still display "Challenge Creator" instead of dynamically choosing based on operating model.

4. **CurationActions queries only `CR`** — The curation return-to-creator query hardcodes `role_code = 'CR'`, missing CA users.

## Changes

### 1. `src/pages/cogniblend/AISpecReviewPage.tsx`
- Change `const isCR = userRoles.includes('CR')` to `const isCR = userRoles.includes('CR') || userRoles.includes('CA')`
- Update the "Waiting for Challenge Creator" message to be model-aware: show "Challenge Architect" when `operating_model === 'MP'`

### 2. `src/hooks/cogniblend/useCompletePhase.ts`
- Add `CA` entry to `ROLE_NAV_MAP`:
  ```
  CA: { label: 'Challenge Architect', path: '/cogni/my-challenges' },
  ```

### 3. `src/components/cogniblend/curation/CurationActions.tsx`
- Change the creator lookup query to search for both `CR` and `CA` role codes using `.in('role_code', ['CR', 'CA'])`

### 4. `src/components/cogniblend/dashboard/MyChallengesSection.tsx`
- Already has CA tab. No changes needed.

### 5. `src/pages/cogniblend/LcReviewPanel.tsx`
- Update "The Challenge Creator will be notified" to "The Challenge Creator/Architect will be notified"

### 6. Demo seed data fix
- The existing MP challenges in the DB have `CR` role code. The seeding edge function needs to assign `CA` for MP challenges. I will search for and update the seed logic to use the correct role code based on operating model.

## Technical Details

The core issue is that `CA` was added as a concept but many code paths still only check for `CR`. This plan ensures every place that references the Challenge Creator role also accounts for Challenge Architect when the operating model is Marketplace.

**Files to modify**: ~5 source files
**Risk**: Low — read-only display label changes plus one role-check expansion
**No database migrations needed** — existing seed data with `CR` on MP challenges should ideally be re-seeded, but the code fix will make both `CR` and `CA` work for Phase 2

