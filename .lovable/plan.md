
# Phase 8: Proportionality Anchor + Pre-Flight — Implementation Plan

## Status: APPROVED — Ready to implement

Phases 1–7 are fully done (34 prompts, zero gaps confirmed). This master document adds **Phase 8** (Prompts 8.1 + 8.2) — the only new work. All content for Phases 1–7 in the document matches what is already deployed.

---

## Prompt 8.1 — Pre-flight update + Proportionality Anchor

### Part A: `src/lib/cogniblend/preFlightCheck.ts`

**Replace MANDATORY_SECTIONS** (currently: problem_statement, scope) with:
- `problem_statement` — "The core business problem. AI cannot infer this."
- `maturity_level` — "Blueprint/POC/Pilot determines the scale of all generated content."
- `domain_tags` — "Industry context for frameworks, benchmarks, and expertise requirements."

**Replace RECOMMENDED_SECTIONS** (currently: context_and_background, deliverables) with:
- `scope` — "Helps bound AI output. Will be AI-generated if empty — review carefully."
- `expected_outcomes` — "Guides KPI and evaluation generation. AI can derive from problem if missing."
- `context_and_background` — "Industry context helps specificity. AI uses org profile as fallback."

**Update `preFlightCheck` signature** to accept `operatingModel?: string`. Add marketplace budget check: if operating model is `'MP'`, require `reward_structure.budget_max > 0` as mandatory.

Add a helper `parseRewardStructure(val)` to extract `budget_max` from the reward_structure JSONB.

### Part B: `src/pages/cogniblend/CurationReviewPage.tsx` (line ~1987)

Pass `challenge.operating_model` as second arg:
```typescript
const pfResult = preFlightCheck(sectionContents, challenge.operating_model);
```

### Part C: `supabase/functions/review-challenge-sections/promptTemplate.ts`

**Create** `buildProportionalityAnchor(ctx)` function (~30 lines) that extracts budget min/max, currency, maturity, timeline from clientContext and returns the calibration string with:
- Budget tiers (under $25K, $25K–$100K, $100K–$500K)
- Maturity mapping (Blueprint/POC/Pilot)
- Scope ceiling rule
- 10x test

**Inject into Pass 1** — In `buildStructuredBatchPrompt`, after `parts.push(INTELLIGENCE_DIRECTIVE)` (line 915), add:
```typescript
parts.push(buildProportionalityAnchor(clientContext));
```

**Inject into Pass 2** — In `buildPass2SystemPrompt`, after the "REWRITE RULES" block (after line ~1325), add the anchor with values from `challengeContext`.

**Deploy** the updated edge function.

---

## Prompt 8.2 — DB Migration: SCOPE_PROPORTIONALITY quality criteria

**Migration** to append a `SCOPE_PROPORTIONALITY` criterion to the existing `quality_criteria` JSONB array for 6 sections. Uses `jsonb_concat` / `||` to preserve existing criteria. Idempotent guard: only appends if `SCOPE_PROPORTIONALITY` not already present.

| Section | Severity | Description | Cross-refs |
|---------|----------|-------------|------------|
| deliverables | error | Number and complexity of deliverables must be achievable within budget and timeline | reward_structure, phase_schedule |
| expected_outcomes | warning | Outcomes must be achievable within scope | reward_structure, scope |
| success_metrics_kpis | warning | KPI count must match challenge scale | reward_structure, deliverables |
| solver_expertise | warning | Expertise level must match budget | reward_structure, complexity |
| phase_schedule | error | Phase count must fit within Creator's timeline | reward_structure, deliverables |
| evaluation_criteria | warning | Criteria count proportional to deliverables | deliverables, reward_structure |

---

## Risk: None

- Pre-flight: Moves scope from mandatory→recommended (intentional per plan). Adds maturity_level and domain_tags as mandatory anchors.
- Proportionality anchor: Additive prompt text — appended after existing directives.
- Quality criteria: Append-only JSONB update, existing criteria untouched.
- No breaking changes.

## Files Changed: 4

| File | Action |
|------|--------|
| `src/lib/cogniblend/preFlightCheck.ts` | Update sections + signature |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass operatingModel |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Add + inject proportionality anchor |
| New migration | SCOPE_PROPORTIONALITY criteria |
