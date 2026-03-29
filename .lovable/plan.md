

# Fix: Add Analyst Sources to 4 Remaining Sections

## Gap
Four sections currently have empty `analyst_sources`: `solver_expertise`, `data_resources_provided`, `submission_guidelines`, and `success_metrics_kpis`.

## Fix — 4 SQL UPDATEs

| Section | Analyst Sources to Add |
|---------|----------------------|
| `solver_expertise` | Gartner TalentNeuron, LinkedIn Economic Graph, Burning Glass Technologies |
| `data_resources_provided` | Gartner, IEEE, Open Data Institute |
| `submission_guidelines` | NIST, ISO Standards, PMI |
| `success_metrics_kpis` | McKinsey, Deloitte, Balanced Scorecard Institute |

## Implementation
4 `UPDATE` statements against `ai_review_section_config` where `role_context = 'curation'` and `section_key` matches each section above. Data-only changes, no code or schema modifications.

