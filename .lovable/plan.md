

# Fix: AI Suggested Selection acceptance must update the section display

## Problem

When the curator accepts an AI Suggested Selection (e.g., "Non-Exclusive License" / IP-NEL) for the IP Model section, the section's dropdown continues showing the old value ("Exclusive License" / IP-EL). The same pattern affects all `checkbox_single` sections (maturity_level, effort_level, challenge_visibility).

## Root Cause

In `CurationReviewPage.tsx`, the `handleAcceptRefinement` path for single-code master-data sections (line 1683) calls only `saveSectionMutation.mutate()` — it does **not** call `syncSectionToStore()`. 

Compare:
- **Manual edit path** (`handleSaveOrgPolicyField`, line 1208-1210): calls `syncSectionToStore` → immediate local update → then `saveSectionMutation.mutate`
- **AI acceptance path** (line 1683-1684): calls only `saveSectionMutation.mutate` → relies entirely on query refetch, which may be delayed or stale-cached

The query invalidation at line 1171 triggers a refetch, but if React Query serves the stale cache optimistically or the component re-renders before the refetch completes, the dropdown shows the old value.

## Fix

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (lines 1677-1693)

Add `syncSectionToStore` call before the mutation for all single-code sections in `handleAcceptRefinement`:

```tsx
if (singleCodeCfg) {
  const code = newContent.trim().replace(/^["']|["']$/g, '');
  const matched = singleCodeCfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
  if (matched) {
    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, matched.value);  // ← ADD THIS
    saveSectionMutation.mutate({ field: singleCodeCfg.field, value: matched.value });
    return;
  }
  // ... existing fallback
}
```

Also apply the same fix to the `eligibility` and `visibility` acceptance paths (lines 1639-1665) and the `solver_expertise` path (line 1630) — ensure every acceptance path calls `syncSectionToStore` before the mutation, matching the manual edit pattern.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add `syncSectionToStore` calls in all `handleAcceptRefinement` branches (single-code, multi-code, solver_expertise) |

## Result

Accepting any AI suggestion immediately updates the section's displayed value — no waiting for refetch, no stale cache showing the old value. This standardizes behavior across all section types: what AI suggests and curator accepts is what the section displays.

