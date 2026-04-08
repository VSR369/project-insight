

# Fix: Legal Documents Not Showing in Creator Preview

## Root Cause

The `useLegalDocTemplates` hook filters by `version_status = 'published'` (line 32), but the database stores the active status as `'ACTIVE'` (confirmed by DB query). Zero rows match, so the component renders nothing (`docs.length === 0` returns `null`).

## Fix — 1 File

### `src/hooks/queries/useLegalDocTemplates.ts`

Change line 32 from:
```typescript
.eq('version_status', 'published')
```
to:
```typescript
.eq('version_status', 'ACTIVE')
```

That single change will make the query return the 5 active legal templates (PMA, CA, PSA, IPAA, EPIA), and the existing client-side filtering by `applies_to_mode` and `applies_to_model` will work correctly to show the right docs per governance mode.

