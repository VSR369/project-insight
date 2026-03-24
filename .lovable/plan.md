

# Fix: AI Content Corruption & Overwrite Bugs

## Root Cause Analysis

The system has **one critical bug** causing cascading failures:

**AIReviewInline.handleAccept (line 188-190)** blindly concatenates `currentContent + <hr> + refinedContent` for ALL fields, including structured JSON fields (deliverables, evaluation_criteria, etc.).

For the Deliverables section, the flow is:
1. `getSectionContent()` returns `JSON.stringify(ch.deliverables)` → `'{"items":["Test"]}'`
2. AI returns JSON: `'{"items": [{"title": "Predictive Maintenance Model...", ...}]}'`
3. `handleAccept` concatenates: `'{"items":["Test"]}<hr><p><em>— AI suggestion —</em></p>{"items": [...]}'`
4. `handleAcceptRefinement` tries to JSON-parse this → the regex grabs only the first `{...}` block (the old data), ignoring the AI content
5. Even when the regex fails, the corrupted string is saved to a JSONB column, producing garbage

**Evidence in DB**: The `deliverables` column for the current challenge literally contains `{"items":["Test"]}<hr><p><em>— AI suggestion —</em></p>{...}` — an HTML/JSON chimera that no renderer can handle.

This same bug affects `evaluation_criteria`, `phase_schedule`, and `reward_structure` — any JSONB field.

For text fields, the append logic works correctly because text columns accept any string and the HTML is valid.

## Fix Strategy

Move merge/append logic OUT of AIReviewInline into each page's `handleAcceptRefinement`, where the field type is known.

---

## Step 1 — AIReviewInline: Remove append logic, pass raw content

**File: `src/components/cogniblend/shared/AIReviewInline.tsx`**

Remove lines 188-190 (the append logic). `handleAccept` should pass `refinedContent` directly to `onAcceptRefinement`. The page-level handler will decide how to merge based on field type.

```typescript
const handleAccept = useCallback(() => {
  if (!refinedContent) return;
  onAcceptRefinement(sectionKey, refinedContent);
  setRefinedContent(null);
  setEditedComments([]);
  setIsAddressed(true);
  setIsOpen(false);
  onMarkAddressed?.(sectionKey);
}, [refinedContent, onAcceptRefinement, sectionKey, onMarkAddressed]);
```

## Step 2 — CurationReviewPage: Field-aware merge logic

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

Update `handleAcceptRefinement` to:

**For JSON fields** (deliverables, evaluation_criteria, phase_schedule, reward_structure):
- Parse the AI's refined content (strip code fences, extract JSON)
- Load existing data from `challenge` state
- Merge: append new items/criteria into existing arrays
- Save merged JSON to DB

**For text fields** (problem_statement, scope, description, hook, eligibility, etc.):
- Check if existing DB content is non-empty
- If yes, append with `<hr>` separator
- Normalize to HTML via `normalizeAiContentForEditor`
- Save

Example for deliverables merge:
```typescript
if (dbField === 'deliverables') {
  // Parse AI output
  const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  let newItems: any[] = [];
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      newItems = Array.isArray(parsed) ? parsed : parsed?.items ?? [];
    } catch {}
  }
  // Load existing
  const existing = parseJson<any>(challenge.deliverables);
  const existingItems = Array.isArray(existing) ? existing : existing?.items ?? [];
  // Merge
  valueToSave = { items: [...existingItems, ...newItems] };
}
```

## Step 3 — ConversationalIntakePage & SimpleIntakeForm: Text append logic

**Files: `src/pages/cogniblend/ConversationalIntakePage.tsx`, `src/components/cogniblend/SimpleIntakeForm.tsx`**

These pages only have text fields. Add the append logic (previously in AIReviewInline) into their `handleAcceptRefinement`:

```typescript
const handleAcceptRefinement = async (sectionKey: string, newContent: string) => {
  // Get existing content from form
  const existingContent = form.watch(formField);
  let merged = newContent;
  if (existingContent && existingContent.trim()) {
    merged = `${existingContent}<hr><p><em>— AI suggestion —</em></p>${newContent}`;
  }
  const normalized = normalizeAiContentForEditor(merged);
  form.setValue(formField, normalized, { shouldValidate: true });
  // ... DB save with normalized
};
```

## Step 4 — AISpecReviewPage: Text append logic

**File: `src/pages/cogniblend/AISpecReviewPage.tsx`**

Update `handleSpecAcceptRefinement` to normalize and append for text fields:

```typescript
const handleSpecAcceptRefinement = useCallback((sectionKey: string, newContent: string) => {
  const existing = getFieldValue(sectionKey);
  let merged = newContent;
  if (existing && existing.trim()) {
    merged = `${existing}<hr><p><em>— AI suggestion —</em></p>${newContent}`;
  }
  const normalized = normalizeAiContentForEditor(merged);
  handleSave(sectionKey, normalized);
  // ... mark addressed
}, [...]);
```

## Step 5 — Auto-repair corrupted JSONB data

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

Add a cleanup function that runs when challenge data loads. For each JSONB field, if the value is a string containing `<hr>` or HTML tags, attempt to extract the last valid JSON block (the AI content) and merge it with any valid items found before the HTML corruption:

```typescript
function repairCorruptedJsonb(val: any): any {
  if (typeof val !== 'string') return val;
  if (!val.includes('<hr>') && !val.includes('<p>')) return val;
  // Split on <hr>, try to parse each segment as JSON, merge items
  const segments = val.split(/<hr>/);
  const allItems: any[] = [];
  for (const seg of segments) {
    const cleaned = seg.replace(/<[^>]+>/g, '').trim();
    const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : parsed?.items ?? [];
        allItems.push(...items);
      } catch {}
    }
  }
  return allItems.length > 0 ? { items: allItems } : val;
}
```

Trigger auto-repair on load and save the cleaned data back to DB.

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Remove append logic from `handleAccept` — pass raw `refinedContent` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Field-aware merge in `handleAcceptRefinement` (JSON merge for structured, HTML append for text); auto-repair corrupted JSONB on load |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Add text append logic in `handleAcceptRefinement` |
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Add text append logic in `handleAcceptRefinement` |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Add text append + normalize in `handleSpecAcceptRefinement` |
| SQL migration | Repair corrupted `deliverables` row for challenge `dd2e7a35-...` |

