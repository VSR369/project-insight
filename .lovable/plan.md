

# Fix Plan: Complete Tab Data for All 26 Curation Sections

## Your Assumption is Correct

Not every section needs data in every tab. The 5 tabs serve different purposes, and many sections legitimately have empty sub-tabs:

- **Constraints**: Only needed for sections referencing master data lookup tables (6 sections have them — all correct)
- **Computation Rules**: Only needed for sections with mathematical validation (3 sections have them — correct)
- **Content Templates**: Only needed for rich-text/table sections where output differs significantly by maturity level
- **Web Search / Frameworks / Sources**: Only needed for sections where external research improves AI output quality
- **Supervisor Examples**: Only needed for Critical/High importance sections where review calibration matters

## What's Already Complete (No Action Needed)

**Tab 1 — Instructions**: All 26 sections have instructions, dos, donts, example_good, example_poor, and tone. **100% complete.**

**Tab 2 — Quality Criteria**: All 26 sections have at least 1 criterion (range: 1–5). **100% complete.**

**Tab 5 — Preview & Test**: No stored data — this is a live tool. **N/A.**

**Non-AI sections** (`legal_docs`, `escrow_funding`): These are system-managed. Empty research/templates/supervisor tabs are correct — AI does not draft or review these.

---

## Remaining Gaps (Tab 3 & Tab 4)

### Tab 3: Constraints & Templates — 2 fixes

| Section | Issue | Fix |
|---------|-------|-----|
| `success_metrics_kpis` (High) | Missing content_templates | Add Blueprint/POC/Pilot KPI structure guidance |
| `hook` (Medium) | Missing content_templates | Add maturity-specific hook tone guidance |

All other sections either already have templates (11 sections) or legitimately don't need them (checkbox/selection sections like maturity_level, eligibility, complexity, domain_tags, visibility, ip_model).

### Tab 4: Research — 10 fixes

**Missing web search queries (3 sections that should have them):**

| Section | Importance | Fix |
|---------|-----------|-----|
| `hook` | Medium | Add `{{domain}} challenge marketing engagement hooks` |
| `submission_guidelines` | Medium | Add `{{domain}} challenge submission best practices formats` |
| `ip_model` | High | Add `{{domain}} intellectual property models open innovation` |

**Missing industry frameworks (4 sections that should have them):**

| Section | Current | Add |
|---------|---------|-----|
| `evaluation_criteria` | 0 | Balanced Scorecard, SMART Criteria, Rubric Design |
| `reward_structure` | 0 | Incentive Design Theory, Prize Philanthropy |
| `phase_schedule` | 0 | Stage-Gate, Agile Sprint Planning |
| `solver_expertise` | 0 | Skills Taxonomy, T-Shaped Competency Model |

**Missing analyst sources (0 sections have any — add to 5 Critical/High sections):**

| Section | Sources to Add |
|---------|---------------|
| `problem_statement` | Gartner, McKinsey, HBR |
| `deliverables` | Forrester, Deloitte, IEEE |
| `evaluation_criteria` | NIST, ISO Standards |
| `scope` | BCG, Accenture |
| `context_and_background` | McKinsey, World Economic Forum |

**Missing supervisor examples (8 Critical/High sections without them):**

| Section | Importance | Current | Add |
|---------|-----------|---------|-----|
| `scope` | High | 0 | 2 (pass + fail) |
| `complexity` | Critical | 0 | 2 |
| `context_and_background` | High | 0 | 2 |
| `expected_outcomes` | High | 0 | 2 |
| `success_metrics_kpis` | High | 0 | 2 |
| `data_resources_provided` | High | 0 | 2 |
| `ip_model` | High | 0 | 2 |
| `hook` | Medium | 0 | 2 |

Sections already with supervisor examples: problem_statement (2), deliverables (2), phase_schedule (2), evaluation_criteria (2), reward_structure (2), maturity_level (2). These are fine.

---

## Summary

| Fix Category | Count | Priority |
|-------------|-------|----------|
| Content templates | 2 sections | Medium |
| Web search queries | 3 sections | Medium |
| Industry frameworks | 4 sections | Medium |
| Analyst sources | 5 sections | Low |
| Supervisor examples | 8 sections | Medium |
| **Total SQL UPDATEs** | **22** | — |

All fixes are data-only UPDATEs to `ai_review_section_config`. No code or schema changes required.

