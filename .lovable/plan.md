

# Fix: Invalid maturity_level + Ensure Full Creator Data Flows to Curator

## Issue 1: `Invalid maturity_level: blueprint`

**Root cause:** The Creator form's Zod schema defines maturity_level as `z.enum(['blueprint', 'poc', 'pilot'])` (lowercase). The value is passed as-is to `useSubmitSolutionRequest`, which writes it directly to the `challenges` table. A DB trigger rejects any value not in `('BLUEPRINT','POC','PROTOTYPE','PILOT')`.

**Fix:** In `useSubmitSolutionRequest.ts`, normalize `maturityLevel` to UPPERCASE before writing to DB. Apply the same to `ipModel` using the existing `normalizeChallengeFields` utility, or simply `.toUpperCase()` inline since the form already constrains valid values.

### Changes in `useSubmitSolutionRequest.ts`:
- Line 112: `maturity_level: payload.maturityLevel?.toUpperCase() || null`
- Line 113: `ip_model: payload.ipModel || null` (already uppercase from form)
- Line 151 (snapshot): `maturity_level: payload.maturityLevel?.toUpperCase() || null`
- Same fix in `useSaveDraft` and `useUpdateDraft` functions

## Issue 2: Creator data not fully flowing to Curator sections

**Root cause:** Several Creator form fields are captured but not properly written to the correct DB columns that the Curator workspace reads from. Specifically:

1. **`title`** — Already written via `initialize_challenge` RPC, OK.
2. **`expected_outcomes`** — Written as `JSON.stringify({ items: [{ name: value }] })` — OK.
3. **`scope`** — Written correctly.
4. **`problem_statement`** — Written correctly.
5. **`extended_brief` fields** (context_background, root_causes, etc.) — Written correctly to the `extended_brief` JSONB column.
6. **`maturity_level`** — Fails due to case mismatch (Issue 1).
7. **`ip_model`** — Written correctly (form provides uppercase codes like `IP-NEL`).
8. **`industry_segment_id`** — **NOT written** in the update call. The Creator form captures it but `useSubmitSolutionRequest` never writes it to the challenges table.
9. **`domain_tags`** — Written inside `eligibility` JSON but **NOT** to the `domain_tags` column directly.

### Additional changes needed:
- Add `industry_segment_id` to the challenge update in `useSubmitSolutionRequest`
- Add `domain_tags` to the challenge update (the column exists on challenges table)
- Also add `title` to the update call (currently only set via RPC which may truncate)
- Include `industry_segment_id` and `title` in the `creator_snapshot`

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Uppercase maturity_level, add missing fields (industry_segment_id, domain_tags, title) to update + snapshot |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Same fixes in `useSaveDraft` and `useUpdateDraft` |

## Technical Notes
- No migration needed — columns already exist
- The `challengeFieldNormalizer` utility exists but is overkill here since the form already constrains values; a simple `.toUpperCase()` is sufficient and matches what the normalizer does internally
- The `getMaturityLabel` in `CreatorChallengeDetailView` already handles both lowercase and uppercase display, so no UI changes needed

