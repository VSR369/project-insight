
Goal: stop the repeated “Invalid …” save failures by validating/normalizing all constrained challenge fields in one pass before DB update, so AI → create challenge → next step always works.

1) Root-cause audit (single source of truth = DB trigger)
- I’ll align all outbound values to `trg_challenges_validate_cogniblend` constraints:
  - `maturity_level`: `BLUEPRINT | POC | PROTOTYPE | PILOT`
  - `ip_model`: `IP-EA | IP-NEL | IP-EL | IP-JO | IP-NONE`
  - `complexity_level`: `L1..L5`
  - `rejection_fee_percentage`: `5..20`
- Current mismatch confirmed:
  - AI function returns `FULL_TRANSFER | LICENSE | SHARED | SOLVER_RETAINS`
  - Wizard UI sends `exclusive_assignment | non_exclusive_license | ...`
  - DB rejects these.

2) Add a centralized normalization layer (fix-all-at-once)
- Create a shared utility (e.g. `src/lib/cogniblend/challengeFieldNormalizer.ts`) that:
  - normalizes case/format (`blueprint` → `BLUEPRINT`, etc.)
  - maps all known IP aliases to DB codes:

```text
FULL_TRANSFER / exclusive_assignment -> IP-EA
LICENSE / non_exclusive_license      -> IP-NEL
EXCLUSIVE_LICENSE / exclusive_license-> IP-EL
SHARED / joint_ownership             -> IP-JO
SOLVER_RETAINS / no_transfer         -> IP-NONE
```

  - clamps `rejection_fee_percentage` to 5–20
  - validates constrained fields together and returns one aggregated error message if anything remains invalid.

3) Enforce normalization at every write path
- Apply normalizer inside `useSaveChallengeStep` (most important, covers AI + wizard saves).
- Apply before AI intake save in `ConversationalIntakePage.tsx`.
- Apply in `ChallengeWizardPage.tsx` (`buildFieldsFromForm`) so form state and payload stay consistent.

4) Align AI output + form options to DB contract
- Update `supabase/functions/generate-challenge-spec/index.ts` prompt/tool enum to return DB IP codes directly.
- Update wizard IP select option values (StepRewards, and StepRequirements if retained) to store DB codes while keeping user-friendly labels.
- Keep display labels mapped from DB codes so users don’t see raw codes.

5) Backend safety net (optional but recommended for “once-for-all”)
- Add a migration to harden `trg_challenges_validate_cogniblend`:
  - normalize common legacy aliases in-trigger before validation.
  - still raise clear errors for truly unknown values.
- This protects old clients/seeders and prevents future regressions.

6) Regression tests
- Unit tests for normalizer:
  - all IP aliases map correctly
  - maturity normalization
  - fee clamping
  - invalid aggregate error path
- AI flow test: generated `LICENSE`-style input no longer blocks save.
- Wizard flow test: selecting each IP option persists without DB error.

7) Validation checklist after implementation
- Generate with AI from `/cogni/challenges/create`:
  - challenge is created
  - save step succeeds
  - navigation proceeds to next page
- Edit and save in Advanced Editor with all IP options.
- Confirm no `Invalid ip_model` (or similar constrained-field) errors in console/network.
