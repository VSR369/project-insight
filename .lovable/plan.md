
# Audit & Fix Plan — Save Draft / AI Review / Submit & Publish across all 6 governance × engagement combos

I traced every code path end-to-end (form → hook → payload builder → RPC → DB → AI edge function). Below are the **real, reproducible** gaps found.

## Verification matrix (current state)

| Step | QUICK-MP | QUICK-AGG | STRUCTURED-MP | STRUCTURED-AGG | CONTROLLED-MP | CONTROLLED-AGG |
|---|---|---|---|---|---|---|
| Save Draft persists all fields | ⚠ partial | ⚠ partial | ⚠ partial | ⚠ partial | ⚠ partial | ⚠ partial |
| Draft re-load restores all fields | ❌ misses 7 fields | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Review boots | ❌ duplicate import | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Review sees all creator fields | ❌ partial selection | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit & Publish writes everything | ⚠ misses `creator_legal_instructions` | ⚠ same | ⚠ same | ⚠ same | ⚠ same | ⚠ same |

## Gaps found

### G1. [CRITICAL — BLOCKS AI REVIEW EVERYWHERE] Duplicate import in edge function
`supabase/functions/check-challenge-quality/index.ts` lines 10 + 12 both import `buildSystemPrompt, buildUserPrompt`. Deno will reject this at boot with `Identifier 'buildSystemPrompt' has already been declared`. Confirms why no logs exist for the function — it never boots. **Effect: AI Review fails for all 6 combinations.**

### G2. [HIGH] AI Review context fetcher omits new creator fields
`contextFetcher.ts` `CHALLENGE_FIELDS_BY_MODE` selects only the legacy field set. It does NOT pull these fields the AI must see to reason about the brief:
- `solver_audience` (AGG-relevant — AI can't comment on audience choice)
- `evaluation_method` + `evaluator_count` (DELPHI vs SINGLE rigor)
- `extended_brief` (preferred_approach, root_causes, current_deficiencies, affected_stakeholders, context_background, is_anonymous, community_creation_allowed) — **all CONTROLLED creator content lives here**
- `creator_legal_instructions`
- `solution_maturity_id`

For CONTROLLED especially this is severe: the AI literally cannot see context_background, root_causes, stakeholders, etc. — the very content CONTROLLED requires.

### G3. [HIGH] Submit/Publish path drops `creator_legal_instructions`
`useChallengeSubmit.mutationFn` (lines 93-135) writes the challenge update but omits `creator_legal_instructions`. The draft-save path writes it via `buildChallengeUpdatePayload`, so if the user clicks Save Draft → Submit it survives. If the user clicks Submit without an intermediate save (e.g., after filling test data + immediately submitting), the latest `creator_legal_instructions` is lost. **Effect: STRUCTURED & CONTROLLED legal-instructions sometimes don't reach the curator.**

### G4. [HIGH] Draft loader misses 7 newly-added fields
`useCreatorDraftLoader` `DRAFT_COLUMNS` does not select, and `form.reset({...})` does not restore:
- `solver_audience` (column exists)
- `evaluation_method` (column exists)
- `evaluator_count` (column exists)
- `creator_legal_instructions` (column exists)
- `phase_durations` (lives in `phase_schedule.phase_durations`)
- `is_anonymous` (lives in `extended_brief.is_anonymous`)
- `community_creation_allowed` (lives in `extended_brief.community_creation_allowed`)

**Effect:** Any reload of a draft loses creator-preference toggles, audience choice, eval method, eval count, phase schedule, and legal instructions. This will silently overwrite the saved values on the next Save Draft (form re-serializes default values).

### G5. [MEDIUM] AI Review prompt doesn't surface the new fields in scoring guidance
Even after G2 is fixed, `promptBuilder.ts` `CREATOR_FIELD_LISTS` excludes:
- `solver_audience` (relevant for AGG STRUCTURED & CONTROLLED — AI should validate Internal/External choice vs problem)
- `evaluation_method` / `evaluator_count` (relevant for STRUCTURED + CONTROLLED — AI should validate that DELPHI is sensible for the prize size)
- `phase_durations` (relevant for CONTROLLED — AI should sanity-check the 5-phase timeline)

So even with the data fetched, the AI is told "ignore these fields."

### G6. [LOW] CONTROLLED preferences not in field list
`CREATOR_REVIEW_FIELDS.CONTROLLED` lists 12 fields but doesn't include `is_anonymous` or `community_creation_allowed`. Both appear in the brief and should be reflected back as a per-field score row (even if just informational), because the new "Fill Test Data" plan explicitly seeds these in CONTROLLED.

### G7. Confirmed-OK (no change needed)
- Draft save **write** path correctly writes all the new fields (`useChallengeDraft.ts` + `buildChallengeUpdatePayload`).
- Submit/publish path correctly writes `solver_audience`, `evaluation_method`, `evaluator_count`, `phase_schedule.phase_durations`, `extended_brief.is_anonymous`, `extended_brief.community_creation_allowed`, `industry_segment_id`, `hook`.
- DB columns exist for all the canonical fields; `is_anonymous` / `community_creation_allowed` correctly live in JSONB only.
- `complete_phase` and `initialize_challenge` RPCs exist.
- QUICK auto-publish notification path is intact.

---

## Fix plan

### Fix 1 — `supabase/functions/check-challenge-quality/index.ts` (1-line delta)
Delete the duplicate import on line 12. Re-deploys automatically.

### Fix 2 — `supabase/functions/check-challenge-quality/contextFetcher.ts` (~6-line delta)
Extend `CHALLENGE_FIELDS_BY_MODE` so each mode pulls the columns the AI needs:

```text
QUICK:      add solver_audience, evaluation_method, evaluator_count
STRUCTURED: add solver_audience, evaluation_method, evaluator_count,
                creator_legal_instructions, extended_brief, solution_maturity_id
CONTROLLED: add solver_audience, evaluation_method, evaluator_count,
                creator_legal_instructions, extended_brief, solution_maturity_id
```

Already selected: title, problem_statement, domain_tags, currency_code, reward_structure, scope, maturity_level, evaluation_criteria, hook, ip_model, phase_schedule, industry_segment_id, governance_mode_override, eligibility, visibility, organization_id, engagement_model_id.

### Fix 3 — `supabase/functions/check-challenge-quality/promptBuilder.ts` (~6-line delta)
Extend `CREATOR_FIELD_LISTS`:
- STRUCTURED: append `solver_audience`, `evaluation_method`, `evaluator_count`
- CONTROLLED: append the same three plus `phase_durations`

So gap reports can include them.

### Fix 4 — `src/hooks/cogniblend/useChallengeSubmit.ts` (1-line delta)
Add `creator_legal_instructions: filteredPayload.creatorLegalInstructions ?? null,` to the `challenges` `.update({...})` block (around line 133), mirroring the draft path.

### Fix 5 — `src/hooks/cogniblend/useCreatorDraftLoader.ts` (~15-line delta)
1. Extend `DRAFT_COLUMNS`:
   `+ solver_audience, evaluation_method, evaluator_count, creator_legal_instructions`.
2. In `form.reset({...})`, add:
   - `solver_audience: ((challenge.solver_audience as string) ?? 'ALL') as 'ALL'|'INTERNAL'|'EXTERNAL'`
   - `evaluation_method: ((challenge.evaluation_method as string) ?? 'SINGLE') as 'SINGLE'|'DELPHI'`
   - `evaluator_count: Number(challenge.evaluator_count ?? 1)`
   - `creator_legal_instructions: (challenge.creator_legal_instructions as string) || ''`
   - `phase_durations: Array.isArray(ps?.phase_durations) ? (ps.phase_durations as CreatorFormValues['phase_durations']) : []`
   - `is_anonymous: eb?.is_anonymous === true`
   - `community_creation_allowed: eb?.community_creation_allowed === true`
   - `quick_legal_override_mode: 'KEEP_DEFAULT'` (kept default; `useQuickLegalOverride` query overrides post-load — already wired)

### Fix 6 — `src/constants/creatorReviewFields.ts` (4-line delta)
Append to `CONTROLLED_FIELDS`:
- `{ key: 'solver_audience', label: 'Solver Audience' }` (only when AGG — but list is governance-only, so include and let the engagement-model layer decide; the AI mapper safely no-ops if no gap)
- `{ key: 'evaluation_method', label: 'Evaluation Method' }`
- `{ key: 'evaluator_count', label: 'Evaluator Count' }`
- `{ key: 'phase_durations', label: 'Phase Schedule' }`

Append to `STRUCTURED_FIELDS`:
- `{ key: 'evaluation_method', label: 'Evaluation Method' }` (STRUCTURED can choose DELPHI)
- `{ key: 'solver_audience', label: 'Solver Audience' }` (AGG only, but harmless for MP since it's locked to ALL and AI gets value)

### Out of scope
- Renaming columns or adding new DB columns — `is_anonymous` and `community_creation_allowed` correctly live in JSONB.
- Changing the AI scoring weights or rubric.
- Changing the curation-side surfaces (`extended_brief` reads on the curator side already work).
- Editing the QUICK publish notification fan-out.
- Touching `creator_approval_required` — already handled.

### Verification after fixes
For each of the 6 combinations:
1. Configure (Step 1) → click **Fill Test Data** → click **Save Draft** → reload page with `?draft=…` → confirm every field re-hydrates (audience, eval method/count, legal instructions, phase schedule, anonymity, community-creation toggle).
2. Click **AI Review** on the saved draft → confirm the function returns 200 with `dimensions`, `summary`, `gaps`, `strengths`, and `fieldResults` covering the new fields where applicable.
3. Click **Submit & Publish** (QUICK) or **Submit to Curator** (STRUCTURED/CONTROLLED) → confirm DB row contains the post-edit `creator_legal_instructions` and the curator sees the full brief.
4. `npx tsc --noEmit` passes; no edge-function boot errors in logs.
