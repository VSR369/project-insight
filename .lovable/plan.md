
I understand the requirement clearly: for master-data-backed sections, AI must only suggest valid master options, and accepting AI output must populate/save the native control format (checkbox/radio/select), never prose.

## What is currently broken (root causes)

1. **Wrong data source for Eligibility/Visibility in curation**
   - Curation page reads/saves `eligibility` and `visibility` (legacy/general fields), but solver-type choices are actually in:
     - `solver_eligibility_types` (e.g., registered, certified, signed_in, open_community)
     - `solver_visibility_types`
   - Current challenge confirms this mismatch: `solver_*` has codes, while `eligibility` is carrying targeting JSON.

2. **Master data hook is mostly static**
   - `useCurationMasterData` uses hardcoded Eligibility/IP/Visibility options instead of pulling real master rows (notably `md_solver_eligibility`).

3. **AI refinement is not format-aware for master-data controls**
   - `AIReviewInline` treats only `deliverables` + `evaluation_criteria` as structured.
   - Checkbox/select/radio sections fall back to text suggestions.

4. **Accept flow does not parse/save master-data selections**
   - `handleAcceptRefinement` parses JSON for table/list fields only.
   - For eligibility/visibility/ip/maturity/complexity, AI output can still be saved as plain string.

5. **Prompt maps are stale/inconsistent**
   - `review-challenge-sections` prompt templates still include old mappings (`visibility_eligibility`, `ip_model` as rich_text, etc.), so AI isn’t consistently constrained to option IDs.

## Implementation plan (phased, no business-rule removal)

### Phase 5A — Correct master-data wiring in Curation UI

1. **Fix data model bindings in `CurationReviewPage`**
   - Extend challenge fetch/type to include:
     - `solver_eligibility_types`
     - `solver_visibility_types`
   - Rebind section storage:
     - `eligibility` section -> `solver_eligibility_types`
     - `visibility` section -> `solver_visibility_types`
   - Keep legacy `eligibility` field untouched for original-brief targeting context.

2. **Upgrade `useCurationMasterData`**
   - Pull `md_solver_eligibility` live (code/label/description/order/is_active).
   - Build shared solver-tier options from DB for both eligibility & visibility section controls.
   - Keep fallback options only if DB query fails.
   - Split “challenge visibility” options (`public`, `registered_users`, etc.) into a separate option list so it does not collide with solver-tier visibility.

3. **Normalize code/label handling**
   - Render selected solver tiers as labels from master map.
   - Save as canonical array objects `{ code, label }` (same shape used elsewhere in app), not plain strings.

### Phase 5B — Make AI refine master-data-aware and native-format

1. **`AIReviewInline` format expansion**
   - Replace hardcoded `STRUCTURED_SECTIONS` with format-aware logic (based on section key + expected format).
   - Add parsers for:
     - `checkbox_multi` -> array of option codes
     - `checkbox_single` / `select` / `radio` -> one option code
   - Keep item-level accept/reject behavior for multi-select suggestions.

2. **`AIReviewResultPanel` native rendering**
   - For checkbox sections, show suggested selected options as selectable checklist chips/cards (not paragraph text).
   - For single-select/radio/select, show one suggested choice with label/description.

3. **Accept/save canonicalization (`CurationReviewPage.handleAcceptRefinement`)**
   - Add section-format-based save transformer:
     - eligibility/visibility -> save to `solver_*_types` as `{ code, label }[]`
     - ip_model/maturity_level -> normalize to valid DB code before save
     - complexity -> accept AI-selected level only if valid code
   - Reject invalid AI output with explicit toast (no silent corruption).

### Phase 5C — Constrain AI to allowed master options

1. **Refinement edge function update (`refine-challenge-section`)**
   - Add strict per-section output contracts for master-data sections:
     - eligibility/visibility: JSON array of allowed codes only
     - ip_model/maturity/complexity/challenge_visibility/effort_level: single allowed code
   - Inject allowed options into prompt context so AI can only pick from populated master-data values.
   - Keep existing endpoint contract; only strengthen prompt + parsing behavior.

2. **Review prompt sync (`review-challenge-sections/promptTemplate.ts` + frontend copy)**
   - Align format map with actual curation section formats (including separate `eligibility` and `visibility`).
   - Remove stale mismatches that cause prose outputs for non-prose sections.

3. **Compatibility for stale config key**
   - Add non-breaking alias handling for `visibility_eligibility` so reviews don’t fail while transitioning to `visibility`.
   - Preserve existing admin-config-driven behavior.

## Files to update

- `src/hooks/cogniblend/useCurationMasterData.ts`
- `src/pages/cogniblend/CurationReviewPage.tsx`
- `src/components/cogniblend/shared/AIReviewInline.tsx`
- `src/components/cogniblend/curation/AIReviewResultPanel.tsx`
- `src/lib/aiReviewPromptTemplate.ts`
- `supabase/functions/refine-challenge-section/index.ts`
- `supabase/functions/review-challenge-sections/promptTemplate.ts`
- `supabase/functions/review-challenge-sections/index.ts`

## Validation checklist (must pass before replication)

1. Eligibility and Visibility sections show **separate** solver-tier master options from DB (`registered`, `signed_in`, `certified_*`, `open_community`, etc.).
2. Existing saved `solver_eligibility_types` and `solver_visibility_types` render correctly as selected chips/checkboxes.
3. “Refine with AI” for eligibility/visibility returns only allowed codes and displays native checkbox selections.
4. Accepting AI suggestions updates control state immediately and persists after reload.
5. IP Model, Maturity, Complexity AI suggestions resolve to valid codes only (no prose saved).
6. No overwrite of legacy `eligibility` targeting JSON used in original-brief context.
7. Full “Review with AI” and per-section re-review work for both `eligibility` and `visibility` without section-key errors.
