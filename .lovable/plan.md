

# Fix: Evaluation Criteria Not Displaying After AI Acceptance

## Root Causes

**1. AI output not normalized before saving** — When AI suggestions are accepted for `evaluation_criteria`, the raw AI JSON is saved directly to the DB (line 1527). The AI may use field names like `criterion`, `title`, or `scoring_method` that don't match the canonical `criterion_name`/`name` fields. Result: `getEvalCriteria` returns items with empty names and 0 weights.

**2. `rows` state never re-syncs** — `EvaluationCriteriaSection` uses `useState` which only initializes once. After data is saved and refetched, the edit mode still shows stale data from initial mount, while view mode uses the (potentially unparseable) `criteria` prop directly.

**3. Narrow field name matching** — `getEvalCriteria` only checks `criterion_name ?? name` and `weight_percentage ?? weight`. Any variation (e.g., `criterion`, `title`, `percentage`) is lost.

## Fixes

### 1. `src/pages/cogniblend/CurationReviewPage.tsx` — Normalize AI output on acceptance

In `handleAcceptRefinement` (after JSON parsing, ~line 1536), add special normalization for `evaluation_criteria`:

```typescript
if (dbField === 'evaluation_criteria' && valueToSave) {
  // Normalize AI output into canonical format
  const rawArr = Array.isArray(valueToSave) 
    ? valueToSave 
    : Array.isArray(valueToSave?.criteria) 
      ? valueToSave.criteria : null;
  if (rawArr) {
    valueToSave = {
      criteria: rawArr.map((c: any) => ({
        criterion_name: c.criterion_name ?? c.name ?? c.criterion ?? c.title ?? "",
        weight_percentage: c.weight_percentage ?? c.weight ?? c.percentage ?? 0,
        description: c.description ?? c.details ?? "",
      }))
    };
  }
}
```

### 2. `src/pages/cogniblend/CurationReviewPage.tsx` — Broaden `getEvalCriteria` field matching

```typescript
function getEvalCriteria(ch: ChallengeData) {
  const raw = parseJson<any>(ch.evaluation_criteria);
  const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : [];
  return ec.map((c: any) => ({
    name: c.criterion_name ?? c.name ?? c.criterion ?? c.title ?? "",
    weight: c.weight_percentage ?? c.weight ?? c.percentage ?? 0,
  }));
}
```

### 3. `src/components/cogniblend/curation/renderers/EvaluationCriteriaSection.tsx` — Sync `rows` state

Add a `useEffect` to re-sync `rows` when `criteria` prop changes (e.g., after save + refetch):

```typescript
useEffect(() => {
  if (!editing) return; // Only sync when entering edit mode
  setRows(criteria.length ? criteria.map(c => ({ ...c })) : [{ name: "", weight: 0 }]);
}, [criteria]);
```

Actually, better approach — sync whenever `criteria` changes regardless of mode, since `rows` is only used in edit mode anyway:

```typescript
useEffect(() => {
  setRows(criteria.length ? criteria.map(c => ({ ...c })) : [{ name: "", weight: 0 }]);
}, [criteria]);
```

## Files changed

| File | Change |
|------|--------|
| `CurationReviewPage.tsx` | Normalize AI eval criteria before saving; broaden `getEvalCriteria` field matching |
| `EvaluationCriteriaSection.tsx` | Add `useEffect` to sync `rows` state from `criteria` prop |

