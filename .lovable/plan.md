

# Gap Analysis — Governance & Lifecycle Overhaul

## Status: Steps 1–8 DONE (DB + hooks + admin pages). Steps 9–10 DONE (complete_phase + assign_challenge_role). Residual gaps below.

---

## GAP 1: Stale ENTERPRISE/LIGHTWEIGHT references in frontend code (6 files)

The DB was cleaned, but several frontend files still fallback to `'ENTERPRISE'` string literals:

| File | Line | Issue |
|------|------|-------|
| `src/hooks/cogniblend/useScreeningReview.ts` | 114 | Comment says "for LIGHTWEIGHT display" |
| `src/hooks/cogniblend/useScreeningReview.ts` | 175 | Fallback `?? 'ENTERPRISE'` |
| `src/hooks/cogniblend/usePublicationReadiness.ts` | 186 | Fallback `?? 'ENTERPRISE'` |
| `src/hooks/cogniblend/useManageChallenge.ts` | 146 | Fallback `?? 'ENTERPRISE'` |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | 225 | Passes `"Enterprise"` to RPC |
| Test files (2) | various | `governance_profile: 'ENTERPRISE'` in fixtures |

**Fix:** Replace all `'ENTERPRISE'` fallbacks with `'STRUCTURED'` (the resolved default). Update comment on line 114. Update test fixtures.

---

## GAP 2: `assign_challenge_role` RPC does NOT upsert `user_challenge_roles`

The plan specified Step 8/10 should upsert into `user_challenge_roles` (the governance-level role table). The implemented RPC only writes to `challenge_role_assignments` (the SLM-level assignment table). This means:

- `validate_role_assignment` checks `user_challenge_roles` for conflicts
- But `assign_challenge_role` never writes to `user_challenge_roles`
- Result: conflict validation always passes because the table is never populated by this RPC

**Fix:** Add a `user_challenge_roles` upsert inside `assign_challenge_role` using `p_governance_role_code`.

---

## GAP 3: `useAutoAssignChallengeRoles` still uses OLD RPC signature

The hook calls `assign_challenge_role` with the **old** `auto_assign_challenge_role` parameter names (`p_pool_member_id`, `p_slm_role_code`, etc.). The new RPC created in Step 10 has the same signature, so this is actually fine — the Step 10 migration kept the same params. No gap here on closer inspection.

---

## GAP 4: `useSubmitSolutionRequest` still has inline legal doc logic

Line 180-193 of `useSubmitSolutionRequest.ts` manually auto-attaches legal docs for QUICK mode. This duplicates logic now handled by `complete_phase` (Step 7 auto-sets `lc_compliance_complete` when `legal_doc_mode = 'auto_apply'`). The inline code should be removed to avoid double-writes.

---

## GAP 5: `isEnterprise` naming in useScreeningReview

The variable `isEnterprise` (line 101) and interface field `isEnterprise` (line 48) are misleading — they actually mean "is structured or above" (controls blind evaluation). Should be renamed to `isBlindMode` or `isStructuredOrAbove` for clarity.

---

## GAP 6: Test fixtures use dead values

Two test files reference `governance_profile: 'ENTERPRISE'`:
- `src/components/cogniblend/dashboard/__tests__/MyChallengesSection.test.tsx`
- `src/pages/cogniblend/__tests__/Gate02LegalTransition.test.ts`

**Fix:** Update to `'STRUCTURED'`.

---

## Implementation Plan (4 changes)

### 1. Migration: Fix `assign_challenge_role` to upsert `user_challenge_roles`
Add after the `challenge_role_assignments` upsert:
```sql
INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned, assigned_by)
VALUES (p_user_id, p_challenge_id, p_governance_role_code, true, true, p_assigned_by)
ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE
SET is_active = true, updated_at = NOW();
```

### 2. Clean ENTERPRISE fallbacks (5 files)
Replace `?? 'ENTERPRISE'` with `?? 'STRUCTURED'` in:
- `useScreeningReview.ts` (line 175)
- `usePublicationReadiness.ts` (line 186)
- `useManageChallenge.ts` (line 146)
- `LegalDocumentAttachmentPage.tsx` (line 225): change `"Enterprise"` to `"STRUCTURED"`
- `useScreeningReview.ts` (line 114): update comment

### 3. Rename `isEnterprise` to `isBlindMode` in useScreeningReview
Rename the variable and interface field. Update all 4 references within the file.

### 4. Remove duplicate legal doc auto-attach in useSubmitSolutionRequest
Remove lines 180-193 (the inline QUICK-mode legal doc logic). This is now handled by `complete_phase` + `md_governance_mode_config`.

### 5. Update test fixtures
Change `'ENTERPRISE'` to `'STRUCTURED'` in 2 test files.

