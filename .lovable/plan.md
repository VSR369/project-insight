

# Fix 12 Remaining Role Architecture Gaps

## Summary
12 residual references to deprecated roles (AM, RQ, CA, ID, R10_CR) across 10 files. All are straightforward find-and-replace fixes.

---

## Changes by File

### 1. `src/pages/cogniblend/ChallengeCreatePage.tsx` (GAP 1)
- **Line 27:** Change import from `SimpleIntakeForm` to `ChallengeCreatorForm` from `@/components/cogniblend/creator/ChallengeCreatorForm`
- **Lines 488, 505:** Remove "CR/CA" comments, update to "CR"
- The `SimpleIntakeForm` is not actually rendered in the current code flow (landing page shows track cards, AI and editor views render other components), but the import should still be corrected. If it IS rendered somewhere in a fallback, replace with the new `ChallengeCreatorForm`.

### 2. `src/components/cogniblend/SimpleIntakeForm.tsx` (GAP 2)
- **Lines 450, 453:** Change `source_role: isMP ? 'AM' : 'CR'` → `source_role: 'CR'` and `role: isMP ? 'AM' : 'CR'` → `role: 'CR'`
- This file is legacy but may still be reachable. Fix the role references for safety.

### 3. `src/pages/cogniblend/CurationReviewPage.tsx` (GAP 3)
- **Line 4101:** Change `.eq('role_code', 'AM')` → `.eq('role_code', 'CR')`

### 4. `src/components/cogniblend/curation/CurationActions.tsx` (GAP 4)
- **Line 242:** Change `.eq('role_code', 'AM')` → `.eq('role_code', 'CR')`

### 5. `src/pages/cogniblend/CogniLoginPage.tsx` (GAP 5)
- **Lines 37-52:** Update quick-login user configs:
  - MP Solo: `['CR','CU','ER','LC','FC']` (remove AM, ID)
  - Remove `mp-director` entry (ID role)
  - AGG Solo: `['CR','CU','ER','LC','FC']` (remove RQ, ID)
  - Remove `agg-director` entry (ID role)

### 6. `src/components/cogniblend/demo/DemoWorkflowSteps.tsx` (GAP 6)
- **Lines 22-24:** Change step1Role to `'CR'` for both MP and AGG. Update notes to `'Creator submits problem brief'` / `'Creator shares idea'`.
- **Lines 42-49:** Remove the Approval step entirely (step 5 with role 'ID'). Result: 5 steps instead of 6: Create → Spec Review → Legal Docs → Curation → Publication.

### 7. `src/pages/cogniblend/ScreeningReviewPage.tsx` (GAP 7)
- **Line 408:** Change `roles?.includes('ID')` → `roles?.includes('CU')`
- **Line 420:** Change `hasIDRole` → `hasCURole` (rename variable)

### 8. `src/pages/cogniblend/LcLegalWorkspacePage.tsx` (GAP 8)
- **Line 315:** Change `roles?.includes('RQ')` → remove RQ check, keep only `roles?.includes('CR') || isLC`

### 9. `src/pages/cogniblend/AISpecReviewPage.tsx` (GAP 9)
- **Line 825:** Change `userRoles.includes('CR') || userRoles.includes('CA')` → `userRoles.includes('CR')`

### 10. `src/components/cogniblend/curation/rewards/SourceBadge.tsx` (GAP 10)
- **Line 14:** Add `'creator'` to `FieldSourceType`: `'am' | 'ai' | 'curator' | 'creator'`
- **Lines 27-29:** Change `am` config label from `'AM'` to `'Creator'`. Keep key as `am` for backward compat with existing data.

### 11. `src/components/rbac/roles/AssignRoleSheet.tsx` (GAP 11)
- **Lines 379-399:** Remove the dead `{isR10CR && (...)}` department selector block (new member tab)
- **Lines 615-635:** Remove the dead `{isExistingR10CR && (...)}` department selector block (existing member tab)
- **Lines 241, 243, 259, 261, 660, 673:** Remove `isR10CR`/`isExistingR10CR` references from conditions (they're always false)
- **Lines 161-162:** Remove the `const isR10CR = false` and `const isExistingR10CR = false` declarations

### 12. `src/services/notificationRoutingService.ts` (GAP 12)
- **Line 122:** Change `!['AM', 'CR'].includes(r)` → `!['CR'].includes(r)`

### 13. `supabase/functions/review-challenge-sections/index.ts` (Edge function bonus)
- **Lines 263-274:** Remove `intake` and `spec` guidance blocks from `roleGuidance`. The fallback already handles this, but clean up the dead text.

---

## Technical Details

- No new files created
- No database changes
- All changes are string replacements or block removals
- Backward compatibility maintained: `SourceBadge` keeps `am` key but displays "Creator"
- `AssignRoleSheet` dead code removal is safe since `isR10CR` is hardcoded to `false`

