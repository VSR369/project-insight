

# Prompt Engineering Studio: How the 5 Tabs Work During AI Reviews

## What You're Looking At

The Prompt Engineering Studio at `/admin/seeker-config/ai-review-config` is the **control panel** for everything the AI "sees" when it reviews or drafts a curation section. Each of the 26 sections has its own configuration row, edited through these tabs:

```text
┌──────────────┬──────────────────┬───────────────────────┬──────────┬────────────────┐
│ Instructions │ Quality Criteria │ Constraints &         │ Research │ Preview & Test │
│              │                  │ Templates             │          │                │
└──────┬───────┴────────┬─────────┴───────────┬───────────┴────┬─────┴───────┬────────┘
       │                │                     │                │             │
   Layer 4          Layer 2               Layer 2          Layer 3     All 5 Layers
  Supervisor      Structured           Master Data +      Web Search    Assembled
  Overrides       Quality Rules        Maturity Templates  Directives   & Tested
```

## How Each Tab Maps to the 5-Layer Prompt

### Tab 1: Instructions (Layer 4 — Supervisor Overrides)
**Fields:** Review Instructions, Do's, Don'ts, Example Good, Example Poor

This is the **human supervisor's voice**. When a curator clicks "AI Review" on a section, these instructions are injected into the prompt as explicit directives. For example, for `evaluation_criteria`:
- *Review Instructions:* "Check weights sum to 100%, each criterion has a description..."
- *Do:* "Cross-reference with deliverables and scope"
- *Don't:* "Do not invent criteria not implied by the challenge"

### Tab 2: Quality Criteria (Layer 2 — Structured Rules)
**Fields:** Name, Description, Severity (error/warning/suggestion), Cross-References

These are **machine-readable quality gates**. Each criterion tells the LLM exactly what to check and how severely to flag it. Cross-references inject content from other sections so the AI can check consistency. Example for `deliverables`:
- MEASURABILITY (error): "Each deliverable must have quantifiable acceptance criteria" — cross-check with `evaluation_criteria`
- MATURITY_ALIGNMENT (warning): "Deliverable depth must match maturity level" — cross-check with `problem_statement`

### Tab 3: Constraints & Templates (Layer 2 — Data Rules)
**Fields:** Master Data Constraints, Computation Rules, Content Templates (per maturity level)

- **Master Data Constraints** lock the AI to valid values (e.g., for `domain_tags`, only suggest tags from `md_domain_tags` table)
- **Computation Rules** give the AI formulas (e.g., "timeline = todaysDate + duration")
- **Content Templates** provide maturity-specific blueprints (e.g., a POC deliverable template vs a Pilot template)

### Tab 4: Research (Layer 3 — External Knowledge)
**Fields:** Web Search Queries, Industry Frameworks, Analyst Sources

Tells the AI what external knowledge to reference. Example for `context_and_background`:
- Search: "{{domain}} industry trends 2025 market size" (always)
- Frameworks: TOGAF, Value Chain Analysis
- Sources: Gartner, Forrester

### Tab 5: Preview & Test (All 5 Layers Combined)
Shows the **fully assembled prompt** the LLM will receive, with token count estimate and a "Test Live" button to invoke the edge function with mock data.

## The Flow During a Curator AI Review

```text
Curator clicks "AI Review" on a section
       │
       ▼
useAiSectionReview → edge function (review-challenge-sections)
       │
       ▼
assemblePrompt() composes 5 layers:
  1. Platform Preamble (shared consulting persona + anti-hallucination rules)
  2. Section config (quality criteria, constraints, templates from DB)
  3. Research directives (web searches, frameworks)
  4. Supervisor overrides (instructions, dos/donts, examples)
  5. Runtime context (challenge data, cross-referenced section content)
       │
       ▼
Single system prompt → Lovable AI Gateway → LLM response
       │
       ▼
Post-LLM validation (date math, weight sums, master data checks)
       │
       ▼
Result shown in curator panel (accept/reject)
```

## Why Some Boxes Are Empty — and Which Ones Matter

### Current State of All 26 Sections

**5 sections have NO quality criteria and NO cross-references** — they fall back to a simpler "legacy" prompt path that only uses the Instructions tab:

| Section | Quality Criteria | Cross-Refs | Web Search | Instructions | Impact |
|---------|:---:|:---:|:---:|:---:|--------|
| `data_resources_provided` | EMPTY | EMPTY | EMPTY | Minimal | HIGH — new section, needs full config |
| `success_metrics_kpis` | EMPTY | EMPTY | EMPTY | Minimal | HIGH — new section, needs full config |
| `challenge_visibility` | EMPTY | EMPTY | EMPTY | YES | MEDIUM — simple field, but could benefit |
| `effort_level` | EMPTY | EMPTY | EMPTY | YES | MEDIUM — same |
| `submission_deadline` | EMPTY | EMPTY | EMPTY | YES | LOW — date validation handled by post-LLM |

The remaining **21 sections** have quality criteria + cross-references populated and use the full 5-layer prompt path.

### Why This Matters

The `assemblePrompt()` function has a **critical fork** at line 160:

```text
if (!hasStructuredData(config))  →  assembleLegacyPrompt()   // minimal prompt
else                             →  assemblePrompt()          // full 5-layer prompt
```

`hasStructuredData` returns `true` only if `quality_criteria`, `cross_references`, or `master_data_constraints` has at least one entry. **The 5 empty sections above get the legacy path** — a stripped-down prompt with just the Instructions tab content, no quality gates, no cross-section consistency checks, no research directives.

### What Should Be Populated

For the two **new Phase 7 sections**, the spec defined specific quality criteria:

**`data_resources_provided`** should have:
- COMPLETENESS (error): Every data dependency in Scope must have a resource listed
- ACCESS_CLARITY (warning): Each resource must specify format, size, access method
- FORMAT_SPECIFICITY (suggestion): Prefer structured formats (CSV, API) over "will be provided"
- Cross-references: `scope`, `deliverables`, `submission_guidelines`

**`success_metrics_kpis`** should have:
- QUANTITATIVE (error): Every KPI must have a numeric target, not qualitative
- OUTCOME_ALIGNMENT (warning): KPIs must map to Expected Outcomes
- EVALUATION_ALIGNMENT (warning): KPIs should be measurable by evaluation criteria
- BASELINE_REALITY (suggestion): Include current baseline if available
- Cross-references: `expected_outcomes`, `evaluation_criteria`, `deliverables`

### Recommended Fix

Create a migration to populate the quality criteria, cross-references, and research directives for all 5 under-configured sections. Priority:
1. `data_resources_provided` — new, completely bare
2. `success_metrics_kpis` — new, completely bare
3. `challenge_visibility`, `effort_level`, `submission_deadline` — functional but would benefit from structured criteria

This ensures every section gets the full 5-layer prompt with proper quality gates and cross-section consistency checks when curators run AI reviews.

