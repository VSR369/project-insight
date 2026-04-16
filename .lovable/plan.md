

## Plan: Upgrade 26 Section Exemplars to Principal-Grade (Gap B)

### Scope
One data migration with UPDATE statements writing Principal-grade `example_good` content to all 26 remaining sections in `ai_review_section_config` (role_context = 'curation'). This closes the final content gap. No engineering changes, no schema changes, no code changes.

### Approach
Mirror the quality bar set by the 5 completed exemplars (problem_statement, scope, deliverables, evaluation_criteria, reward_structure):
- Concrete numbers, named tools/protocols, and cited benchmarks (e.g., Gartner, ISO, IEEE)
- Cross-references to other sections (e.g., "consistent with deliverables D2")
- Explicit assumptions, boundary conditions, and failure modes
- Industry framework references where natural (TOGAF, DMAIC, FAIR, etc.)
- Length/density appropriate to the section's `importance_level` (Critical = denser, Low = tight)

Use the same anchoring narrative used in the existing 5 exemplars (the GlobalTech / SAP EWM logistics challenge) so the corpus reads as a single coherent gold-standard brief — this is what makes calibration tight.

### Sections covered (26 total, grouped by current state)

**6 sections currently NULL** — write fresh exemplars:
creator_legal_instructions, creator_references, evaluation_config, organization_context, reference_urls, solver_audience

**20 sections with junior-grade exemplars** — rewrite to Principal level:
affected_stakeholders, approaches_not_of_interest, complexity, context_and_background, current_deficiencies, data_resources_provided, domain_tags, eligibility, escrow_funding, expected_outcomes, hook, ip_model, legal_docs, maturity_level, phase_schedule, preferred_approach, root_causes, solution_type, solver_expertise, submission_guidelines, success_metrics_kpis, visibility

### Deliverable
A single migration file `supabase/migrations/<timestamp>_principal_exemplars_remaining_sections.sql` containing 26 `UPDATE ai_review_section_config SET example_good = '...', updated_at = now() WHERE role_context = 'curation' AND section_key = '...';` statements.

### Safety
- Additive content-only change. No schema, no RLS, no code.
- Does not touch the 5 already-upgraded sections.
- Does not touch `importance_level`, `ai_review_level`, or any other column.
- Existing AI review pipeline picks up the new exemplars automatically on next prompt assembly via `useExtendedSectionConfigs` (5-min staleTime).

### Post-migration verification
A read query confirming all 31 active curation sections have non-null `example_good` of length ≥ 200 chars.

