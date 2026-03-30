

# Two-Pass AI Review Architecture: Analyze Then Rewrite

## Problem
The LLM generates good review comments but suggestions often mirror original content unchanged. Single-pass review+rewrite creates a cognitive budget problem — the model exhausts attention on analysis and produces shallow suggestions.

## Solution
Split `callAIBatch` into two sequential LLM calls within the same edge function invocation. Users still click one button; internally the edge function makes two calls:

- **Pass 1 (Analyze)**: Generate comments, status, guidelines, cross-section issues. No suggestion field.
- **Pass 2 (Rewrite)**: Receive Pass 1 comments as input. Generate ONLY improved content. Skipped entirely when all sections pass with only strength/best_practice comments.

## Files Changed

### 1. `supabase/functions/review-challenge-sections/index.ts`

**Refactor `callAIBatch` into two-pass architecture:**

- **New `callAIPass1Analyze`** (~lines 201-374): Clone current `callAIBatch` but remove `suggestion` from the tool schema entirely. The LLM focuses 100% on analysis. Keep comments, status, guidelines, cross_section_issues.

- **New `callAIPass2Rewrite`**: New function that:
  - Receives Pass 1 results + original section content + challenge context
  - Filters to only sections needing suggestions (has actionable comments OR status=generated OR wave_action=generate)
  - Uses a focused rewrite system prompt: "You receive ORIGINAL CONTENT and REVIEW COMMENTS. Produce revised content addressing EVERY error/warning/suggestion comment."
  - Tool schema has only `section_key` and `suggestion` (both required)
  - Returns suggestion map

- **New `callAIBatchTwoPass`**: Orchestrator that calls Pass 1, filters, conditionally calls Pass 2, merges results. Replaces `callAIBatch` at the call site (~line 860).

- **Pass 2 skip logic**: If no sections have actionable comments (all pass with only strength/best_practice), skip Pass 2 entirely — zero extra latency/cost.

- **Token logging**: Log both passes separately (`pass1_analyze`, `pass2_rewrite`) for cost tracking.

### 2. `supabase/functions/review-challenge-sections/promptTemplate.ts`

- Remove suggestion-related instructions from the OUTPUT FORMAT section (~lines 209-214) — Pass 1 no longer generates suggestions. Keep the format instructions available for Pass 2 via a new exported helper `getSuggestionFormatInstruction(sectionKey)` that Pass 2 can call.

### 3. `src/components/cogniblend/shared/AIReviewInline.tsx`

- No changes needed — the frontend already handles the response shape (comments + suggestion). The two-pass architecture is transparent to the frontend since the edge function returns the same merged response format.

## Latency & Cost Impact

| Scenario | Before | After |
|---|---|---|
| All sections pass (clean) | ~3s, 1 call | ~3s, 1 call (Pass 2 skipped) |
| 3 warning sections in batch of 12 | ~3s, 1 call | ~5s, 2 calls (Pass 2 for 3 sections only) |
| All empty (generate all) | ~3s, 1 call | ~7s, 2 calls |

Token cost increases ~30-50% for sections needing suggestions but suggestion quality improves dramatically since the model's entire Pass 2 attention is on rewriting with explicit comment inputs.

## Technical Details

**Pass 2 System Prompt** (new, hardcoded in edge function):
- Senior consultant rewrite persona
- Explicit rules: address EVERY actionable comment, maintain original format, production-ready output
- Anti-hallucination: don't add unsupported content, don't remove unflagged content

**Pass 2 User Prompt Construction** (per section needing suggestion):
- Original content (or "(EMPTY — generate from scratch)" for generate action)
- Numbered actionable comments from Pass 1
- Best practices from Pass 1
- Guidelines from Pass 1
- Challenge context (same as Pass 1)
- Format instruction for the section type

**Pass 2 Tool Schema**:
```
suggest_content → { sections: [{ section_key, suggestion }] }
```
Both fields required — the LLM cannot skip the suggestion.

## What Stays the Same
- Complexity assessment (separate `callComplexityAI`) — unchanged
- Prompt template loading from DB configs — unchanged
- Frontend accept/reject/re-review flow — unchanged
- Response shape to frontend — unchanged
- Wave execution engine — unchanged

