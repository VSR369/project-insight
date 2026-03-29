

# Implement Claude's 20-Issue Prompt Audit Fixes — 3 Phases

## Overview

The audit identified 20 issues across the 29 sections. All fixes are database configuration changes (migrations updating `ai_review_section_config` rows) — no frontend or edge function code changes required. The fixes are grouped into 3 phases matching the audit's priority tiers.

---

## Phase 1: "Do Now" — Critical + Quick High Fixes (Issues 1-5, 8-10)

### Issue 1 — Deactivate 3 orphan sections
Set `is_active = false` for `challenge_visibility`, `effort_level`, `submission_deadline`. These have no wave/tab assignment and duplicate other sections.

### Issue 2 — Enable preamble on 2 sections
Copy the standard 17-domain platform preamble into `data_resources_provided` and `success_metrics_kpis` (both currently have `platform_preamble = NULL`).

### Issue 3 — Replace copy-pasted quality criteria on 5 Wave 2 sections
Replace the identical DEPTH/SPECIFICITY/CONSISTENCY criteria with differentiated criteria per the audit:

| Section | New Criteria |
|---------|-------------|
| `root_causes` | STRUCTURAL_DEPTH, EVIDENCE_GROUNDING, CONSISTENCY, DISTINCT_FROM_DEFICIENCIES |
| `affected_stakeholders` | COMPLETENESS, IMPACT_SPECIFICITY, ADOPTION_CHALLENGE |
| `current_deficiencies` | FACTUAL_NOT_ASPIRATIONAL, TOOL_SPECIFICITY, ROOT_CAUSE_DISTINCTION |
| `preferred_approach` | NON_PRESCRIPTIVE, CONTRADICTION_CHECK, FEASIBILITY |
| `approaches_not_of_interest` | SPECIFICITY, JUSTIFICATION, CONTRADICTION_CHECK |

### Issue 4 — Add 4 cross-references to reward_structure
Add: `maturity_level`, `phase_schedule`, `escrow_funding`, `solver_expertise`

### Issue 5 — Change complexity importance to "Critical"
Update `importance_level` from `Medium` to `Critical`.

### Issue 8 — Add problem_statement cross-ref to scope
Append `problem_statement` to scope's cross_references.

### Issue 9 — Add scope cross-ref to context_and_background
Append `scope` to context_and_background's cross_references.

### Issue 10 — Add deliverables cross-ref + quality criterion to expected_outcomes
Append `deliverables` to cross_references. Add DELIVERABLE_COVERAGE quality criterion.

---

## Phase 2: "Do This Week" — High Fixes (Issues 6-7, 11, 15-16)

### Issue 6 — Add good/bad examples for 4 priority sections
Add `example_good` and `example_poor` for:
- `context_and_background` (provided in audit)
- `expected_outcomes` (provided in audit)
- `solver_expertise` (provided in audit)
- `affected_stakeholders` (provided in audit)

### Issue 7 — Add deliverables + scope cross-refs to phase_schedule
Append `deliverables`, `scope` to phase_schedule's cross_references.

### Issue 11 — Add web search directives to 5 sections
| Section | Query |
|---------|-------|
| `expected_outcomes` | `{{domain}} KPI benchmarks enterprise` (always) |
| `evaluation_criteria` | `open innovation challenge evaluation criteria best practices` (if_available) |
| `scope` | `{{domain}} solution scope template enterprise` (for_generation_only) |
| `problem_statement` | `{{domain}} industry challenges statistics 2025` (for_generation_only) |
| `solver_expertise` | `{{domain}} required skills expertise enterprise` (for_generation_only) |

### Issue 15 — Add SELF_CONTAINED quality criterion to scope and submission_guidelines

### Issue 16 — Cross-reference preferred_approach ↔ approaches_not_of_interest
- `preferred_approach` → add `approaches_not_of_interest`
- `approaches_not_of_interest` → add `preferred_approach`, `deliverables`

---

## Phase 3: "Next Sprint" — Medium + Low Fixes (Issues 12-14, 17-20)

### Issue 12 — Add maturity-specific content templates
Add templates for: `expected_outcomes`, `evaluation_criteria`, `solver_expertise` (text provided in audit).

### Issue 13 — Add phase_schedule cross-ref + TIMING criterion to escrow_funding

### Issue 14 — Add eligibility cross-ref + JURISDICTION_COVERAGE criterion to legal_docs

### Issue 17 — Fix maturity_level TRL terminology in supervisor instructions/examples

### Issue 18 — Add complexity cross-ref to data_resources_provided

### Issue 20 — Add INCENTIVE_HIGHLIGHT quality criterion to hook

Issue 19 (token trimming) is deferred — no structural change needed.

---

## Implementation

All changes are a single SQL migration per phase updating `ai_review_section_config` rows. No code files are modified — the 5-layer `assemblePrompt()` function reads these values at runtime.

| Phase | Migration | Rows Affected |
|-------|-----------|--------------|
| Phase 1 | Deactivate 3 + update ~10 sections | ~13 rows |
| Phase 2 | Update ~8 sections (examples, cross-refs, search queries) | ~8 rows |
| Phase 3 | Update ~6 sections (templates, cross-refs, criteria) | ~6 rows |

## Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/new_phase1.sql` | Phase 1 migration |
| `supabase/migrations/new_phase2.sql` | Phase 2 migration |
| `supabase/migrations/new_phase3.sql` | Phase 3 migration |

No frontend or edge function code changes required. The existing `assemblePrompt()` architecture reads all these fields dynamically.

