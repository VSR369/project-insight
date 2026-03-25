

# One-Time Migration for Corrupted Section Content

## Overview

Add a utility to detect and repair corrupted content (JSON arrays/objects stored as literal text or wrapped in `<p>` tags), and run it once when the Curation Review Page loads challenge data.

## Changes

### 1. Create `src/utils/sanitizeSectionContent.ts`

Two exported functions:

- **`isCorruptedContent(content: string): boolean`** — returns true if content matches:
  - `<p>["..."]</p>` (JSON array in p tag)
  - `<p>{...}</p>` (JSON object in p tag)
  - Raw JSON array string (starts with `[`, ends with `]`)

- **`sanitizeSectionContent(content: string): string`** — repairs corrupted content:
  - JSON arrays (raw or in `<p>`) → parse items, return `<ol><li>...</li></ol>`
  - JSON objects in `<p>` → pass through unchanged (for table renderer)
  - Valid HTML → pass through

### 2. Create `src/utils/migrateCorruptedContent.ts`

```ts
import { isCorruptedContent, sanitizeSectionContent } from './sanitizeSectionContent';

interface MigrationTarget {
  dbField: string;
  content: string | null;
}

export function findCorruptedFields(fields: MigrationTarget[]): { dbField: string; fixed: string }[] {
  return fields
    .filter(f => f.content && isCorruptedContent(f.content))
    .map(f => ({ dbField: f.dbField, fixed: sanitizeSectionContent(f.content!) }));
}
```

### 3. Wire into `CurationReviewPage.tsx`

Add a `useEffect` after the challenge query succeeds that:

1. Builds a list of text-content fields (`problem_statement`, `scope`, `hook`, `description`) from the loaded `challenge` data
2. Calls `findCorruptedFields()` to detect corruption
3. For each corrupted field, calls `saveSectionMutation.mutate()` to silently repair
4. Uses a `useRef(false)` guard to ensure it runs only once per page load

```ts
const migrationRanRef = useRef(false);

useEffect(() => {
  if (!challenge || migrationRanRef.current) return;
  migrationRanRef.current = true;

  const targets = [
    { dbField: 'problem_statement', content: challenge.problem_statement },
    { dbField: 'scope', content: challenge.scope },
    { dbField: 'hook', content: challenge.hook },
    { dbField: 'description', content: challenge.description },
  ];

  const corrupted = findCorruptedFields(targets);
  corrupted.forEach(({ dbField, fixed }) => {
    saveSectionMutation.mutate({ field: dbField, value: fixed });
  });
}, [challenge]);
```

No user-facing UI — repairs happen silently on load.

## Files

| File | Action |
|------|--------|
| `src/utils/sanitizeSectionContent.ts` | Create |
| `src/utils/migrateCorruptedContent.ts` | Create |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add useEffect + useRef (~5 lines near line 1100) |

