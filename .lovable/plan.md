

## Critical Forensic Analysis v2 — 16 Errors, 3 Root Causes, Aligned with Lovable.dev Architecture

### Updated error inventory

**RC-1: Export renderer treats JSONB as rich text (5 sections)**

| Section | Format | Symptom | Fix location |
|---|---|---|---|
| `affected_stakeholders` | `line_items` (JSONB array of objects) | `[object Object],[object Object]…` | `buildExportHtml.ts` — add `renderLineItemsCards()` |
| `data_resources_provided` | `structured_fields` (JSONB object) | Raw `{"size":"4.2 GB",…}` | `buildExportHtml.ts` — add `renderStructuredFieldsList()` |
| `success_metrics_kpis` | `line_items` | Raw JSON dump | `buildExportHtml.ts` — reuse `renderLineItemsCards()` |
| `eligibility` | `checkbox_multi` (string array) | `["certified_expert",…]` | `buildExportHtml.ts` — add `renderCheckboxBadges()` |
| `reward_structure` | nested object with `tiers[]` | `gold 0 type monetary tiers [{…}]` | `buildExportHtml.ts` — add `renderRewardTiersTable()` |

**RC-2: Accept-All field-mapping & creator-fill gaps (9 sections)**

| Section | Symptom | Cause |
|---|---|---|
| `problem_statement`, `scope` | Empty in export | Rich-text written to wrong DB target (direct column vs `extended_brief`) by `bulkAcceptHelpers.ts` |
| `context_background` | "Not provided." | Same field-routing bug |
| `solver_expertise`, `complexity_assessment` | "Not provided." / "Not defined yet." | Same |
| `maturity_level`, `ip_model`, `visibility` | Raw enum (`A working demo`, `Joint Ownership`, `public`) | Export renders raw enum without resolving against `md_solution_maturity` / `md_ip_models` / visibility label map |
| `creator_legal_instructions` | Empty | `aiCanDraft:false` + `curatorCanEdit:false` + creator never filled — needs validation gate, not export fix |

**RC-3: Structural/labeling (2 issues)**

| Issue | Cause | Fix |
|---|---|---|
| `Problem Statementby CA` | Title concatenation missing space/separator before attribution | `buildExportHtml.ts` heading builder — emit `${title} <span class="attribution">by CA</span>` |
| Evaluation Criteria flat text | Renderer flattens array of `{criterion, weight, …}` to `"# Criterion Weight 1 …"` | Add `renderEvaluationCriteriaTable()` matching the existing table CSS class |

### Lovable.dev architecture alignment

| Rule | Application |
|---|---|
| **R1** (≤250 lines) | `buildExportHtml.ts` already ~280 lines — extract format renderers to `src/lib/cogniblend/preview/sectionRenderers/` (one file per format type, ~40 lines each) |
| **R2** (layer separation) | All renderers stay pure — no DB calls. Field-mapping fix lives in `bulkAcceptHelpers.ts` (service layer), not in components |
| **R3** (zero `any`) | Add typed renderer interfaces in `src/lib/cogniblend/preview/sectionRenderers/types.ts`: `SectionRenderer = (value: unknown, ctx: RenderContext) => string` |
| **R6** (4 states) | Each renderer must handle: `null/undefined` → `"Not provided."`, empty array → same, malformed JSON → render raw with warning class, valid → formatted output |
| **R9** (logging) | Use `logWarning('export.renderer.fallback', {section, reason})` when a renderer falls back; never `console.*` |
| Multi-tenant | Master data lookups (`md_solution_maturity`, `md_ip_models`) must respect `tenant_id` — pass resolver from caller, no direct Supabase in renderers |

### File plan — 6 changes (~280 lines, all <250/file)

1. **`src/lib/cogniblend/preview/sectionRenderers/types.ts`** (~25)
   `SectionRenderer`, `RenderContext` (carries master-data label maps), `RendererResult`

2. **`src/lib/cogniblend/preview/sectionRenderers/lineItems.ts`** (~50)
   `renderLineItemsCards()` — handles `affected_stakeholders`, `success_metrics_kpis`. Detects array-of-objects vs array-of-strings via `detectAndParseLineItems` (existing util).

3. **`src/lib/cogniblend/preview/sectionRenderers/structuredFields.ts`** (~40)
   `renderStructuredFieldsList()` — `<dl>` definition list for `data_resources_provided`.

4. **`src/lib/cogniblend/preview/sectionRenderers/checkboxAndEnum.ts`** (~60)
   `renderCheckboxBadges()` (eligibility), `renderEnumLabel()` (maturity, IP model, visibility) using injected label maps.

5. **`src/lib/cogniblend/preview/sectionRenderers/rewardAndEvaluation.ts`** (~70)
   `renderRewardTiersTable()` (parses `tiers[]`, ignores zero-value tiers), `renderEvaluationCriteriaTable()` (proper `<table>` with header + weight column totals).

6. **`src/lib/cogniblend/preview/buildExportHtml.ts`** (~30 lines changed)
   - Replace 5 `renderRichText` mis-routes with format-aware dispatch using `SECTION_FORMAT_CONFIG[key].format`
   - Fix heading template: `${title}<span class="export-heading-attribution"> by ${attribution}</span>`
   - Inject `RenderContext` containing master-data maps fetched once by `usePreviewData`

7. **`src/lib/cogniblend/bulkAcceptHelpers.ts`** (~15 lines changed)
   - Fix Problem Statement / Scope routing: when `EXTENDED_BRIEF_FIELD_MAP[key]` is undefined AND `SECTION_FORMAT_CONFIG[key].storage === 'direct'`, write to direct column; never to `extended_brief`
   - Add unit assertions to existing `bulkAcceptHelpers.test.ts` covering the routing matrix

8. **`src/components/cogniblend/preview/usePreviewData.ts`** (~15 lines added)
   - Fetch master-data label maps via existing TanStack Query hooks (`useMaturityLevels`, `useIpModels`) — pass into render context. No new DB calls in components.

### What is NOT changed

- ❌ No DB schema, no RLS, no migrations
- ❌ No edge function changes
- ❌ No AI pipeline changes — RC-1/RC-3 are purely client-side rendering
- ❌ No new dependencies — uses existing `detectAndParseLineItems` and master-data hooks
- ❌ No DOCX library swap (deferred — current `html-docx-js-typescript` works once HTML is valid; MHT fallback was triggered by the invalid `<div>`-in-`<dl>` markup which Fix-6 removes)

### Validation

- Existing tests still pass (`waveConfig`, `bulkAcceptHelpers`, `formatValidator`)
- New unit tests in `src/lib/cogniblend/preview/sectionRenderers/__tests__/` (~120 lines) — one per renderer, covering null/empty/malformed/valid
- Manual QA: regenerate the uploaded challenge's DOCX, convert page-by-page to images via skill/docx, confirm 16 errors resolved

### Coverage map vs your 16 errors

| Error | Fixed by |
|---|---|
| `[object Object]` × 3 | Renderer #2 |
| Raw JSON × 3 | Renderers #2, #3 |
| Reward Structure dump | Renderer #5 |
| `["certified_expert",…]` | Renderer #4 |
| Problem Statement / Scope empty | Fix #7 (routing) + Fix #6 (dispatcher) |
| Context, Solver Expertise, Complexity placeholders | Fix #7 |
| Maturity / IP / Visibility raw enums | Renderer #4 + Fix #8 |
| Creator Legal Instructions empty | Out of scope — flagged as creator-side validation gap to add later |
| Title `by CA` glued | Fix #6 heading template |
| Evaluation Criteria flat text | Renderer #5 |

All 15 export-side errors fixed in one PR. The 16th (creator-fill gap on legal instructions) requires a separate creator-form validation change, tracked but not bundled here.

