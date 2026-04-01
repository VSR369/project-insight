

# Creator → Detail View Data Alignment Fix

## Problem

The user correctly identified that the Creator Challenge Detail View ("My Version") shows fields the Creator **did not explicitly fill in**. After querying the actual `md_governance_field_rules` table, I found the root causes:

### Finding 1: IP Model has `visibility: 'auto'` for QUICK mode
The `isFieldVisible()` function only hides fields with `visibility === 'hidden'`. Since `'auto'` !== `'hidden'`, the IP field **shows in the form** AND gets the default value `IP-NEL` from `defaultValues`. The user never chose it, but it appears in the snapshot and detail view as if they did.

**Design intent**: QUICK mode should auto-assign IP-NEL silently — user shouldn't see or interact with it. The detail view shouldn't display auto-assigned values as user decisions.

### Finding 2: Scope has `visibility: 'optional'` for QUICK mode
Per project memory, QUICK mode hides Scope. But the DB rule says `optional`, not `hidden`. After our recent refactor (replacing hardcoded `!isQuick` with `isFieldVisible()`), Scope now **incorrectly shows** in QUICK mode because `'optional'` passes the visibility check.

### Finding 3: Expected Outcomes has `visibility: 'optional'` for QUICK mode
But per project memory: "Expected Outcomes is mandatory across all governance modes." The DB rule contradicts the documented requirement.

### Finding 4: Detail view shows empty/default values from snapshot
The snapshot saves auto-defaulted values (IP-NEL, empty scope, budget 0/0) even when the user didn't interact with them. The detail view renders these because `snapshot.ip_model` is truthy (`'IP-NEL'`).

## Fix Plan

### 1. Update `isFieldVisible()` to treat `'auto'` as not visible
**File:** `src/hooks/queries/useGovernanceFieldRules.ts`

```typescript
export function isFieldVisible(rules: FieldRulesMap, fieldKey: string): boolean {
  const rule = rules[fieldKey];
  if (!rule) return true;
  return rule.visibility !== 'hidden' && rule.visibility !== 'auto';
}
```

This ensures auto-assigned fields (like IP for QUICK) are hidden from the form AND the detail view.

### 2. Fix DB governance rules for QUICK mode
**Migration:** Update 3 field rules:
- `scope` for QUICK: change `optional` → `hidden` (matches original design)
- `expected_outcomes` for QUICK: change `optional` → `required` (matches project memory: mandatory for all modes)
- Optionally verify `ip_model: 'auto'` is correct intent

### 3. Ensure snapshot excludes auto/hidden field values
**File:** `src/hooks/cogniblend/useSubmitSolutionRequest.ts`

The snapshot construction should check governance visibility before including fields. For `'auto'` fields, save the auto-assigned value to the DB column but **exclude it from the snapshot** (since it wasn't a user decision). Apply the same `stripHiddenFields` to the snapshot object.

### 4. Detail view: skip rendering sections with empty/default data
**File:** `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx`

The `myVersionSections` already has null checks per section, but auto-defaulted values like `ip_model: 'IP-NEL'` and `budget: 0/0` pass these checks. Since fix #3 strips them from snapshots, new submissions will be clean. For existing snapshots, the governance field rules filter in `FilteredSections` will handle hiding (since `'auto'` is now treated as not visible).

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/queries/useGovernanceFieldRules.ts` | Treat `'auto'` visibility as not visible |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Strip hidden/auto fields from snapshot |
| Migration | Fix `scope` (→ hidden), `expected_outcomes` (→ required) for QUICK mode |

## Not Changed
- `EssentialDetailsTab.tsx` — already uses `isFieldVisible()`, will auto-correct once `'auto'` is handled
- `CreatorChallengeDetailView.tsx` — already uses `fieldRules` filter, will auto-correct
- `MyChallengesPage.tsx` list cards — only shows title/badges, no domain tags or IP (confirmed correct)

