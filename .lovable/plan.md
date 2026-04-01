

# Fix: Curator Version Visibility Gate + Content Rendering

## Two Problems

1. **Curator Version shown before curation is complete** — The "Curator Version" tab always renders live DB columns, even when the curator hasn't touched the challenge yet. Creators see raw/unrefined data.

2. **Distorted/junk content** — Line-item fields (`expected_outcomes`, `root_causes`, `submission_guidelines`, etc.) are stored as `{ items: [{ name: "..." }] }` objects but rendered via `RichTextSection` (expects HTML string) or raw `String()` cast, producing `[object Object]` or JSON blobs.

## Fix

### 1. Gate Curator Version tab on phase progression

The Curator Version should only be visible once the curator has completed their review. The `current_phase` field on the challenge indicates progress:
- Phase 1-2: Creator/intake phase — curator hasn't started or is still working
- Phase 3+: Curator has submitted their work

**Logic:** If `current_phase <= 2`, replace the Curator Version tab content with an "Under Review" placeholder message. The tab remains visible but shows: "This challenge is currently under review by the Curator. The refined version will be available once the review is complete."

### 2. Fix content rendering for structured data

The Curator Version sections render line-item fields (`expected_outcomes`, `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`, `submission_guidelines`) through `RichTextSection` which calls `SafeHtmlRenderer`. These fields are JSONB objects, not HTML strings.

**Fixes in `CreatorChallengeDetailView.tsx`:**

| Field | Current renderer | Fix |
|-------|-----------------|-----|
| `expected_outcomes` | Already uses `ListSection` | OK but needs fallback parsing |
| `root_causes` (extended_brief) | `RichTextSection` | Parse `{ items: [{name}] }` → `ListSection` |
| `current_deficiencies` (extended_brief) | `RichTextSection` | Parse → `ListSection` |
| `preferred_approach` (extended_brief) | `RichTextSection` | Parse → `ListSection` |
| `approaches_not_of_interest` (extended_brief) | `RichTextSection` | Parse → `ListSection` |
| `affected_stakeholders` (extended_brief) | `RichTextSection` | Parse structured table rows |
| `submission_guidelines` | Attempts `.content`/`.guidelines` keys | Parse `{ items: [{name}] }` → `ListSection` |
| Snapshot `expected_outcomes` | `String()` cast | Parse `{ items: [{name}] }` → list |

Add a helper function `parseItems(value)` that handles:
- `{ items: [{ name: "..." }] }` → extract names
- `string[]` → use directly  
- `string` (JSON) → parse then extract
- `string` (plain) → wrap as single item

### 3. "My Version" snapshot line-item fields

Same parsing fix for snapshot fields that may contain structured JSONB (e.g., `expected_outcomes`, `root_causes` in `extended_brief`).

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Add phase gate for Curator tab, add `parseItems` helper, fix all structured field renderers in both tabs |

## Technical Detail

```typescript
// Helper to extract displayable items from various stored formats
function parseItems(value: unknown): Array<{ name: string }> | null {
  if (!value) return null;
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return [{ name: parsed }]; }
  }
  if (Array.isArray(parsed)) {
    return parsed.map(item => ({ name: typeof item === 'string' ? item : item?.name ?? JSON.stringify(item) }));
  }
  if (typeof parsed === 'object' && parsed !== null && 'items' in parsed) {
    const items = (parsed as any).items;
    if (Array.isArray(items)) return items.map(i => ({ name: typeof i === 'string' ? i : i?.name ?? '' }));
  }
  return null;
}

// Curator Version gate
const curatorReady = (data.current_phase ?? 1) >= 3;
```

