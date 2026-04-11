

## Fix Plan: Bug 2 — Discovery Cache Invalidation in handleAnalyse

### Status

| Bug | Status |
|-----|--------|
| Bug 2: Discovery sources don't appear in drawer | **Needs fix** |
| Bug 3: useAddContextUrl digest regeneration | **Already fixed** (lines 326-330) |

### Problem

`handleAnalyse` in `useCurationAIActions.ts` does NOT fire `discover-context-resources` at all. The spec says discovery should run in parallel with Pass 1. Currently it only runs Pass 1, then opens the Context Library — but the drawer will be empty because no discovery was triggered.

### Fix (1 file)

**`src/hooks/cogniblend/useCurationAIActions.ts`**

In `handleAnalyse` (line 133-154), after pre-flight passes and before `await executeWavesPass1()`:
1. Import `useQueryClient` from `@tanstack/react-query`
2. Get `queryClient` via `useQueryClient()` at hook top level
3. Fire discovery as a parallel non-blocking call with cache invalidation on completion:

```typescript
// Fire discovery in parallel (non-blocking)
supabase.functions.invoke('discover-context-resources', {
  body: { challenge_id: challengeId },
}).then(() => {
  queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
  queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
  queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });
}).catch(() => {});
```

This fires discovery alongside Pass 1. When discovery completes and inserts sources, React Query re-fetches so the Context Library drawer shows them immediately.

### What is NOT touched
- `useContextLibrary.ts` — Bug 3 already fixed
- All other files unchanged
- No edge function changes
- No migration needed

