

# Final Plan: Governance Cleanup — Role Fusion Enforcement + Remove LIGHTWEIGHT

## Summary

Fix the broken SQL enforcement layer so role fusion rules are driven by QUICK/STRUCTURED/CONTROLLED governance modes. Remove legacy LIGHTWEIGHT/ENTERPRISE terminology from DB and frontend.

---

## Part A: SQL Migration — Corrected Ordering

Single migration file. The critical fix: delete old `role_conflict_rules` rows BEFORE adding the new constraint on that table.

### A1. DROP old constraints

```sql
ALTER TABLE seeker_organizations DROP CONSTRAINT IF EXISTS seeker_organizations_governance_profile_check;
ALTER TABLE role_conflict_rules DROP CONSTRAINT IF EXISTS role_conflict_rules_governance_profile_check;
```

### A2. Migrate data (challenges + seeker_organizations)

```sql
UPDATE challenges SET governance_profile = 'QUICK' WHERE governance_profile = 'LIGHTWEIGHT';
UPDATE challenges SET governance_profile = 'STRUCTURED' WHERE governance_profile = 'ENTERPRISE';
UPDATE seeker_organizations SET governance_profile = 'QUICK' WHERE governance_profile = 'LIGHTWEIGHT';
UPDATE seeker_organizations SET governance_profile = 'STRUCTURED' WHERE governance_profile = 'ENTERPRISE';
```

### A3a. ADD constraint on seeker_organizations (data already clean)

```sql
ALTER TABLE seeker_organizations ADD CONSTRAINT seeker_organizations_governance_profile_check
  CHECK (governance_profile IN ('QUICK', 'STRUCTURED', 'CONTROLLED'));
```

### A3b. DELETE old conflict rules (must happen before constraint on this table)

```sql
DELETE FROM role_conflict_rules WHERE governance_profile = 'ENTERPRISE_ONLY';
```

### A3c. ADD constraint on role_conflict_rules (now safe — old rows deleted)

```sql
ALTER TABLE role_conflict_rules ADD CONSTRAINT role_conflict_rules_governance_profile_check
  CHECK (governance_profile IN ('STRUCTURED', 'CONTROLLED', 'BOTH'));
```

### A4. INSERT new conflict rules

```sql
INSERT INTO role_conflict_rules (role_a, role_b, conflict_type, applies_scope, governance_profile)
VALUES
  -- STRUCTURED: soft warnings for spec/curation/approval overlap
  ('CR', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CR', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CU', 'ID', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('CR', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  ('ID', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'STRUCTURED'),
  -- CONTROLLED: hard blocks for core segregation
  ('CR', 'CU', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('CR', 'ID', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('CU', 'ID', 'HARD_BLOCK', 'SAME_CHALLENGE', 'CONTROLLED'),
  -- CONTROLLED: requestor should not write spec or curate
  ('AM', 'CR', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('AM', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('RQ', 'CR', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('RQ', 'CU', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  -- CONTROLLED: evaluation/approval overlap
  ('CR', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED'),
  ('ID', 'ER', 'SOFT_WARN', 'SAME_CHALLENGE', 'CONTROLLED');
```

QUICK mode has zero rows — everything allowed (solo operator).

### A5. Replace `validate_role_assignment` function

Map incoming profile to canonical mode at top of function:
```sql
v_mode := CASE
  WHEN p_governance_profile IN ('LIGHTWEIGHT', 'QUICK') THEN 'QUICK'
  WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED'
  ELSE 'STRUCTURED'
END;
```
- QUICK → return ALLOWED immediately (skip all checks)
- STRUCTURED/CONTROLLED → match rules where `governance_profile IN (v_mode, 'BOTH')`

### A6. Replace `auto_assign_roles_on_creation` function

Replace LIGHTWEIGHT → QUICK, ENTERPRISE → STRUCTURED/CONTROLLED in all branches.

### A7. Update `assign_role_to_challenge` COALESCE fallback

Change `COALESCE(v_governance_profile, 'LIGHTWEIGHT')` to `COALESCE(v_governance_profile, 'QUICK')`.

### A8. Replace `get_governance_behavior` function

Replace ENTERPRISE/LIGHTWEIGHT branches with QUICK/STRUCTURED/CONTROLLED.

### A9. Replace `get_mandatory_fields` function

Replace LIGHTWEIGHT check with QUICK. No dead backward-compat branch.

### A10. Update `auto_curate_lightweight` internals

Keep function name (referenced by `complete_phase`). Simplify internal check to `governance_profile != 'QUICK'` — no dead LIGHTWEIGHT branch.

---

## Part B: Frontend Changes (~22 files)

### B1. `src/lib/governanceMode.ts`

- Rename `isEnterpriseGrade` → `isStructuredOrAbove`
- Add deprecated alias: `export const isEnterpriseGrade = isStructuredOrAbove;`
- Update doc comments to reference QUICK/STRUCTURED/CONTROLLED only
- Keep `LIGHTWEIGHT` → `QUICK` mapping in `resolveGovernanceMode` with comment "legacy DB fallback"

### B2. Rename `isLightweight` → `isQuick` (~18 files)

Mechanical prop/variable rename, no logic changes. Files:

| File | Change |
|------|--------|
| `ChallengeWizardPage.tsx` | variable + all prop passing |
| `ConversationalIntakePage.tsx` | variable + prop passing |
| `SolutionSubmitPage.tsx` | local variable |
| `LegalDocumentAttachmentPage.tsx` | local variable + useEffect dep |
| `StepRewards.tsx` | prop interface + usage |
| `StepRequirements.tsx` | prop interface + usage |
| `StepEvaluation.tsx` | prop interface + usage |
| `StepReviewSubmit.tsx` | prop interface + usage |
| `StepTemplates.tsx` | prop interface + usage |
| `StepTimeline.tsx` | prop interface + usage |
| `StepProviderEligibility.tsx` | prop interface + usage |
| `TargetingFiltersSection.tsx` | prop interface + usage |
| `ApprovalPublicationConfigTab.tsx` | prop passing |
| + remaining files | same pattern |

### B3. Update `GovernanceProfileBadge.test.tsx`

Update test expectations: input `LIGHTWEIGHT` maps to `QUICK` via resolver. Label assertions change from `'LIGHTWEIGHT'` to `'QUICK'`.

### B4. Edge function `setup-test-scenario`

Update governance profile values from `LIGHTWEIGHT` to `QUICK`.

---

## What Does NOT Change

- `useCogniPermissions` hook — already handles multi-role UX
- `CogniRoleContext` / `RoleSwitcher` — unchanged
- `can_perform()` phase checks — orthogonal
- `StepModeSelection.tsx` — already works with QUICK/STRUCTURED/CONTROLLED
- Tier ceiling logic in `governanceMode.ts` — already correct

## Technical Details

- **challenges table**: confirmed NO CHECK constraint on governance_profile — no constraint work needed
- **`resolveGovernanceMode`**: keeps `LIGHTWEIGHT` → `QUICK` mapping as legacy fallback for any stale references
- **`auto_curate_lightweight`**: function name kept to avoid cascading rename through `complete_phase` — only internal logic updated

## Files Summary

| Type | Count |
|------|-------|
| SQL migration | 1 file (A1–A10 in sequence) |
| Frontend rename | ~18 files (`isLightweight` → `isQuick`) |
| Frontend refactor | 1 file (`governanceMode.ts`) |
| Test update | 1 file |
| Edge function | 1 file |

