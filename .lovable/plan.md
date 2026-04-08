

# 5-Why Analysis: Sidebar Shows Irrelevant Items Despite Governance Filtering

## 5-Why Root Cause

1. **Why** does the sidebar show Curation Queue, Legal Workspace, etc. for this user? → `govAware()` returns `true` for CU/LC/FC/ER items
2. **Why** does `govAware` return true? → `hasNonQuickChallenges` is `true`, so `govAware` bypasses filtering and returns the base `sees()` result
3. **Why** is `hasNonQuickChallenges` true? → User has 1 CONTROLLED + 1 STRUCTURED challenge (where they hold only CR role)
4. **Why** does having ANY non-QUICK challenge unlock ALL nav items? → The flag is a simple boolean — it doesn't check WHICH roles the user holds for non-QUICK challenges
5. **Root cause → `govAware` uses a binary "has any non-QUICK challenge" check, but the user holds CU/LC/FC/ER ONLY on QUICK challenges (system artifacts from auto-advance). For their STRUCTURED/CONTROLLED challenges, they only hold CR. The filter should check whether the user holds the SPECIFIC role for non-QUICK challenges.**

**DB evidence:** User `376d7eb8` has CU/ER/LC/FC assigned only to QUICK challenges. Their CONTROLLED/STRUCTURED challenges only have CR. Yet all 12 nav items appear.

---

## Fix Plan — 2 Files

### 1. `src/hooks/cogniblend/useCogniUserRoles.ts`

Replace the boolean `hasNonQuickChallenges` with a `nonQuickRoleCodes` Set that contains only role codes from non-QUICK challenges.

```
// Before:  hasNonQuickChallenges: boolean (true if ANY challenge is non-QUICK)
// After:   nonQuickRoleCodes: Set<string> (roles from non-QUICK challenges only)
```

Derive by filtering `query.data` rows where `governance_mode !== 'QUICK'` and collecting their `role_codes` into a Set. Keep `hasNonQuickChallenges` as a derived boolean (`nonQuickRoleCodes.size > 0`) for backward compatibility.

### 2. `src/hooks/cogniblend/useCogniPermissions.ts`

Update `govAware` to check whether the specific role codes exist in `nonQuickRoleCodes`:

```
// Before:
const govAware = (codes, base) => {
  if (!base) return false;
  if (hasNonQuickChallenges) return true;  // ← BUG: bypasses for ALL roles
  return codes.includes('CR');
};

// After:
const govAware = (codes, base) => {
  if (!base) return false;
  // Show item only if user holds THIS role for a non-QUICK challenge
  if (codes.some(c => nonQuickRoleCodes.has(c))) return true;
  // QUICK-only: only CR items visible
  return codes.includes('CR');
};
```

This means:
- **QUICK-only user**: sees Dashboard, New Challenge, My Challenges only
- **User with CU role on STRUCTURED challenge**: also sees Curation Queue
- **User with CR on CONTROLLED + CU/LC/FC/ER only on QUICK**: sees only CR items (CU/LC/FC/ER are artifacts)

### Expected Result for the Screenshot User

Before: 12 nav items (Dashboard + 5 CHALLENGES + 6 SOLUTIONS)
After: 3 nav items (Dashboard, New Challenge, My Challenges) — matching the QUICK-mode Creator experience

