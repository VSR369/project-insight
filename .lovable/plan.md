

# Data & Resources Provided: Two Distinct Bugs

## Problem Analysis

**Bug A — Display table shows blanks (image-518):**
The rendered table at lines 749-757 reads `r.resource`, `r.type`, `r.format` — but the AI generated data using different field names (e.g., `name`, `data_type`, `resource_name`). The normalizer at line 2067-2080 only runs during **Accept**, not during initial render. So either:
1. The data was accepted before the normalizer was added and saved with wrong keys, OR
2. The render path itself needs to also check aliases as a fallback.

**Bug B — AI Suggested Version uses wrong editor (image-519):**
The `EditableTableRows` component (line 327-380) is **hardcoded for evaluation_criteria** — it renders "Criterion name..." placeholder, a weight number input, and a description field. But this same component is used for ALL `table`-format sections, including `data_resources_provided` and `success_metrics_kpis`. So the AI suggestion for data resources shows eval-criteria-style inputs instead of Resource/Type/Format/Size/Access/Restrictions fields.

The root cause is that `EditableTableRows` is not column-aware. It needs to read the section's column config from `SECTION_FORMAT_CONFIG` and render dynamic fields.

---

## Fix Plan

### Fix 1: Make `EditableTableRows` column-aware (AIReviewResultPanel.tsx)

**Current:** Hardcoded `name`/`weight`/`description` fields with "Criterion name..." placeholder.

**Change:** Accept `sectionKey` prop, read `SECTION_FORMAT_CONFIG[sectionKey].columns`, and render one input per column dynamically. For eval_criteria, keep the weight as a number input. For all other table sections, render text inputs with proper labels derived from column keys.

Pass `sectionKey` from the render site at line 1207:
```tsx
<EditableTableRows sectionKey={sectionKey} rows={...} onChange={...} />
```

### Fix 2: Add alias fallbacks in display render (CurationReviewPage.tsx lines 749-757)

Add fallback field lookups so the display table also handles non-canonical keys:
```tsx
<TableCell>{r.resource ?? r.name ?? r.resource_name ?? "—"}</TableCell>
<TableCell>{r.type ?? r.data_type ?? r.resource_type ?? "—"}</TableCell>
<TableCell>{r.format ?? r.data_format ?? "—"}</TableCell>
<TableCell>{r.access_method ?? r.access ?? "—"}</TableCell>
<TableCell>{r.restrictions ?? r.restriction ?? "—"}</TableCell>
```

### Fix 3: Add `handleAdd` column-awareness (AIReviewResultPanel.tsx line 340)

**Current:** `handleAdd` creates `{ name: "", weight: 0, description: "" }` — wrong for non-eval sections.

**Change:** Create empty row using `SECTION_FORMAT_CONFIG[sectionKey].columns` to generate correct keys:
```tsx
const handleAdd = () => {
  const cols = SECTION_FORMAT_CONFIG[sectionKey]?.columns ?? ['name', 'description'];
  const emptyRow: Record<string, unknown> = {};
  cols.forEach(c => { emptyRow[c] = ''; });
  onChange([...rows, emptyRow]);
};
```

### Files Modified
1. `src/components/cogniblend/curation/AIReviewResultPanel.tsx` — Make `EditableTableRows` dynamic
2. `src/pages/cogniblend/CurationReviewPage.tsx` — Add alias fallbacks in display render

