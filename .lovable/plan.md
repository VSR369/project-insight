
# Phase 8: Proportionality Anchor + Pre-Flight (2 Prompts)

Phases 1–7 are fully implemented (34 prompts, zero gaps). This master plan adds **Phase 8** (2 new prompts). No changes to existing Phases 1–7 are needed — their content in the master document matches what is already deployed.

---

## Prompt 8.1 — Update pre-flight check + proportionality anchor

### Part A: Pre-flight (`src/lib/cogniblend/preFlightCheck.ts`)

1. **Replace MANDATORY_SECTIONS** — Remove `scope` (currently mandatory), add `maturity_level` and `domain_tags`. New list:
   - `problem_statement` — "The core business problem. AI cannot infer this."
   - `maturity_level` — "Blueprint/POC/Pilot determines the scale of all generated content."
   - `domain_tags` — "Industry context for frameworks, benchmarks, and expertise requirements."

2. **Replace RECOMMENDED_SECTIONS** — Remove `deliverables`, add `scope` and `expected_outcomes`. New list:
   - `scope` — "Helps bound AI output. Will be AI-generated if empty — review carefully."
   - `expected_outcomes` — "Guides KPI and evaluation generation. AI can derive from problem if missing."
   - `context_and_background` — "Industry context helps specificity. AI uses org profile as fallback."

3. **Update function signature** — Accept `operatingModel?: string` parameter. Add budget check for marketplace mode: if `operatingModel === 'marketplace'` (or `'MP'`), check `reward_structure` for a valid `budget_max > 0`, and push a mandatory blocker if missing.

4. **Update caller** in `CurationReviewPage.tsx` — Pass `challenge.operating_model` to `preFlightCheck(sectionContents, challenge.operating_model)`.

### Part B: Proportionality Anchor (`supabase/functions/review-challenge-sections/promptTemplate.ts`)

1. **Create `buildProportionalityAnchor(ctx)` function** — Extracts budget min/max, currency, maturity, timeline from `clientContext` and returns a formatted anchor string with calibration rules (under $25K, $25K–$100K, $100K–$500K) and the 10x test.

2. **Inject into Pass 1** — In `buildStructuredBatchPrompt`, after `INTELLIGENCE_DIRECTIVE`, add `parts.push(buildProportionalityAnchor(clientContext))`.

3. **Inject into Pass 2** — In `buildPass2SystemPrompt`, after "REWRITE RULES" section, inject the anchor with substituted values from `challengeContext`.

4. **Deploy** the updated edge function.

---

## Prompt 8.2 — DB: Add SCOPE_PROPORTIONALITY quality criteria

**Database migration** to append a new `SCOPE_PROPORTIONALITY` criterion to the `quality_criteria` JSONB array for 6 sections:

| Section | Severity | Description | Cross-references |
|---------|----------|-------------|-----------------|
| `deliverables` | error | Number and complexity of deliverables must be achievable within budget and timeline | reward_structure, phase_schedule |
| `expected_outcomes` | warning | Outcomes must be achievable within scope | reward_structure, scope |
| `success_metrics_kpis` | warning | KPI count must match challenge scale | reward_structure, deliverables |
| `solver_expertise` | warning | Expertise level must match budget | reward_structure, complexity |
| `phase_schedule` | error | Phase count must fit within Creator's timeline | reward_structure, deliverables |
| `evaluation_criteria` | warning | Criteria count proportional to deliverables | deliverables, reward_structure |

Uses JSONB `||` append to preserve existing criteria. Idempotent (checks `NOT quality_criteria::text LIKE '%SCOPE_PROPORTIONALITY%'`).

---

## Risk Assessment

- **Pre-flight change**: Moves `scope` from mandatory → recommended. This is intentional — the plan says scope can be AI-generated. `maturity_level` and `domain_tags` become mandatory instead (they anchor AI output scale).
- **Proportionality anchor**: Additive prompt injection — does not modify existing prompt structure, only appends after existing directives.
- **Quality criteria migration**: Append-only to existing JSONB arrays. Existing criteria untouched.
- **No breaking changes** to any existing functionality.

---

## Files Changed

| File | Action |
|------|--------|
| `src/lib/cogniblend/preFlightCheck.ts` | Update sections + signature |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass operatingModel to preFlightCheck |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Add buildProportionalityAnchor + inject |
| New migration | SCOPE_PROPORTIONALITY criteria |
| `.lovable/plan.md` | Mark Phase 8 done |
