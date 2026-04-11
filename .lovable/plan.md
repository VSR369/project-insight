

## Full Rewrite: `discover-context-resources` Edge Function

### What Changes

Replace the entire edge function with a richer, full-context discovery approach. Key improvements over current version:

1. **All 27 challenge fields fetched** — current version only reads ~10 fields. New version reads problem_statement, scope, deliverables, evaluation_criteria, reward_structure, success_metrics, solver_expertise, complexity, and more.

2. **Rich challenge context block** — `buildChallengeContext()` assembles all section content + extended_brief subsections into a structured text block injected into the AI prompt.

3. **Existing sources as negative context** — `buildExistingSourcesContext()` reads accepted/extracted attachments and includes their summaries so the AI avoids suggesting duplicates.

4. **Industry knowledge pack** — Fetches `common_kpis` and `technology_landscape` in addition to `preferred_analyst_sources` and `regulatory_landscape`.

5. **Current section content in per-section specs** — Each section directive now includes the actual challenge content for that section, giving the AI precise context for what's already written.

6. **Cleaner stale clearing** — Deletes ALL `ai_suggested` sources (not just `suggested` status), ensuring accepted AI suggestions from previous runs are also cleared for a fully fresh discovery.

7. **Auto-extraction trigger** — Sources auto-accepted (confidence >= 0.85) immediately trigger `extract-attachment-text` asynchronously.

8. **Tuned AI parameters** — max_tokens raised to 6000, temperature lowered to 0.2, max sources raised to 35.

### Implementation

Single file replacement + deploy:
- **`supabase/functions/discover-context-resources/index.ts`** — Full rewrite with the provided code
- Deploy via `supabase--deploy_edge_functions`

### Risk Notes
- Step 7 (clearing ALL `ai_suggested` including previously accepted) is intentional per the code comment — each run produces a clean slate. Previously accepted AI sources that the curator explicitly accepted will be re-discovered if still relevant.
- The org query now fetches additional fields (`hq_country_id`, `annual_revenue_range`, `employee_count_range`) — these are read but not heavily used yet; no schema change needed as they exist on the table.
- `safeJson()` and `brief()` helpers add truncation safety throughout.

