

# Fix Plan: Remaining Audit Issues (6 still open + 3 new)

## Current State Assessment

After verifying the database, several items the audit flagged are **already fixed**:
- **Escrow Funding** already has `phase_schedule` in cross_references ✓
- **Data & Resources** already has `complexity` in cross_references ✓  
- **Problem Statement** already has a web search directive ✓
- **Success Metrics KPIs** web search queries have content (not blank) ✓
- **Hook** has INCENTIVE_HIGHLIGHT criterion ✓

**Actually remaining fixes: 4 data updates via INSERT tool**

---

## Fix 1: Success Metrics KPIs — Bump version to 2
The preamble fix didn't bump the version. Update `version` from 1 to 2.

**SQL:** `UPDATE ai_review_section_config SET version = 2 WHERE section_key = 'success_metrics_kpis' AND role_context = 'curation'`

## Fix 2: Maturity Level — Remove TRL terminology
Replace `review_instructions` to remove all TRL references ("TRL3", "TRL 1-3", "TRL 4-6", "TRL 7-9") and use only platform terms (Blueprint, POC, Pilot). Change the rule "any maturity level above TRL3 requires evidence" to "POC and Pilot maturity levels require evidence of technical context."

Updated definitions:
- **Blueprint**: Strategic analysis, framework design, feasibility study. No working code required.
- **POC / Proof of Concept**: Working prototype demonstrating technical feasibility. Limited scope, controlled environment.
- **Pilot**: Production-ready system tested in real-world conditions. Full operational documentation required.

## Fix 3: Differentiate Wave 2 web search queries
Currently all 5 Wave 2 sections share the same query `"{{domain}} common challenges root causes enterprise"`. Update each:

| Section | New queryTemplate |
|---------|------------------|
| `root_causes` | Keep as-is |
| `affected_stakeholders` | `{{domain}} stakeholder analysis change management enterprise` |
| `current_deficiencies` | `{{domain}} current system limitations technology gaps` |
| `preferred_approach` | `{{domain}} solution approaches best practices emerging` |
| `approaches_not_of_interest` | Remove web search query entirely (human-only section) |

## Fix 4: Evaluation Criteria — Align supervisor instructions with validation layer
Change the instruction from "weights sum exactly to 100% — compute this explicitly, do not assume" style to: "Flag weight errors explicitly — state the computed sum. The system validation layer will suggest normalization, but the curator must approve." This removes the conflict where the prompt says "don't adjust" but the system auto-normalizes.

---

## Implementation

All 4 fixes are **data updates** to existing rows — executed via the INSERT tool (UPDATE statements). No schema migrations or code changes required.

## Files Modified

None — database data updates only.

