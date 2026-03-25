

# Defensive Sanitization for Corrupted Section Content

## Problem

Already-corrupted data in the database (e.g., `<p>["item1","item2"]</p>` or raw JSON arrays) renders as literal text in the Tiptap editor and display views. We need a defensive sanitizer that repairs this on read.

## Changes

### 1. Create `src/utils/sanitizeSectionContent.ts`

A pure function that detects and repairs corrupted content patterns:

- **Case 1**: `<p>["item1","item2"]</p>` → `<ol><li>item1</li><li>item2</li></ol>`
- **Case 2**: Raw JSON array string `["item1","item2"]` → same `<ol>` conversion
- **Case 3**: `<p>{"key":"val"}</p>` — JSON object in p tag → pass through (let table renderer handle)
- **Default**: Return unchanged

### 2. Apply in `CurationSectionEditor.tsx` (line 31)

In `TextSectionEditor`, wrap the value before normalizing:

```tsx
const [draft, setDraft] = useState(() => normalizeAiContentForEditor(sanitizeSectionContent(value)));
```

And in the `useEffect` (line 34):
```tsx
setDraft(normalizeAiContentForEditor(sanitizeSectionContent(value)));
```

### 3. Apply in `RichTextEditor.tsx` (lines 201, 219-222)

Sanitize the `value` prop before it reaches Tiptap's `content` and the sync `useEffect`:

```tsx
import { sanitizeSectionContent } from '@/utils/sanitizeSectionContent';

content: sanitizeSectionContent(value) || '',
// ...
const next = sanitizeSectionContent(value) || '';
```

### 4. Apply in `AIReviewResultPanel.tsx` `EditableRichText` (line 177)

```tsx
const htmlValue = useMemo(() => convertAITextToHTML(sanitizeSectionContent(value)), [value]);
```

## Files

| File | Change |
|------|--------|
| `src/utils/sanitizeSectionContent.ts` | Create — sanitization utility |
| `src/components/cogniblend/curation/CurationSectionEditor.tsx` | Lines 31, 34 — wrap value with sanitizer |
| `src/components/ui/RichTextEditor.tsx` | Lines 201, 219 — sanitize before Tiptap |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Line 177 — sanitize in EditableRichText |

