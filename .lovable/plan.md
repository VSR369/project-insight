

# Fix "Approaches NOT of Interest" — Junk Display and Accept Failure

## Root Cause

Two bugs combine to make this section broken:

### Bug 1: Re-review produces junk text
The `refine-challenge-section` edge function has a hardcoded early return for `approaches_not_of_interest` (line 222-233) that returns:
```json
{"requires_human_input": true, "comment": "This section requires explicit human input..."}
```
This raw JSON string becomes `refinedContent`, and since `parseStructuredItems()` can't parse it as a line_items array, it falls through to the `rich_text` rendering path — displaying the raw JSON with brackets as "junk text."

Similarly, the triage prompt template (line 129) instructs the AI: *"Always set requires_human_input: true. Never produce items for this section."*

**The problem:** This "never AI-draft" policy made sense when the section was empty, but when re-reviewing existing human-entered content, the AI should still review and refine it like any other line_items section.

### Bug 2: Accept does nothing
When the user clicks "Accept Suggestion," `handleAccept` in AIReviewInline tries to parse the junk JSON `{ requires_human_input: true }` as line items. It hits the `structuredItems` path, finds nothing valid, and silently does nothing.

## Fix Plan

### 1. Edge Function: `refine-challenge-section/index.ts`
**Remove the hardcoded early return** for `approaches_not_of_interest`. Instead, let it flow through the normal refinement pipeline. Add a format instruction (like root_causes/current_deficiencies) so the AI returns a proper JSON array:

```typescript
// Remove lines 221-233 (the hardcoded early return)

// Add to EB_FORMAT_INSTRUCTIONS:
approaches_not_of_interest: `\n\nCRITICAL FORMAT REQUIREMENT: Return ONLY a valid JSON array of short phrase strings describing approaches the seeker does NOT want. Preserve the seeker's original intent — do not invent new exclusions. Max 10 items. Example: ["Pure SaaS solutions without on-prem option", "Approaches requiring full system replacement"]`
```

### 2. Triage Prompt: `src/lib/aiReviewPromptTemplate.ts`
Update the `approaches_not_of_interest` instruction to allow proper review:

```typescript
// FROM:
approaches_not_of_interest: 'Always set requires_human_input: true. Never produce items for this section...'

// TO:
approaches_not_of_interest: 'Review existing content for clarity, completeness, and consistency with challenge scope. Output: JSON array of refined exclusion phrases. Preserve the seeker\'s original intent. If section is empty, set status to "warning" with a comment requesting human input.'
```

### 3. AIReviewInline: Fallback rendering guard
In the `parseStructuredItems` function, add a guard to detect and reject `requires_human_input` payloads so they don't display as junk text — return `null` to suppress the suggestion panel:

```typescript
// In parseStructuredItems, after JSON.parse:
if (parsed?.requires_human_input) return null;
```

### 4. Edge function redeployment
After code changes, redeploy the `refine-challenge-section` edge function.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/refine-challenge-section/index.ts` | Remove hardcoded early return for `approaches_not_of_interest`; add proper format instruction |
| `src/lib/aiReviewPromptTemplate.ts` | Update triage instruction to allow proper review instead of always requiring human input |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Guard `parseStructuredItems` against `requires_human_input` JSON payloads |

## Result
- Re-review generates proper line items (short phrases) like other sections
- Accept Suggestion correctly saves the refined items to `extended_brief.approaches_not_of_interest`
- No junk JSON displayed
- Existing human content is preserved and refined, not discarded

