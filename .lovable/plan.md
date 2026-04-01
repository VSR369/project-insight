

# Fix: Line Items Showing as Single Non-Friendly Entry

## Problem
When a draft is saved and reloaded, `expected_outcomes` (and other line-item fields like `root_causes`, `current_deficiencies`, etc.) display as a single item containing raw JSON text instead of multiple individual line items.

## Root Cause
Data flows through a double-serialization problem:

1. **Write path**: `serializeLineItems(['item1', 'item2'])` produces a **string**: `'{"items":[{"name":"item1"},{"name":"item2"}]}'`
2. **Storage**: The `expected_outcomes` column is `Json` type, so Supabase stores this string as a JSON string literal (double-encoded)
3. **Read path**: When loaded back, `expected_outcomes` comes back as a raw string `'{"items":[...]}'`
4. **Parse path**: `parseLineItems` at line 208 hits `typeof value === 'string'` and returns `[value]` — the entire JSON blob as one entry

The `parseLineItems` function checks for `typeof value === 'object' && 'items' in value` but never gets there because the value is still a string.

## Fix (2 files)

### 1. `src/lib/cogniblend/creatorCuratorFieldMap.ts` — Fix `serializeLineItems`
Change output from `JSON.stringify(...)` (string) to a plain object `{ items: [...] }` so Supabase stores it as proper JSONB, not a double-encoded string.

```typescript
// Before (returns a string that gets double-serialized):
return JSON.stringify({ items: filtered.map((name) => ({ name })) });

// After (returns an object for proper JSONB storage):
return { items: filtered.map((name) => ({ name })) };
```

Update the return type from `string | null` to `Record<string, unknown> | null`.

### 2. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — Fix `parseLineItems`
Add JSON string parsing before the object check so it handles both already-parsed objects AND double-encoded strings:

```typescript
const parseLineItems = (value: unknown): string[] => {
  if (!value) return [''];
  
  // Try to parse string as JSON first
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return [parsed as string]; }
  }
  
  // Handle { items: [{ name: "..." }] } structure
  if (typeof parsed === 'object' && parsed !== null && 'items' in parsed) {
    const items = (parsed as { items?: Array<{ name?: string } | string> }).items;
    if (Array.isArray(items)) {
      const result = items.map(item => typeof item === 'string' ? item : item?.name || '').filter(Boolean);
      return result.length > 0 ? result : [''];
    }
  }
  
  // Handle plain array
  if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [''];
  
  // Fallback
  if (typeof value === 'string' && value.trim()) return [value];
  return [''];
};
```

### 3. `src/hooks/cogniblend/useSubmitSolutionRequest.ts` — Update type references
Update `serializeLineItems` usages to match the new return type (no code change needed — `as any` cast already handles it).

## Impact
- All line-item fields (`expected_outcomes`, `submission_guidelines`, plus `root_causes`, `preferred_approach`, etc. in `extended_brief`) will correctly round-trip through save/load
- Fill Test Data continues to work (it sets arrays directly, no serialization)
- Existing drafts with double-encoded strings will be correctly parsed on load

