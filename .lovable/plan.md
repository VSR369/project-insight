

# Gap Analysis: Remaining Issues Across 26 Active Curation Sections

## Summary

The structural architecture is solid (all sections have instructions, preambles, quality criteria, and cross-references). The remaining gaps are **content completeness** issues — missing examples, dos/donts, and content templates in many sections.

---

## Priority 1: Data Integrity Issues (Fix Now)

### 1. Success Metrics KPIs — web_search_queries use wrong key names
The two search entries use `query` instead of `queryTemplate` and are missing the `purpose` field. Every other section uses `queryTemplate` + `purpose`. This will cause the assembler to skip these queries at runtime.

**Current:** `{"query": "{{domain}} KPI benchmarks..."}`
**Should be:** `{"purpose": "KPI benchmarks", "queryTemplate": "{{domain}} KPI benchmarks...", "when": "always"}`

### 2. Data & Resources — version still 1
All other fixed sections are at version 2. This one was missed.

---

## Priority 2: Missing Dos/Donts (8 sections)

These sections have no `dos` or `donts`, which means the AI gets instructions but no guardrails:

| Section | dos | donts |
|---------|-----|-------|
| expected_outcomes | MISSING | MISSING |
| success_metrics_kpis | MISSING | MISSING |
| data_resources_provided | MISSING | MISSING |
| solver_expertise | MISSING | MISSING |
| approaches_not_of_interest | MISSING | — |
| current_deficiencies | MISSING | — |
| root_causes | MISSING | — |

**Recommended action:** Add concise dos/donts for each. These are short text fields — 3-5 bullet points each.

---

## Priority 3: Missing Examples (6 sections)

These sections lack `example_good` and `example_poor`, so the AI has no reference output to calibrate quality:

| Section | example_good | example_poor |
|---------|-------------|-------------|
| success_metrics_kpis | MISSING | MISSING |
| approaches_not_of_interest | MISSING | MISSING |
| current_deficiencies | MISSING | MISSING |
| preferred_approach | MISSING | MISSING |
| root_causes | MISSING | MISSING |
| data_resources_provided | MISSING | MISSING |

**Recommended action:** Add one good and one poor example for each section. These are the most impactful missing fields — examples anchor the AI's output quality more than any other field.

---

## Priority 4: Missing Content Templates (Most sections)

Only 5 of 26 sections have maturity-specific `content_templates` (context_and_background, expected_outcomes, problem_statement, deliverables, hook). The remaining 21 have empty `{}`.

Content templates provide Blueprint/POC/Pilot-specific structural guidance. Not every section needs them — but these **should** have them:

| Section | Why it needs templates |
|---------|----------------------|
| scope | Scope depth varies significantly by maturity |
| evaluation_criteria | Scoring methods differ by maturity |
| reward_structure | Prize structures differ by maturity |
| phase_schedule | Timeline patterns differ by maturity |
| submission_guidelines | Submission expectations differ by maturity |

**Recommended action:** Add content templates for these 5 high-impact sections. The other 16 can remain empty — their quality criteria already provide sufficient guidance.

---

## Priority 5: Missing Supervisor Examples (24 sections)

Only 2 sections have `supervisor_examples` (maturity_level: 2, hook: 2). All other 24 have 0.

Supervisor examples show the AI what a "pass" vs "fail" review looks like. They are optional but significantly improve review accuracy.

**Recommended action:** Add 2 supervisor examples (1 pass, 1 fail) for at least the 5 Critical/High-importance sections: problem_statement, deliverables, evaluation_criteria, reward_structure, phase_schedule.

---

## Priority 6: Cosmetic / Low Priority

### Missing computation_rules
Only phase_schedule has computation rules (6 rules). Other sections that could benefit: evaluation_criteria (weight sum validation), reward_structure (budget validation). Currently these checks are described in review_instructions text — not structured as computation rules.

### No master_data_constraints on sections that use master data
eligibility, complexity, and maturity_level each have 1 constraint. Sections like visibility, ip_model, and domain_tags reference master data tables in `curationSectionFormats.ts` but have 0 constraints in the DB config. Low impact since the format config already enforces this.

---

## Implementation

All fixes are data-only UPDATEs to `ai_review_section_config`. No code or schema changes.

- **Priority 1:** 2 SQL updates (fix search query keys, bump version) — 5 minutes
- **Priority 2:** 8 updates adding dos/donts text — 15 minutes  
- **Priority 3:** 6 updates adding example_good/example_poor — 20 minutes
- **Priority 4:** 5 updates adding content_templates — 15 minutes
- **Priority 5:** 5 updates adding supervisor_examples — 15 minutes
- **Priority 6:** Optional, defer

**Total estimate: ~70 minutes for Priority 1-5**

## Files Modified

None — database data updates only.

