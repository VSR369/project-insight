

# Phase 11 Gap Analysis: Spec vs Implementation

## Status: Mostly Complete — 3 Critical Gaps, 2 Minor Gaps

---

## CRITICAL GAPS (Must Fix)

### Gap 1: Routes NOT added to App.tsx
The spec requires routes `/admin/industry-packs` and `/admin/geography-context` in the admin router. Neither route exists in `App.tsx`. The pages were created but are unreachable.

**Fix:** Add lazy imports and route entries in `App.tsx` with `TierGuard` (supervisor).

### Gap 2: Sidebar links NOT added to AdminSidebar.tsx
The spec requires "Industry Packs" and "Geography" links in the admin sidebar (after AI Quality). Neither link exists in `AdminSidebar.tsx`.

**Fix:** Add entries to the appropriate group in `AdminSidebar.tsx`.

### Gap 3: Edge functions NOT redeployed
The `review-challenge-sections` and `discover-context-resources` functions have code changes but need deployment to take effect.

---

## MINOR GAPS

### Gap 4: Extra `technology` pack seeded (not in spec)
The spec explicitly states (lines 255-258): orgs with `industry_code='technology'` should get NO pack. The migration seeded a generic "Technology" pack that contradicts this. Should be removed or marked `is_active = false`.

### Gap 5: Spec says 11 packs seeded, implementation has 13
The spec Part 2 header says "seed 11 packs" but the actual SQL in the spec seeds 12 (the 8 original codes + manufacturing_auto_components + technology_india_it + fmcg_consumer + electronics_hightech + travel_hospitality = 13 minus technology = 12). The implementation seeded 13 including the extra `technology` pack. After fixing Gap 4, count will be 12 which matches the spec's actual SQL content.

---

## FULLY IMPLEMENTED (No Gaps)

| Requirement | Status |
|---|---|
| `industry_knowledge_packs` table created with correct schema | Done |
| `geography_context` table created with correct schema | Done |
| RLS policies on both tables | Done |
| 3 new industry segments added | Done |
| 2 existing segments codes updated | Done |
| 8 geography regions seeded with correct country codes | Done |
| `resolveIndustryCode()` in promptTemplate.ts | Done |
| `COUNTRY_TO_REGION` map + `countryToRegion()` | Done |
| `buildIndustryIntelligence()` with section hints + {{geography}} templating | Done |
| `buildGeographyContext()` | Done |
| Wired into `buildStructuredBatchPrompt` | Done |
| Wired into `buildPass2SystemPrompt` | Done |
| orgContext fetches `code` from industry_segments | Done |
| orgContext fetches country `code` as `hqCountryCode` | Done |
| Industry/geography fetch in index.ts with try/catch | Done |
| `_industryPack`, `_geoContext`, `_regionCode` attached to clientContext | Done |
| Discovery: preferred_analyst_sources merged into directives | Done |
| Discovery: regulatory terms appended for regulatory-heavy sections | Done |
| `IndustryPacksPage.tsx` with table listing | Done |
| `IndustryPackEditor.tsx` with TagInputs, per-region regulatory editors | Done |
| `SectionHintEditor.tsx` with 8 section keys, all fields | Done |
| `GeographyContextPage.tsx` with table listing | Done |
| `GeographyContextEditor.tsx` with Sheet form | Done |
| Components under 200-300 line limits | Done |

---

## Implementation Plan

### Step 1: Add routes and sidebar links
- `App.tsx`: Add lazy imports for `IndustryPacksPage` and `GeographyContextPage`, add routes under admin with supervisor TierGuard
- `AdminSidebar.tsx`: Add "Industry Packs" (Factory icon) and "Geography Context" (Globe2 icon) links after AI Quality section

### Step 2: Fix extra technology pack
- Set `is_active = false` on the `technology` pack via migration or direct update, per spec instruction that generic technology orgs should get no pack

### Step 3: Deploy edge functions
- Deploy `review-challenge-sections` and `discover-context-resources`

### Technical Details
- Routes follow existing admin pattern: `<Route path="industry-packs" element={<TierGuard allowed={['supervisor']}><IndustryPacksPage /></TierGuard>} />`
- Sidebar items use existing `{ title, icon, path }` pattern
- Migration for technology pack: `UPDATE industry_knowledge_packs SET is_active = false WHERE industry_code = 'technology'`

