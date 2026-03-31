

# Fix: "Objects are not valid as a React child" on Challenge Detail Page

## Problem

Line 170 in `PublicChallengeDetailPage.tsx` casts deliverables as `string[]`:
```typescript
const deliverablesList = (deliverables?.deliverables_list ?? deliverables?.items ?? []) as string[];
```

But the actual DB data contains structured objects: `{id, name, description, acceptance_criteria}`. Line 379 then renders `{item}` directly inside a `<li>`, causing the React crash.

## Fix

**File: `src/pages/cogniblend/PublicChallengeDetailPage.tsx`**

1. **Line 170** — Change the type cast from `string[]` to `any[]` to acknowledge mixed formats.

2. **Lines 369-385 (Creator view)** and the equivalent solver view section — Replace the simple `{item}` render with a safe extraction that handles both strings and objects:

```tsx
{deliverablesList.filter(Boolean).map((item, i) => (
  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
    <span className="text-primary font-bold mt-0.5">•</span>
    {typeof item === 'string' ? item : (item?.name ?? item?.title ?? JSON.stringify(item))}
  </li>
))}
```

This handles three formats:
- Plain strings → rendered as-is
- Structured objects with `name`/`title` → extracts the name
- Unknown objects → falls back to `JSON.stringify`

3. **Check the solver view** (further down in the file) for the same `deliverablesList` rendering and apply the same fix there.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cogniblend/PublicChallengeDetailPage.tsx` | Fix deliverables rendering to handle object items safely (lines 170, 376-381, and equivalent in solver view) |

