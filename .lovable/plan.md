

## Plan: Remove Phase 1 Bypass + Unify AI Prompt

Two independent cleanups in one pass.

---

### Part 1 — Remove Phase 1 Bypass (3 files)

**src/hooks/queries/useOrgContext.ts**
- Remove `phase1Bypass` from `OrgModelContext` interface
- Remove `phase1_bypass` from the `.select()` column list
- Remove the `phase1Bypass` line from the return object
- Update the file comment to drop the phase1_bypass mention

**src/pages/cogniblend/ChallengeWizardPage.tsx**
- Delete `isAggBypass` variable (line 119)
- Line 582: simplify `operatingModel` to `propEngagementModel === 'AGG' ? 'AGG' : 'MP'`
- Lines 593-600: remove the `if (isAggBypass)` audit_trail insert block
- Lines 705-720: remove the bypass banner JSX block

**src/pages/cogniblend/CogniDashboardPage.tsx**
- Remove `showBypassBanner` variable and the bypass banner JSX (lines 42, 49-60)
- Remove the `Zap` import (no longer used)

Database column `phase1_bypass` is intentionally left in place for later cleanup.

---

### Part 2 — Unify AI Quality Prompt (1 file)

**supabase/functions/check-challenge-quality/promptBuilder.ts**
- Lines 42-49: replace the MP/AGG branching with a single unified engagement model prompt:
  `"Verify solver eligibility breadth, clarity of deliverables and evaluation criteria, IP model clarity, and org-specific legal requirements."`
- Redeploy the `check-challenge-quality` edge function

---

### Files touched
| File | Change |
|------|--------|
| `src/hooks/queries/useOrgContext.ts` | Remove `phase1Bypass` from type + query |
| `src/pages/cogniblend/ChallengeWizardPage.tsx` | Remove bypass variable, logic, banner |
| `src/pages/cogniblend/CogniDashboardPage.tsx` | Remove bypass banner + Zap import |
| `supabase/functions/check-challenge-quality/promptBuilder.ts` | Unify engagement model prompt |

