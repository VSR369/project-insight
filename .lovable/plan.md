

# Context Parity Fix for Generate Suggestions (Pass 2)

## Problem
Pass 2 (`generate-suggestions`) receives only master data and digest context. It is missing 6 context blocks that Pass 1 (`analyse-challenge`) uses: organization context, industry intelligence, geography context, section dependency map, legal docs summary, and reference content from passing sections. This means the AI generates suggestions without knowing the organization, its industry, geography, regulations, or how sections depend on each other.

## Verification
`buildUnifiedContext` already returns all the data needed — `org`, `industryPack`, `geoContext`, `sectionDependencyMap`, `legalDocs`, `sectionConfigs`. The only change is in **one file**: `generate-suggestions/index.ts`.

## Changes — `supabase/functions/generate-suggestions/index.ts`

### 1. Add `buildOrgBlock` helper (inline)
Build organization context string from `ctx.org` — name, brand, type, HQ, industries, description, website, operating model.

### 2. Build all missing context blocks after `buildUnifiedContext` call
- `orgBlock` from `ctx.org`
- `industryBlock` from `ctx.industryPack` (using existing `jsonBrief`)
- `geoBlock` from `ctx.geoContext`
- `dependencyBlock` from `ctx.sectionDependencyMap`
- `legalBlock` from `ctx.legalDocs`

### 3. Build reference content from passing sections
Loop through `sectionConfigs`, find sections with `pass`/`best_practice` status, extract their content from `ch`/`eb`, and build a read-only reference block so the AI can cross-reference when generating dependent sections.

### 4. Replace the system prompt
Add all context blocks (org, industry, geo, master data, dependencies, digest, reference sections, legal). Add explicit dependency rules for generation ordering (deliverables aligns with problem_statement, evaluation_criteria covers deliverables, etc.).

### 5. Update the user prompt
Wrap with instructions to reference existing content for cross-section coherence.

### 6. Deploy
Redeploy `generate-suggestions`.

## Result
After this fix, Pass 2 receives strictly more context than Pass 1: everything Pass 1 has, plus the full digest corpus, plus Pass 1 review comments, plus dependency generation rules, plus format instructions.

## Total scope
~60 lines added/changed in one file. No other files need modification.

