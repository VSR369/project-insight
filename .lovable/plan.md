
# Phase 11: Industry + Geography Intelligence

## Overview
Add industry-specific knowledge packs (13) and geography context (8 regions) that compose at runtime to enrich AI prompts. Zero breaking changes — no pack match = no change to existing prompts.

---

## Step 1: Database Migration
**Type:** Supabase migration

**Part 1 — Industry Segments Updates:**
- Add 3 new rows to `industry_segments`: `fmcg_consumer`, `electronics_hightech`, `travel_hospitality`
- Update 2 existing segment rows to ensure their codes are set (`manufacturing_auto_components`, `technology_india_it`)
- Uses `ON CONFLICT DO NOTHING` and `IS DISTINCT FROM` for idempotency

**Part 2 — Create `industry_knowledge_packs` table:**
- Columns: `id`, `industry_code` (UNIQUE), `industry_name`, `industry_overview`, `regulatory_landscape` (JSONB keyed by region), `technology_landscape`, `common_kpis` (TEXT[]), `common_frameworks` (TEXT[]), `common_certifications` (TEXT[]), `typical_budget_ranges` (JSONB), `typical_timelines` (JSONB), `preferred_analyst_sources` (TEXT[]), `section_hints` (JSONB), `is_active`, `created_at`, `updated_at`
- RLS: authenticated SELECT, authenticated ALL (admin manage)
- Seed 13 industry packs (finance, healthcare, retail, fmcg_consumer, manufacturing, technology, electronics_hightech, travel_hospitality, energy, education, consulting, manufacturing_auto_components, technology_india_it) — each with detailed regulatory landscape, KPIs, frameworks, section hints

**Part 3 — Create `geography_context` table:**
- Columns: `region_code` (PK), `region_name`, `data_privacy_laws` (TEXT[]), `business_culture`, `currency_context`, `talent_market`, `government_initiatives` (TEXT[]), `technology_maturity`, `country_codes` (TEXT[])
- RLS: authenticated SELECT, authenticated ALL
- Seed 8 regions: india, us, eu, uk, middle_east, singapore, australia, apac_other — each mapped to country codes from existing `countries` table

**Spec alignment notes:**
- The spec uses hardcoded UUIDs for the 2 existing segments (`a333531e-...`, `b1a248ce-...`). These must match the actual DB IDs. If they don't exist, the UPDATE is a no-op (safe).
- The spec's RLS policies use `TO authenticated USING (true)` for admin management — this is intentionally broad for reference data. Acceptable per project pattern (matches existing `industry_segments` admin policy).

---

## Step 2: Prompt Intelligence Injection (Edge Function)
**Files:** `supabase/functions/review-challenge-sections/promptTemplate.ts`, `supabase/functions/review-challenge-sections/index.ts`

**promptTemplate.ts additions (~120 lines):**
- `resolveIndustryCode(code)` — identity function (all codes match master data directly, no legacy mapping needed)
- `COUNTRY_TO_REGION` map — 40+ country codes → 8 region codes
- `countryToRegion(countryCode)` — lookup function
- `buildIndustryIntelligence(industryPack, geoContext, regionCode, batchSectionKeys)` — builds industry context block with overview, region-filtered regulations, KPIs, frameworks, certifications, budget/timeline ranges, and section-specific hints with `{{geography}}` template replacement
- `buildGeographyContext(geoContext)` — builds geography block with privacy laws, business culture, currency, talent, government initiatives, tech maturity

**index.ts changes:**
- After org context fetch (~line 1462), add industry pack + geography context fetch:
  - Resolve `industryCode` from `orgContext.industries[0].code` (requires fetching `code` alongside `name` at line 1453)
  - Resolve `countryCode` from countries table (requires fetching `code` alongside `name` at line 1441)
  - Query `industry_knowledge_packs` by exact match on `industry_code`
  - Query `geography_context` by `countryToRegion(countryCode)`
  - Attach `_industryPack`, `_geoContext`, `_regionCode` to `clientContext`
- Wire into `buildStructuredBatchPrompt` (after domain frameworks block, ~line 981)
- Wire into `buildPass2SystemPrompt` (after REWRITE RULES, ~line 1377)
- Export new functions from promptTemplate.ts

**Key fix vs spec:** The spec says to add industry/geo fetch "after fetching orgContext (~line 1400)" but the current orgContext fetch at line 1448-1460 only selects `id, name` from `industry_segments`. Must change to `id, name, code` so we can resolve the industry code.

---

## Step 3: Discovery Directives Enhancement (Edge Function)
**File:** `supabase/functions/discover-context-resources/index.ts`

- After loading discovery directives and before building the AI prompt, fetch the industry pack
- Merge `preferred_analyst_sources` into each directive's `resource_types[].preferred_sources`
- For regulatory-heavy sections (deliverables, evaluation_criteria, solver_expertise, submission_guidelines, ip_model), append global + regional regulation terms to `discovery_context`
- Import `resolveIndustryCode` and `countryToRegion` — create shared utility or inline (functions are small)
- Non-blocking: wrapped in try/catch, failure = no enrichment

---

## Step 4: Admin UI — Industry Pack Editor
**Files to create:**
- `src/pages/admin/industry-packs/IndustryPacksPage.tsx` (<150 lines) — table listing all packs with Edit action
- `src/components/admin/industry-packs/IndustryPackEditor.tsx` (<200 lines) — Sheet/Dialog form with: industry_name, industry_overview, technology_landscape (Textareas), common_kpis/frameworks/certifications/preferred_analyst_sources (TagInputs), typical_budget_ranges and typical_timelines (3 inputs each: blueprint/poc/pilot), regulatory_landscape (collapsible per-region TagInputs for 8 regions)
- `src/components/admin/industry-packs/SectionHintEditor.tsx` (<150 lines) — Collapsible accordion for 8 section keys (deliverables, solver_expertise, evaluation_criteria, success_metrics_kpis, reward_structure, context_and_background, data_resources_provided, phase_schedule) with hint/anti_patterns/example_good/example_poor/must_include_criteria/typical_certifications/typical_experience fields

**Routing:** Add `/admin/industry-packs` route in App.tsx with `PermissionGuard permissionKey="supervisor.configure_system"`
**Sidebar:** Add "Industry Packs" link in AdminSidebar after "AI Quality" (line ~704)

---

## Step 5: Admin UI — Geography Context Editor
**Files to create:**
- `src/pages/admin/geography-context/GeographyContextPage.tsx` (<150 lines) — table listing 8 regions
- `src/components/admin/geography-context/GeographyContextEditor.tsx` (<180 lines) — Sheet form with readonly region_name, TagInputs for data_privacy_laws/government_initiatives/country_codes, Textareas for business_culture/currency_context/talent_market/technology_maturity

**Routing:** Add `/admin/geography-context` route in App.tsx
**Sidebar:** Add "Geography" link in AdminSidebar after "Industry Packs"

---

## Spec Alignment Issues & Resolutions

| Issue | Resolution |
|-------|-----------|
| Spec references line numbers (~915, ~1290, ~1400) that don't match current file | Use actual codebase locations identified during exploration |
| orgContext.industries only fetches `name`, not `code` | Fix: add `code` to the industry_segments select in index.ts |
| orgContext.hqCountryCode doesn't exist — only `hqCountry` (name) | Fix: also fetch country `code` and store as `orgContext.hqCountryCode` |
| Spec uses `any` type for industry pack/geo context params | Acceptable for edge function internal use (third-party JSONB data) |
| Spec's `resolveIndustryCode` is an identity function | Keep as-is for future extensibility |
| 11 vs 13 packs — spec says "seed 11 packs" in Part 2 header but actually seeds 12 in Part 2 + 1 note about generic `technology` | Seed all 12 shown in SQL + manufacturing_auto_components = 13 total |
| `technology` segment gets no pack (spec note line 255-258) | Correct — orgs with `technology` code get no pack injection. Only `technology_india_it` gets a pack. |

## Token Impact
~800 tokens added per prompt call (~3% of typical prompt) when both industry pack and geography context match.

## Files Changed Summary
- 1 migration file (new)
- 2 edge function files (modified)
- 3 new admin page/component files (industry packs)
- 2 new admin page/component files (geography context)  
- `App.tsx` (2 new routes)
- `AdminSidebar.tsx` (2 new links)
