

# Generate Consolidated 5-Layer Prompts for All Sections

## What This Does

Generate a comprehensive document containing the fully assembled 5-layer prompt for each of the 24 AI-review-enabled curation sections (excluding `legal_docs` and `escrow_funding` which have AI review disabled). You already validated `deliverables` — this covers the remaining 23.

## Approach

Create a Markdown document at `/mnt/documents/` with each section's assembled prompt rendered using mock context (same as the Preview & Test tab uses). Each section entry will show:

1. **Section header** with key, label, importance level
2. **Layer 1** — Platform Preamble (shared, shown once at top, then referenced)
3. **Layer 2** — Quality Criteria, Master Data Constraints, Computation Rules, Content Templates
4. **Layer 3** — Research Directives, Industry Frameworks, Analyst Sources
5. **Layer 4** — Supervisor Instructions, Do's/Don'ts, Good/Bad Examples
6. **Layer 5** — Runtime Context + Cross-Referenced Sections (listed, not injected since no real challenge data)
7. **Token estimate** for each section

The preamble (Layer 1) is identical across all sections, so it will be shown once at the top rather than repeated 23 times.

## Sections Covered (23)

| # | Section Key | Importance |
|---|------------|-----------|
| 1 | `affected_stakeholders` | Medium |
| 2 | `approaches_not_of_interest` | Low |
| 3 | `challenge_visibility` | Medium |
| 4 | `complexity` | Medium |
| 5 | `context_and_background` | High |
| 6 | `current_deficiencies` | Medium |
| 7 | `data_resources_provided` | High |
| 8 | `domain_tags` | Low |
| 9 | `effort_level` | Low |
| 10 | `eligibility` | Medium |
| 11 | `escrow_funding` | High |
| 12 | `evaluation_criteria` | Critical |
| 13 | `expected_outcomes` | High |
| 14 | `hook` | Medium |
| 15 | `ip_model` | High |
| 16 | `maturity_level` | Medium |
| 17 | `phase_schedule` | High |
| 18 | `preferred_approach` | Low |
| 19 | `problem_statement` | Critical |
| 20 | `reward_structure` | High |
| 21 | `root_causes` | Medium |
| 22 | `scope` | High |
| 23 | `solver_expertise` | Medium |
| 24 | `submission_deadline` | Medium |
| 25 | `submission_guidelines` | Medium |
| 26 | `success_metrics_kpis` | High |

## Output

A single Markdown file (`all_section_prompts.md`) written to `/mnt/documents/` that you can download and share with Claude for validation. Each section will be a self-contained block showing exactly what the LLM receives.

## Technical Detail

The script will replicate the `assemblePrompt()` logic from `src/lib/cogniblend/assemblePrompt.ts` using the actual DB configurations queried above, with the same mock context used by `PreviewTestTab`:
- todaysDate: 2026-03-29
- solutionType: technology_architecture
- maturityLevel: poc
- complexityLevel: L3
- seekerSegment: Enterprise

