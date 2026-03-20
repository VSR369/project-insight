
Goal: make solver type assignment fully autonomous, correct, and non-redundant (no human intervention required), while removing any legacy/wrong categories from UI.

1) 5-Why Analysis (current failure)
1. Why are wrong/redundant solver types showing?
   - Because not all screens use one canonical source; some UI paths still contain legacy/static eligibility logic.
2. Why is AI not selecting apt eligibility/visibility reliably?
   - Current edge function still relies heavily on model output, then only does limited post-correction.
3. Why do challenges still show empty solver arrays?
   - Existing challenge rows already have `solver_eligibility_types=[]` and `solver_visibility_types=[]`; no auto-repair runs on load.
4. Why wasn’t this caught?
   - No strict validation gate enforcing “non-empty + non-overlapping + visibility broader than eligibility” before persist.
5. Why did this persist in production behavior?
   - No end-to-end regression test for solver auto-assignment + persistence + reload display across AI intake and review pages.

Root cause:
- Contract inconsistency + legacy UI paths + weak deterministic guardrails + no auto-backfill for existing records.

2) Fix Plan (implementation)

A. Enforce one canonical solver-type source everywhere (5-code model only)
- Use active `md_solver_eligibility` rows as source of truth.
- Remove legacy filtering/legacy options usage in UI paths that still diverge (notably wizard/approval flows).
- Ensure displayed labels map only to: `CE`, `IO`, `DR`, `OC`, `OPEN`.

Files:
- `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`
- `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx`
- `src/constants/challengeOptions.constants.ts` (remove stale HY/static mismatch if still used)

B. Make solver selection deterministic and autonomous in edge function
- Keep AI generation for content, but compute final solver types server-side from challenge signals:
  - inputs: problem statement, deliverables, evaluation criteria, maturity, IP model, eligibility notes.
  - compute sensitivity/openness scores via deterministic rule matrix.
- Select exactly one eligible code + one visible code.
- Enforce strict no-overlap rule and hierarchy:
  - visible must be broader than eligible.
  - if model proposes overlap, auto-correct.
- Return hydrated details from master data every time (never empty).

File:
- `supabase/functions/generate-challenge-spec/index.ts`

C. Auto-repair existing challenges with empty solver arrays
- On `/spec` page load:
  - if solver arrays are empty/malformed, auto-trigger solver re-assignment (no user click),
  - persist via existing save mutation,
  - then re-render with selected types.
- This fixes already-created challenges like `3c9839ae-...` without manual edits.

File:
- `src/pages/cogniblend/AISpecReviewPage.tsx`

D. Persistence hardening
- Normalize saved payload shape before update (codes + labels mapped from active master data).
- Add validation before `saveStep` to block empty solver payloads.
- Persist solver overrides from review page when user edits (optional override, not required).

Files:
- `src/pages/cogniblend/ConversationalIntakePage.tsx`
- `src/hooks/queries/useChallengeForm.ts`
- `src/pages/cogniblend/AISpecReviewPage.tsx`

E. One-time data backfill (existing rows)
- Run a data update for challenges with empty solver arrays to auto-populate based on deterministic rules.
- No schema change required.

3) Technical Details (concise)
- Deterministic hierarchy: `IO < CE < OC < DR < OPEN`.
- Assignment constraints:
  - eligible: exactly 1
  - visible: exactly 1
  - visible rank > eligible rank
  - never identical lists
- Validation gates before save:
  - both arrays present
  - codes exist in active `md_solver_eligibility`
  - non-overlap/hierarchy valid

4) Acceptance Criteria
- AI picks solver eligibility + visibility automatically for new challenges.
- No legacy solver categories appear in any relevant UI.
- Existing challenges with empty solver arrays self-heal on spec load.
- Eligibility/visibility are never redundant.
- User can proceed without manual solver-type intervention.
