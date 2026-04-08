

# Fix: Legal Documents Not Showing — `applies_to_model` Mismatch

## Root Cause

The `useLegalDocTemplates` hook filters client-side with:
```typescript
const modelMatch = doc.applies_to_model === 'ALL' || doc.applies_to_model.toUpperCase() === modelKey;
```

But the database stores `applies_to_model = 'BOTH'`, not `'ALL'`. Same issue exists for `applies_to_mode` — the code checks for `'ALL'` but the DB could also use `'BOTH'`.

Result: zero documents pass the filter, so the component renders nothing.

## Fix — 1 File

### `src/hooks/queries/useLegalDocTemplates.ts`

Update the filter to accept both `'ALL'` and `'BOTH'` as wildcard values:

```typescript
const modeMatch = ['ALL', 'BOTH'].includes(doc.applies_to_mode.toUpperCase()) || doc.applies_to_mode.toUpperCase() === modeKey;
const modelMatch = ['ALL', 'BOTH'].includes(doc.applies_to_model.toUpperCase()) || doc.applies_to_model.toUpperCase() === modelKey;
```

This single change will make all 5 active legal templates (PMA, CA, PSA, IPAA, EPIA) visible in the Creator form preview for all governance modes.

