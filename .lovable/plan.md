

# Phase 11: Industry + Geography Intelligence

## Summary
Add 2 new DB tables (`industry_knowledge_packs`, `geography_context`) with seed data, inject industry/geography context into AI review prompts, enrich discovery directives, and build 2 admin UI pages for managing packs and regions.

---

## Step 1: Database Migration
Create a single migration with 3 parts:

**Part 1 — Industry Segments:** Insert 3 new segments (`fmcg_consumer`, `electronics_hightech`, `travel_hospitality`). Update 2 existing segment codes (`manufacturing_auto_components`, `technology_india_it`) using their known UUIDs.

**Part 2 — `industry_knowledge_packs` table:** 13 columns including JSONB `regulatory_landscape` (keyed by region), TEXT[] arrays for KPIs/frameworks/certifications, JSONB `section_hints`. RLS: authenticated read, authenticated manage. Seed 13 packs covering all industry codes.

**Part 3 — `geography_context` table:** `region_code` PK, privacy laws, business culture, currency context, talent market, government initiatives, tech maturity, country_codes array. RLS: authenticated read/manage. Seed 8 regions mapped to country codes.

---

## Step 2: Prompt Intelligence Injection
**Files:** `supabase/functions/review-challenge-sections/promptTemplate.ts` + `index.ts`

- Add `resolveIndustryCode()`, `COUNTRY_TO_REGION` map, `countryToRegion()`, `buildIndustryIntelligence()`, `buildGeographyContext()` to promptTemplate.ts
- In index.ts: fix orgContext fetch to also select `code` from `industry_segments` and `code` from `countries`, then fetch `industry_knowledge_packs` + `geography_context` and attach to `clientContext`
- Wire into `buildStructuredBatchPrompt` (after domain frameworks) and `buildPass2SystemPrompt` (after REWRITE RULES)
- Redeploy edge function

---

## Step 3: Discovery Directives Enhancement
**File:** `supabase/functions/discover-context-resources/index.ts`

- After loading directives, fetch industry pack's `preferred_analyst_sources` and merge into directive `preferred_sources`
- Append regulatory terms to discovery context for regulatory-heavy sections
- Non-blocking try/catch wrapper

---

## Step 4: Admin UI — Industry Pack Editor (3 components)
- `src/pages/admin/industry-packs/IndustryPacksPage.tsx` — table of all packs
- `src/components/admin/industry-packs/IndustryPackEditor.tsx` — form with TagInputs, Textareas, per-region regulatory editors
- `src/components/admin/industry-packs/SectionHintEditor.tsx` — collapsible accordion for 8 section hint keys
- Route: `/admin/industry-packs` with supervisor permission guard
- Sidebar link after "AI Quality"

---

## Step 5: Admin UI — Geography Context Editor (2 components)
- `src/pages/admin/geography-context/GeographyContextPage.tsx` — table of 8 regions
- `src/components/admin/geography-context/GeographyContextEditor.tsx` — Sheet form
- Route: `/admin/geography-context` with supervisor permission guard
- Sidebar link after "Industry Packs"

---

## Key Spec Alignment Fixes
- orgContext currently fetches only `name` from `industry_segments` — must add `code`
- orgContext fetches country `name` only — must also fetch `code` and store as `hqCountryCode`
- Line numbers in spec don't match current codebase — using actual locations found during exploration

