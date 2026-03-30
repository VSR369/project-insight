

# Section-by-Section Bug Fix Plan: Challenge Curator AI Pipeline

## Bug Analysis by Section

### 1. Maturity Level — CRITICAL
**Screenshot confirms:** AI returns `{"selected_id":"PILOT","rationale":"..."}` but `parseMasterDataCodes()` (AIReviewInline.tsx line 196) cannot handle JSON objects — it only handles arrays, single bare codes, and comma-separated values. The object falls through all checks, returns `null`, and the suggestion gets routed to the `structuredItems` path (line_items parser), which splits JSON fragments into broken display items.

**Fix (AIReviewInline.tsx `parseMasterDataCodes`):** Add JSON object handling for `checkbox_single` format:
```typescript
// After JSON array check (line 201), add:
if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
  // checkbox_single returns {"selected_id":"PILOT","rationale":"..."}
  const code = parsed.selected_id ?? parsed.id ?? parsed.code ?? parsed.value;
  if (code && typeof code === 'string') return [code];
}
```

### 2. Success Metrics KPI — CRITICAL (No AI suggested content generated)
**Root cause:** Pass 2 (`callAIPass2Rewrite`) filters sections needing suggestions at line 419-424. If Pass 1 returns only `strength` or `best_practice` comments (no `error`/`warning`/`suggestion`), the section is excluded from Pass 2 entirely — no suggestion generated. Also, for table sections the `cleanAIOutput` at line 664 may strip `\n` inside JSON strings, corrupting the JSON.

**Fix (index.ts line 419-424):** Also include sections where `waveAction === 'generate'` OR where `status !== 'pass'` (already done) OR where `status === 'warning'` but the section has no current content (empty section that needs generation).

**Fix (index.ts line 664):** Skip `cleanAIOutput` for table-format suggestions — they already go through `sanitizeTableSuggestion`:
```typescript
const fmt = getSectionFormatType(r.section_key);
const cleanedSuggestion = (fmt === 'table' || fmt === 'schedule_table')
  ? suggestion  // already sanitized
  : cleanAIOutput(suggestion);
```

### 3. Affected Stakeholders — CRITICAL (Same as Success Metrics)
Same Pass 2 filtering issue. Additionally, the `affected_stakeholders` section is an extended_brief subsection — `callAIPass2Rewrite` reads `challengeData[r.section_key]` (line 432) but the actual data is inside `challengeData.extended_brief.affected_stakeholders`, not at the top level.

**Fix (index.ts `callAIPass2Rewrite` line 430-435):** For extended brief subsections, look up content from `challengeData.extended_brief[fieldName]`:
```typescript
const EXTENDED_BRIEF_KEYS = new Set(['context_and_background','root_causes','affected_stakeholders','current_deficiencies','preferred_approach','approaches_not_of_interest']);
const EB_FIELD_MAP = { affected_stakeholders: 'affected_stakeholders', root_causes: 'root_causes', ... };

let originalContent = challengeData[r.section_key];
if (!originalContent && EXTENDED_BRIEF_KEYS.has(r.section_key) && challengeData.extended_brief) {
  const ebField = EB_FIELD_MAP[r.section_key] || r.section_key;
  const eb = typeof challengeData.extended_brief === 'string'
    ? JSON.parse(challengeData.extended_brief)
    : challengeData.extended_brief;
  originalContent = eb?.[ebField];
}
```

### 4. Data & Resources Provided — HIGH (Partial content, missing columns)
Same extended_brief content lookup issue. Also, the `data_resources_provided` is at challenge top-level, but if the AI returns a structure missing `resource`, `type`, `format` keys (using aliases), the table renderer shows empty cells.

**Fix:** Already handled by the normalizer at CurationReviewPage.tsx line 2067-2080. The issue is that the AI may not receive the current content during Pass 2 (same root cause as #3 — wrong content lookup). Fix #3 resolves this.

### 5. Complexity Assessment — HIGH (Score mismatch + manual change bug)
**Bug A:** AI returns complexity with `suggested_complexity` ratings (e.g., average 4.3/5 on 1-5 scale) but the section displays a different value (7.6) because the complexity scoring function maps 1-5 AI ratings to the L1-L5 weighted score on a 1-10 scale. The AI's `4.3/5` on a 5-point scale translates to a different weighted score depending on dimension weights.

**Bug B:** When manual params are changed in the "Manual Params" tab, the AI Review tab also changes because both share the same `complexityParams` state. The AI-suggested ratings (`aiSuggestedComplexity`) should be displayed independently and not re-computed from the manual params.

**Fix (CurationReviewPage.tsx):** The `complexityRatings` passed to `AIReviewResultPanel` must come from `aiSuggestedComplexity` state (the AI's raw ratings), NOT from the computed score. Verify that the `ComplexityAssessmentModule` keeps AI ratings and manual ratings separate. Also ensure the `ComplexityParameterTable` in `AIReviewResultPanel` displays the AI's raw ratings without mixing in manual values.

### 6. Submission Guidelines — HIGH (Distorted after accept)
After accepting AI-generated submission guidelines, the content is saved but rendered poorly. The issue is in the Accept handler: `submission_guidelines` maps to `dbField = 'description'` which is in `JSON_FIELDS`. The AI suggestion gets parsed as JSON (e.g., `{items: ["guideline 1", ..."]}`), saved correctly, but the renderer may not correctly unwrap the `{items: [...]}` wrapper.

**Fix:** Verify that `getSubmissionGuidelineObjects()` (line 903) correctly handles both `{items: [...]}` and flat array formats. Also ensure the render path for submission_guidelines uses the `DeliverableCardRenderer` consistently.

### 7. Evaluation Criteria — MEDIUM (Verify format)
The normalizer (line 2034-2051) now handles aliases. Verify the render path in `EvalCriteriaEditor` handles the canonical schema. The column alignment fix (Fix 15 from previous plan) was applied.

### 8. Reward Structure — HIGH (Junk/distorted display)
**Root cause:** The AI returns reward structure through the `checkbox_single` format instruction (`FORMAT_INSTRUCTIONS['custom']` = "Output: structured JSON appropriate to the section context") which is too vague. The `rewardData` parser in `AIReviewResultPanel` (line 592-601) only recognizes objects with `type`, `monetary`, or `nonMonetary` keys. If the AI returns a flat array of prize tiers or a table format, it falls through and gets rendered as raw text.

**Fix (promptTemplate.ts):** Add explicit reward_structure format instruction:
```typescript
reward_structure: 'Output: JSON object with keys: type ("monetary"|"non_monetary"|"both"), monetary: {tiers: {platinum: number, gold: number, silver: number}, currency: "USD", justification: string}, nonMonetary: {items: ["item1","item2"]}. Do NOT output a table or flat array.',
```

Also update `SECTION_FORMAT_MAP` to map `reward_structure` to `'custom'` (not `'table'`) so it doesn't get the table format instruction.

### 9. Global Review — Some sections get no AI suggested content
**Root cause:** Multiple:
1. Pass 2 filtering excludes sections with only `strength`/`best_practice` comments
2. Extended brief subsection content not found (fix #3)
3. Pass 2 tool call may truncate if too many sections in one batch
4. `cleanAIOutput` corrupts table JSON

**Fix:** All addressed by fixes #2, #3 above. Additionally, increase `MAX_BATCH_SIZE` awareness — if a batch has 12 sections, the LLM may truncate suggestions for later sections.

---

## Implementation Plan — 8 Fixes in 4 Files

### File 1: `src/components/cogniblend/shared/AIReviewInline.tsx`
1. **Fix `parseMasterDataCodes`** (line 196-220): Handle JSON objects from `checkbox_single` format — extract `selected_id` or `id` or `code` key
2. **Fix `parseMasterDataCodes`**: Also handle the case where the AI wraps the code in an object with `rationale` — the rationale should be displayed but only the code used for accept

### File 2: `supabase/functions/review-challenge-sections/index.ts`
3. **Fix Pass 2 content lookup** (line 430-435): For extended brief subsections (`affected_stakeholders`, `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`, `context_and_background`), look up content from `challengeData.extended_brief[fieldName]` instead of `challengeData[section_key]`
4. **Fix `cleanAIOutput` for table suggestions** (line 664): Skip `cleanAIOutput` for table/schedule_table format sections since they already go through `sanitizeTableSuggestion`
5. **Fix Pass 2 filtering** (line 419-424): Include sections that have empty content AND `waveAction === 'generate'` even if comments are only informational

### File 3: `supabase/functions/review-challenge-sections/promptTemplate.ts`
6. **Add reward_structure format instruction**: Add explicit `reward_structure` entry to `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS` or create a `SECTION_SPECIFIC_FORMAT_INSTRUCTIONS` map with the exact JSON schema for reward structure output
7. **Fix `SECTION_FORMAT_MAP`**: Change `reward_structure` from `'table'` to `'custom'` so it gets the custom format instruction instead of table format

### File 4: `src/pages/cogniblend/CurationReviewPage.tsx`
8. **Verify complexity isolation**: Ensure `aiSuggestedComplexity` state is used for AI review display and is NOT re-derived from manual `complexityParams` changes. The `handleComplexityReReview` already stores AI ratings separately — verify the `complexityRatings` prop passed to `AIReviewInline` comes from `aiSuggestedComplexity`, not from the computed score

---

## Post-Implementation: Edge Function Redeployment Required
After changes to `index.ts` and `promptTemplate.ts`, the `review-challenge-sections` edge function must be redeployed.

## Section-by-Section Verification Matrix

| Section | AI Review | Re-review | Format | Accept | Status |
|---|---|---|---|---|---|
| Success Metrics KPI | Fix 4,5 | Fix 5 | Table JSON | Already normalized | Should work after fix |
| Affected Stakeholders | Fix 3,4 | Fix 3 | Table JSON | Already normalized | Should work after fix |
| Data & Resources | Fix 3 | Fix 3 | Table JSON | Already normalized | Should work after fix |
| Maturity Level | Fix 1 | Fix 1 | `selected_id` extraction | Already handled | Broken → Fixed |
| Complexity Assessment | Fix 8 | Fix 8 | AI ratings separate | Already handled | Verify isolation |
| Submission Guidelines | Verify | Verify | line_items | Already handled | Verify render |
| Evaluation Criteria | Verify | Verify | Table JSON | Normalized | Already fixed |
| Reward Structure | Fix 6,7 | Fix 6,7 | Custom JSON schema | Already normalized | Broken → Fixed |
| Global Review (all) | Fix 3,4,5 | Fix 3 | Mixed | Mixed | Partial failures → Fixed |

