

## Fix: Enforce 5-8-12 Field Visibility Rule for Creator Form

### Problem
The Creator form shows too many fields because `md_governance_field_rules` has `optional` and `ai_drafted` visibility for many fields that should be `hidden` from the Creator. Currently:
- **QUICK**: 5 required, 2 optional, 34 hidden, 14 auto — mostly correct
- **STRUCTURED**: 8 required, 23 optional, 10 ai_drafted, 1 hidden, 13 auto — **33 visible fields instead of 10**
- **CONTROLLED**: 12 required, 19 optional, 10 ai_drafted, 1 hidden, 13 auto — **41 visible fields instead of 18**

The `isFieldVisible()` helper shows anything not `hidden` or `auto`, so `optional` and `ai_drafted` fields all render on the Creator form.

### Part A — Database Migration

A single migration that resets all three modes to `hidden`, then selectively sets visible fields.

**QUICK (5 required):** title, problem_statement, domain_tags, currency_code, platinum_award
- Auto-defaults for: reward_type, challenge_visibility, challenge_enrollment, challenge_submission, eligibility, maturity_level, num_rewarded_solutions, gold_award, rejection_fee_pct, ip_model
- Everything else: hidden

**STRUCTURED (8 required + 2 optional):**
- Required: title, problem_statement, scope, domain_tags, currency_code, platinum_award, maturity_level, weighted_criteria
- Optional: context_background, expected_timeline
- Auto: reward_type, challenge_visibility, challenge_enrollment, challenge_submission, eligibility, num_rewarded_solutions, gold_award, rejection_fee_pct, ip_model, deliverables_list
- Everything else: hidden

**CONTROLLED (18 required):**
- Required (Essential): title, problem_statement, scope, domain_tags, currency_code, platinum_award, maturity_level, weighted_criteria, hook, context_background, ip_model, expected_timeline
- Required (Additional Context): preferred_approach, approaches_not_of_interest, current_deficiencies, root_causes, affected_stakeholders, expected_outcomes
- Auto: reward_type, challenge_visibility, challenge_enrollment, challenge_submission, eligibility, num_rewarded_solutions, gold_award, rejection_fee_pct, deliverables_list
- Everything else: hidden

### Part B — Frontend: Auto-defaults for hidden fields on submit

**File: `src/lib/cogniblend/challengePayloads.ts`**
- Add an `AUTO_DEFAULTS` constant with sensible defaults for auto-populated fields (reward_type, challenge_visibility, ip_model, maturity_level, etc.)
- In `buildChallengeUpdatePayload`, apply these defaults when the field value is empty/null and the governance rules mark it as `auto`

**File: `src/components/cogniblend/creator/creatorFormSchema.ts`**
- For STRUCTURED mode: make `expected_outcomes`, `ip_model`, `hook`, `preferred_approach`, `approaches_not_of_interest`, `current_deficiencies`, `root_causes`, `affected_stakeholders` all optional with safe defaults (they are hidden from the Creator in STRUCTURED)
- The schema already handles QUICK correctly; ensure STRUCTURED doesn't require hidden fields

### Part C — Frontend: Hide Additional Context tab for STRUCTURED

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- Change line 207 from `{!isQuick && <TabsTrigger ...>}` to `{isControlled && <TabsTrigger ...>}`
- For STRUCTURED, move context_background and expected_timeline to the bottom of EssentialDetailsTab in a collapsible "Additional context (optional)" section

**File: `src/components/cogniblend/creator/EssentialDetailsTab.tsx`**
- Add a collapsible section at the bottom (using `Collapsible` from shadcn) containing context_background (RichTextEditor) and expected_timeline (Select) — only rendered when `governanceMode === 'STRUCTURED'`
- These fields are already governance-gated by `isFieldVisible()` so they'll naturally appear only when the DB says they should

### Files Changed

| File | Change |
|------|--------|
| New migration | Reset + set correct visibility for all 3 modes |
| `challengePayloads.ts` | Add AUTO_DEFAULTS, apply on submit |
| `creatorFormSchema.ts` | Make hidden fields optional in STRUCTURED |
| `ChallengeCreatorForm.tsx` | Show Additional Context tab only for CONTROLLED |
| `EssentialDetailsTab.tsx` | Add collapsible optional section for STRUCTURED |

