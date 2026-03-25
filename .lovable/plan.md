

# Decouple Expected Outcomes from Extended Brief

## Problem

Expected Outcomes is currently stored inside the `extended_brief` JSONB column (`extended_brief.expected_outcomes`). All read/write/accept logic reads from and merges back into that JSONB blob. The user wants Expected Outcomes treated as a fully independent section — like Deliverables — with its own dedicated DB column and standalone data pipeline.

## Plan

### 1. Add `expected_outcomes` column to challenges table

Create a Supabase migration adding a JSONB column `expected_outcomes` to the `challenges` table. This mirrors how `deliverables` is stored.

### 2. Migrate existing data (SQL)

In the same migration, copy `extended_brief->'expected_outcomes'` into the new column for all rows that have it, then remove the key from `extended_brief`.

```sql
-- Add column
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS expected_outcomes jsonb;

-- Migrate data from extended_brief
UPDATE challenges
SET expected_outcomes = extended_brief->'expected_outcomes',
    extended_brief = extended_brief - 'expected_outcomes'
WHERE extended_brief ? 'expected_outcomes';
```

### 3. Update SECTIONS config in CurationReviewPage

Change the `expected_outcomes` section entry:
- `dbField`: `"extended_brief"` → `"expected_outcomes"`
- `isFilled`: read from `ch.expected_outcomes` instead of `ch.extended_brief?.expected_outcomes`
- `render`: parse from `ch.expected_outcomes` directly

### 4. Update `getExpectedOutcomeObjects()`

Read from `ch.expected_outcomes` (the new dedicated column) instead of `ch.extended_brief`.

### 5. Update `getSectionContent()`

The `case "expected_outcomes"` block (line 823) currently reads from `extended_brief`. Change to read directly from `ch.expected_outcomes`.

### 6. Update section rendering (case "expected_outcomes", line 2198)

Change save handlers to write directly to `expected_outcomes` column instead of merging into `extended_brief`:
```typescript
onSave: (items) => saveSectionMutation.mutate({ field: "expected_outcomes", value: { items } })
onSaveStructured: (items) => saveSectionMutation.mutate({ field: "expected_outcomes", value: { items: items.map(...) } })
```

### 7. Update `handleAcceptRefinement`

Add `expected_outcomes` to the `JSON_FIELDS` list (line 1524) so AI acceptance parses JSON and saves directly to the `expected_outcomes` column — no more `extended_brief` merge logic needed.

### 8. Remove `expected_outcomes` from ExtendedBriefDisplay

Remove `expected_outcomes` from `ExtendedBriefData` interface and any rendering references in `ExtendedBriefDisplay.tsx` and `ExtendedBriefPreview.tsx` (the `PREVIEW_ITEMS` array has an `expected_outcomes` entry).

### 9. Update ExtendedBrief progress counter

The memory says "tracks progress via a 0/7 counter mapping its seven specific subsections". After removing expected_outcomes, this becomes 0/6 (already 6 in `EXTENDED_BRIEF_SUBSECTION_KEYS`).

## Files

| File | Change |
|------|--------|
| `supabase/migrations/XXXX_add_expected_outcomes_column.sql` | Create — add column + migrate data |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Update section config, data readers, save handlers, accept logic |
| `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` | Remove `expected_outcomes` from interface |
| `src/components/cogniblend/spec/ExtendedBriefPreview.tsx` | Remove `expected_outcomes` from PREVIEW_ITEMS |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Keep `expected_outcomes` in spec generation but save to new column |

