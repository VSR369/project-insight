

# Audit: What Is Implemented vs What Is Missing

## Implemented (working)

| Feature | Status | Details |
|---------|--------|---------|
| `SECTION_FORMAT_CONFIG` with all 16+ sections | Done | Correct format types, `masterDataTable` refs, `aiCanDraft`, `aiUsesContext` |
| `useCurationMasterData` hook — fetches from DB | Partial | Complexity + solver eligibility tiers fetched from DB. **But**: maturity, IP model, effort, challenge visibility are still hardcoded static arrays, not from DB |
| `CheckboxMultiSectionRenderer` component | Done | View + edit modes, save/cancel |
| Eligibility/Visibility wired as `checkbox_multi` | Done | Reads from `solver_eligibility_types`/`solver_visibility_types`, renders via `CheckboxMultiSectionRenderer` with master data options |
| `handleAcceptRefinement` — master-data-aware save | Done | Eligibility/visibility save to `solver_*_types` as `{code, label}[]`. Single-code sections (ip_model, maturity, complexity, etc.) validate against options |
| `AIReviewInline` — `parseMasterDataCodes()` | Done | Parses AI output as code arrays for master-data sections |
| `AIReviewResultPanel` — master-data chip rendering | Done | Shows selectable chips with code/label/description for master-data suggestions |
| Edge function `refine-challenge-section` — code constraints | Done | Injects allowed codes into prompt for both multi-code and single-code sections. Fetches `md_solver_eligibility` and `md_challenge_complexity` from DB |

## NOT Implemented / Broken

| Issue | Impact | Fix needed |
|-------|--------|------------|
| **`masterDataOptions` prop NOT passed** to `CurationAIReviewInline` | AI accept validation skipped — no valid-code checking on accept | Line 2104: must resolve options per section and pass `masterDataOptions={...}` |
| **`review-challenge-sections/promptTemplate.ts` STALE** | Review prompts still have `visibility_eligibility` (merged), `ip_model` as `rich_text`, `complexity` as `custom`, `reward_structure` as `structured_fields`, `submission_guidelines` as `rich_text` | Must align `SECTION_FORMAT_MAP` to match `SECTION_FORMAT_CONFIG` |
| **Maturity options use lowercase keys** (`blueprint`, `poc`) but normalizer expects uppercase (`BLUEPRINT`, `POC`) | AI might return lowercase, save might fail | Inconsistency between `maturityLabels.ts` (lowercase) and `challengeFieldNormalizer.ts` (uppercase). The hook uses lowercase values from constants |
| **IP model static options use aliases** (`full_transfer`, `licensed`, etc.) not DB codes (`IP-EA`, `IP-NEL`) | AI suggestions won't match normalizer codes; save may fail or save wrong value | Must align static IP options with actual DB trigger codes, or pull from DB |
| **No `expected_outcomes` section** in CurationReviewPage sections array | Section defined in format config but not rendered | Need to add section definition with render/edit |

## Recommended Fix (single implementation pass)

1. **Pass `masterDataOptions`** to `CurationAIReviewInline` — resolve per-section from `masterData` hook based on section key
2. **Align `SECTION_FORMAT_MAP`** in `promptTemplate.ts` — update:
   - `submission_guidelines` → `line_items`
   - `ip_model` → `checkbox_single`
   - `complexity` → `checkbox_single`
   - `reward_structure` → `table`
   - Remove `visibility_eligibility`, add `eligibility` and `visibility` as `checkbox_multi`
   - Add `expected_outcomes` as `line_items`
3. **Align IP model codes** in `useCurationMasterData` static options to match DB trigger codes (`IP-EA`, etc.) or keep aliases but ensure normalizer handles both (it already does via `IP_ALIAS_MAP`)
4. **Align maturity codes** — the hook should use uppercase values (`BLUEPRINT`, `POC`, `PROTOTYPE`, `PILOT`) to match normalizer expectations
5. **Add `expected_outcomes`** section to the CurationReviewPage sections array

### Files to modify
- `src/pages/cogniblend/CurationReviewPage.tsx` — pass `masterDataOptions`, add `expected_outcomes` section
- `supabase/functions/review-challenge-sections/promptTemplate.ts` — align `SECTION_FORMAT_MAP`
- `src/hooks/cogniblend/useCurationMasterData.ts` — align maturity values to uppercase

