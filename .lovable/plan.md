

# Maturity Level Display Bug — Case Mismatch

## Root Cause

There's a case mismatch across three layers:

1. `MATURITY_LABELS` in `maturityLabels.ts` uses **lowercase** keys: `blueprint`, `poc`, `prototype`, `pilot`
2. `useCurationMasterData` generates option values as **UPPERCASE**: `key.toUpperCase()` → `BLUEPRINT`, `POC`, etc.
3. `handleSaveMaturityLevel` saves **UPPERCASE** to DB via `.toUpperCase()`

When the AI suggests `PILOT` and the curator accepts, the DB gets `PILOT`. But `getMaturityLabel("PILOT")` looks up `MATURITY_LABELS["PILOT"]` which doesn't exist (only `"pilot"` exists), so it falls back to displaying the raw string `"PILOT"` instead of `"A real-world test"`.

The edit selector works because it matches `value="PILOT"` against option `value: "PILOT"` — but the view display breaks because `getMaturityLabel` uses lowercase keys.

## Fix

**Single fix in `maturityLabels.ts`** — make `getMaturityLabel` case-insensitive:

```typescript
export function getMaturityLabel(level: string | null | undefined): string {
  if (!level) return '—';
  return MATURITY_LABELS[level] ?? MATURITY_LABELS[level.toLowerCase()] ?? level;
}
```

Also fix `getDescription` lookup in the renderer (line 3100 of CurationReviewPage.tsx) — `maturityOptions` uses UPPERCASE values, so `find(o => o.value === val)` will fail for lowercase DB values. Fix by using case-insensitive compare:

```typescript
getDescription={(val) => masterData.maturityOptions.find(
  o => o.value.toLowerCase() === val.toLowerCase()
)?.description}
```

## Files Modified
1. `src/lib/maturityLabels.ts` — Case-insensitive lookup in `getMaturityLabel`
2. `src/pages/cogniblend/CurationReviewPage.tsx` — Case-insensitive `getDescription` lookup at line 3100

