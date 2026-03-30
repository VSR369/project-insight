

# Fix 10 Regression Bugs in AI Review Pipeline

## Summary

Fix 2 critical, 4 high, and 4 medium bugs across two edge functions and one prompt template file. All bugs are confirmed present in the current code.

## Files Modified

| File | Bugs Fixed |
|------|-----------|
| `supabase/functions/review-challenge-sections/index.ts` | 1, 2, 3, 5, 7, 10 |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | 6 |
| `supabase/functions/extract-attachment-text/index.ts` | 4, 8, 9 |

## Changes

### Bug 1 (CRITICAL): Pass orgContext to Pass 2

Add `orgContext` parameter to `callAIPass2Rewrite` (line 574) and `callAIBatchTwoPass` (line 857). Prepend `buildContextIntelligence(challengeData, clientContext, orgContext)` to the Pass 2 system prompt (after line 747). Thread `orgContext` from main handler (line 1745) through `callAIBatchTwoPass` to `callAIPass2Rewrite`.

### Bug 2 (CRITICAL): Pass attachmentsBySection to Pass 2

Add `attachmentsBySection` parameter to both `callAIPass2Rewrite` and `callAIBatchTwoPass`. Thread from main handler. Default to `{}` at usage site (line 689): `(attachmentsBySection || {})[r.section_key]`.

### Bug 3 (HIGH): file_name null fallback

Line 1505: change `att.file_name` to `(att.file_name || 'Unnamed file')`.

### Bug 4 (HIGH): PDF extraction quality check

In `extract-attachment-text`, after decoding PDF buffer, compute `printableRatio`. If < 0.2 or text < 50 chars, set a descriptive fallback message and method `pdf_binary_fallback`.

### Bug 5 (HIGH): Fetch all org fields

Expand the SELECT at line 1360 to include `twitter_url, tagline, social_links, functional_areas`. Map them to `orgContext`. Expand the `orgContext` type declaration at line 1276.

### Bug 6 (HIGH): Use new org fields in prompt

In `buildContextIntelligence` (promptTemplate.ts), add `tagline`, `twitterUrl`, `functionalAreas` to the org profile template output.

### Bug 7 (MEDIUM): Move contextIntel before batch loop

Move `const contextIntel = buildContextIntelligence(...)` from inside `for (const batch of batches)` (line 1694) to before the loop (before line 1559).

### Bug 8 (MEDIUM): URL extraction sparse check

In `extract-attachment-text`, after URL extraction succeeds, check if `extractedText.trim().length < 100`. If so, wrap in a descriptive message noting sparse/inaccessible content.

### Bug 9 (MEDIUM): DOCX/XLSX binary fallback

In `extract-attachment-text`, separate CSV from XLSX handling (CSV is plaintext, XLSX is ZIP). Apply `printableRatio` check for XLSX and DOCX. Same pattern as Bug 4.

### Bug 10 (MEDIUM): Org context in complexity

Add `orgContext` parameter to `executeComplexityAssessment` and `callComplexityAI`. Inject org name/country/industry into the complexity system prompt. Pass from main handler at line 1541.

## Implementation Order

1. Bugs 1 + 2 together (same parameter threading)
2. Bugs 5 + 6 together (org fields fetch + prompt usage)
3. Bug 7 (contextIntel hoisting)
4. Bug 10 (complexity org context)
5. Bug 3 (one-line fix)
6. Bugs 4 + 8 + 9 together (extract-attachment-text)
7. Deploy both edge functions

