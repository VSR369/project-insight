

# Plan: Fix Per-Section Re-Review Format Parsing Gap

## Problem Found During Audit
The `useAiSectionReview.reviewSingle()` hook (used by the per-section "Re-review" button in AIReviewInline) has two minor gaps compared to the wave executor path:

1. **Missing `wave_action`**: Doesn't send `wave_action: 'review'` in the request body, so the edge function falls through to a generic prompt instead of the action-aware review prompt.
2. **Missing format parsing**: Stores `reviewResult.suggestion` directly without calling `parseSuggestionForSection()`, so structured suggestions (line_items, tables) remain as raw strings in the store.

These don't cause errors because the auto-refine path in AIReviewInline handles conversion downstream, but fixing them ensures consistency with the wave executor path.

## Changes (1 file, ~10 lines)

### File: `src/hooks/useAiSectionReview.ts`

1. Add `import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion'`
2. In the `supabase.functions.invoke` call body (line 60-66), add `wave_action: 'review'`
3. Before calling `setAiReview`, parse the suggestion:
   ```
   const rawSuggestion = reviewResult.suggestion ?? null;
   const parsedSuggestion = rawSuggestion && typeof rawSuggestion === 'string'
     ? parseSuggestionForSection(sectionKey, rawSuggestion)
     : rawSuggestion;
   ```
4. Pass `parsedSuggestion` to `setAiReview` instead of `reviewResult.suggestion`

## Risk
- Extremely low — additive change with no behavior difference for rich_text sections (majority)
- Aligns per-section re-review with the wave executor's existing working pattern

