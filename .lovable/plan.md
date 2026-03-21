

## Plan: Add `markdownToHtml` utility and integrate into content pipeline

### What & Why
The user wants a dedicated `markdownToHtml` function that handles AI markdown conversion with callout detection, table parsing, and inline formatting — replacing the `marked` library dependency in `aiContentFormatter.ts` with a purpose-built parser that better handles AI-specific patterns (callout blocks like `**NOTE:**`, `**WARNING:**`).

### Changes

#### 1. Create `src/utils/markdownToHtml.ts`
New file with the user's `markdownToHtml`, `inlineFormat`, and `escapeHtml` functions. Adaptations for Lovable/Tiptap compatibility:
- Export all three functions
- Add DOMPurify sanitization wrapper around the final output
- Use the existing callout CSS classes (`callout-info`, `callout-warning`, `callout-success`, `callout-danger`) already defined in `index.css`

#### 2. Update `src/lib/aiContentFormatter.ts`
- Replace `import { marked } from 'marked'` with `import { markdownToHtml } from '@/utils/markdownToHtml'`
- In `normalizeAiContentForEditor`, swap `marked.parse(trimmed)` call with `markdownToHtml(trimmed)`
- Remove the `marked` dependency import and `marked.setOptions` call
- Keep the existing HTML detection branch (pass-through for already-HTML content)
- Keep DOMPurify sanitization on all outputs

#### 3. No other file changes needed
All consumers (`CurationSectionEditor`, `AISpecReviewPage`, `AiContentRenderer`) already use `normalizeAiContentForEditor` — the new parser flows through automatically.

### Files
- **Create:** `src/utils/markdownToHtml.ts`
- **Modify:** `src/lib/aiContentFormatter.ts` (swap marked → markdownToHtml)

