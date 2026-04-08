

# Fix Legal Documents + Remaining Governance Bugs

## Overview

Six interlinked fixes addressing legal document visibility, governance mode resolution, and test alignment.

---

## Fix A — LegalDocumentAttachmentPage reads wrong governance field

**File:** `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx`

**Problem:** Line 205 queries only `governance_profile` (org-level legacy value). Line 460 resolves governance from `challenge?.governance_profile` — never reads `governance_mode_override`.

**Fix:**
- Add `governance_mode_override` to the `.select()` on line 205
- Change line 460 to resolve from `COALESCE(governance_mode_override, governance_profile)`:
  ```typescript
  const isQuick = isQuickMode(resolveGovernanceMode(
    challenge?.governance_mode_override ?? challenge?.governance_profile
  ));
  ```
- Similarly update the RPC call (line 227) to pass the resolved mode instead of raw `governance_profile`

---

## Fix B — Legacy mode names not mapped in resolveGovernanceMode

**File:** `src/lib/governanceMode.ts`

**Problem:** `resolveGovernanceMode('ENTERPRISE')` falls to `'STRUCTURED'` (correct), but `resolveGovernanceMode('LIGHTWEIGHT')` also falls to `'STRUCTURED'` instead of `'QUICK'`.

**Fix:** Add a legacy normalization map before the `VALID_MODES` check:
```typescript
const LEGACY_MODE_MAP: Record<string, GovernanceMode> = {
  LIGHTWEIGHT: 'QUICK',
  ENTERPRISE: 'CONTROLLED',
};
```
Apply it: if `LEGACY_MODE_MAP[raw]` exists, return it; otherwise proceed to `VALID_MODES` check.

---

## Fix C — get_required_legal_docs RPC uses legacy 'enterprise' check

**File:** New migration

**Problem:** The RPC (line 84) checks `LOWER(p_governance_profile) = 'enterprise'` — never matches `'CONTROLLED'`. CONTROLLED mode gets the lightweight (non-enterprise) document set.

**Fix:** Replace the enterprise check with new mode names:
```sql
IF UPPER(TRIM(p_governance_profile)) IN ('CONTROLLED', 'ENTERPRISE') THEN
  -- Include enterprise-level Tier 2 docs
ELSE
  -- Standard/Quick: only plain maturity matches
END IF;
```

---

## Fix D — QUICK mode submit never creates challenge_legal_docs rows

**File:** `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

**Problem:** QUICK submit calls `complete_phase` which auto-advances through Phase 3. The `complete_phase` function does insert legal docs at Phase 3 entry (line 89-97), but only inserts `TIER_1` with no maturity filter — it grabs ALL active templates. The `ChallengeLegalDocsCard` on the detail page queries `challenge_legal_docs` and shows them, but since `complete_phase` uses `ON CONFLICT DO NOTHING`, any conflict silently drops rows.

**Current state:** `complete_phase` already handles QUICK auto-attach (lines 86-98). The issue is it doesn't filter by maturity level. Fix in migration:

```sql
-- In the QUICK auto_apply block, add maturity filter:
AND (required_for_maturity ? v_maturity_key OR required_for_maturity IS NULL)
```

Also add the same maturity filter to STRUCTURED and CONTROLLED blocks.

---

## Fix E — sectionRoutes.ts missing complexity entry

**File:** `src/lib/sectionRoutes.ts`

**Problem:** Test expects `complexity → 'assess-complexity'` but the route map only has `reward_structure`.

**Fix:** Add the entry:
```typescript
export const SECTION_REVIEW_ROUTES: Partial<Record<SectionKey, string>> = {
  complexity: 'assess-complexity',
  reward_structure: 'refine-challenge-section',
};
```

---

## Summary of Files

| File | Change |
|------|--------|
| `src/lib/governanceMode.ts` | Add `LEGACY_MODE_MAP` for LIGHTWEIGHT→QUICK, ENTERPRISE→CONTROLLED |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | Fetch `governance_mode_override`, resolve effective mode |
| `src/lib/sectionRoutes.ts` | Add `complexity: 'assess-complexity'` |
| New migration SQL | Rewrite `get_required_legal_docs` to use QUICK/STRUCTURED/CONTROLLED; add maturity filter to `complete_phase` legal doc inserts |

