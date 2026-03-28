

# Fix All Extended Brief Subsection Bugs

## Root Cause Analysis

I traced the acceptance flow end-to-end and found the core bugs:

### Bug 1: Root Causes, Current Deficiencies, Approaches NOT of Interest — Accept saves data but display shows nothing

The acceptance pipeline has a data shape mismatch:

```text
AIReviewInline.handleAccept()
  → for line_items format: wraps as JSON.stringify({ items: ["cause1", "cause2"] })
  → calls onAcceptRefinement("root_causes", '{"items":["cause1","cause2"]}')

handleAcceptExtendedBriefRefinement()
  → detects line_items format, parses JSON
  → saves { items: ["cause1", "cause2"] } into extended_brief.root_causes  ← WRONG SHAPE

ensureStringArray() in ExtendedBriefDisplay
  → receives { items: ["cause1", "cause2"] }
  → not an array, not a string → returns []  ← DISPLAY EMPTY
```

The data IS persisted to the database, but the display layer cannot read it back because it expects a flat `string[]`, not `{ items: [...] }`.

### Bug 2: Missing Zustand store sync on acceptance

Every other save handler in CurationReviewPage calls `syncSectionToStore()` before the DB mutation. `handleAcceptExtendedBriefRefinement` does NOT. This causes stale local state until the next React Query refetch.

### Bug 3: Affected Stakeholders table distortion

The AI may return field names that don't match the canonical 4-column schema (e.g., `name` instead of `stakeholder_name`, `challenge` instead of `adoption_challenge`). `ensureStakeholderArray` only maps exact field names, so mismatches produce blank cells. Also, AI may generate duplicate rows.

### Bug 4: Re-review inconsistency

After accepting, the Zustand store doesn't know about the subsection update, so re-review may show stale content context.

---

## Fixes (4 files)

### 1. `src/pages/cogniblend/CurationReviewPage.tsx` — `handleAcceptExtendedBriefRefinement`

**Fix line_items unwrapping:** After parsing the JSON, check if result is `{ items: [...] }` and unwrap to just the array before saving.

```typescript
// After JSON.parse:
if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
  // Unwrap { items: [...] } wrapper that AIReviewInline adds
  if (Array.isArray((valueToSave as any).items)) {
    valueToSave = (valueToSave as any).items;
  }
}
```

**Add store sync:** Call `syncSectionToStore('extended_brief', updated)` before the mutation, matching every other save handler.

### 2. `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` — Defensive parsing

**`ensureStringArray`:** Add fallback for `{ items: [...] }` shape (handles any data already saved in the wrong format):

```typescript
function ensureStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => typeof v === "string" ? v : String(v));
  if (typeof val === "object" && val !== null) {
    // Handle { items: [...] } wrapper from AI acceptance
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.map(v => typeof v === "string" ? v : String(v));
  }
  if (typeof val === "string") {
    try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch {}
    return val.trim() ? [val] : [];
  }
  return [];
}
```

**`ensureStakeholderArray`:** Normalize AI field name aliases and deduplicate:

```typescript
function ensureStakeholderArray(val: unknown): StakeholderRow[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  return val
    .map((item: any) => ({
      stakeholder_name: item?.stakeholder_name ?? item?.name ?? item?.stakeholder ?? "",
      role: item?.role ?? item?.type ?? "",
      impact_description: item?.impact_description ?? item?.impact ?? item?.description ?? "",
      adoption_challenge: item?.adoption_challenge ?? item?.challenge ?? item?.barrier ?? "",
    }))
    .filter(row => {
      const key = row.stakeholder_name.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
```

**Improve `StakeholderTableView` styling:** Add professional styling consistent with the Phase Schedule table — alternating row colors, sticky header, better spacing, and a summary badge.

### 3. `src/components/cogniblend/shared/AIReviewInline.tsx` — No changes needed

The acceptance flow correctly delegates to `onAcceptRefinement`. The wrapping in `{ items: [...] }` is by design for main sections but needs unwrapping for extended_brief subsections (handled in fix #1).

### 4. One-time data migration for already-corrupted records

Add a migration check in `ExtendedBriefDisplay` that auto-unwraps `{ items: [...] }` on load for `root_causes`, `current_deficiencies`, and `approaches_not_of_interest` if they're stored in the wrong shape.

---

## Files Changed

| File | Change |
|------|--------|
| `CurationReviewPage.tsx` | Unwrap `{items:[]}` in `handleAcceptExtendedBriefRefinement`; add `syncSectionToStore` |
| `ExtendedBriefDisplay.tsx` | Harden `ensureStringArray` + `ensureStakeholderArray`; improve table styling; add load-time migration |

## After This Fix

- Root Causes, Current Deficiencies, Approaches NOT of Interest: accept → display updates immediately
- Affected Stakeholders: AI-generated table renders cleanly with no blank cells or duplicates
- Re-review works reliably because store is synced on accept
- Already-corrupted data self-heals on next page load

