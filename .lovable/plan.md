

# Fix: Clean Literal `\n` Characters from AI Suggested Content

## Problem
The LLM returns suggestion content containing literal `\n` and `\n\n` characters mixed with HTML tags (e.g., `<p>text</p>\n\n<h3>heading</h3>`). When rendered in the Tiptap RichTextEditor or AiContentRenderer, these appear as visible `\n` text — as shown in the user's screenshot.

## Root Cause
The `convertAITextToHTML` function (used by `EditableRichText`) has an early-return: if the content contains any HTML tag, it returns the raw string unchanged. But the LLM embeds literal newline characters between HTML elements, and Tiptap renders those as visible text nodes.

## Solution: Add a `cleanSuggestionContent` utility and apply it at the ingestion points

### Change 1: New utility function `src/lib/cogniblend/cleanSuggestionContent.ts`

Create a small utility that:
- Strips literal `\n` between HTML tags (whitespace between block elements)
- Replaces remaining `\n\n` with `</p><p>` for plain text segments
- Replaces remaining single `\n` with `<br>` for line breaks within paragraphs
- Only operates on strings (no-op for non-strings)

### Change 2: Apply cleaning in `convertAITextToHTML` (used by `EditableRichText`)

In `src/utils/convertAITextToHTML.ts`, when HTML is detected (the early-return path), clean whitespace between tags instead of returning raw:

```
// Before: return rawText;
// After: return rawText.replace(/>\s*\n\s*</g, '><').replace(/\n/g, '');
```

### Change 3: Apply cleaning in `parseSuggestionForSection` for `rich_text` format

In `src/lib/cogniblend/parseSuggestion.ts`, for the `rich_text` case, clean the raw suggestion before returning:

```
case 'rich_text':
  return cleanSuggestionContent(rawSuggestion);
```

### Change 4: Apply cleaning in edge function Pass 2 output

In `supabase/functions/review-challenge-sections/index.ts`, clean each suggestion string before adding to the map (~line 546):

```
suggestionMap.set(s.section_key, cleanSuggestionString(s.suggestion));
```

Where `cleanSuggestionString` strips literal `\n` between HTML tags and normalizes whitespace in HTML content.

## Files Changed
- `src/lib/cogniblend/cleanSuggestionContent.ts` — new utility (HTML-aware newline cleaning)
- `src/utils/convertAITextToHTML.ts` — clean HTML content instead of raw pass-through
- `src/lib/cogniblend/parseSuggestion.ts` — clean `rich_text` suggestions at ingestion
- `supabase/functions/review-challenge-sections/index.ts` — clean suggestions in Pass 2 output

## Technical Details

The cleaning logic for HTML content:
```typescript
function cleanHtmlNewlines(html: string): string {
  return html
    .replace(/>\s*\n+\s*</g, '><')   // Remove newlines between HTML tags
    .replace(/\n{2,}/g, '</p><p>')     // Double newlines → paragraph breaks
    .replace(/\n/g, '<br>')            // Single newlines → line breaks
    .trim();
}
```

For non-HTML (plain text with `\n`), convert to proper HTML paragraphs using the existing `convertAITextToHTML`.

