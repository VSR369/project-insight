

# Fix: Save Draft Crash — "Cannot read properties of undefined (reading 'filter')"

## Root Cause

When saving a draft, `stripHiddenFields()` removes fields based on governance visibility rules. For **QUICK** mode, `expected_outcomes` has `visibility: hidden`, so `expectedOutcomes` is deleted from the payload. Then `buildChallengeUpdatePayload()` calls `serializeLineItems(fp.expectedOutcomes)` where `fp.expectedOutcomes` is now `undefined`, causing `items.filter(...)` to crash.

This affects any governance mode where array fields are marked `hidden` or `auto`.

## Fix — Two files

### 1. `src/lib/cogniblend/creatorCuratorFieldMap.ts` — Make `serializeLineItems` null-safe

Line 163: Add a guard for undefined/null input:

```typescript
export function serializeLineItems(items: string[] | undefined): Record<string, unknown> | null {
  if (!items) return null;
  const filtered = items.filter((s) => s.trim().length > 0);
  ...
```

### 2. `src/lib/cogniblend/solutionRequestPayloads.ts` — Guard array accesses in `buildChallengeUpdatePayload`

Line 153: Already safe after fix #1.

But also guard `fp.expectedOutcomes` fallback on line 153 and the submit path in `useSubmitSolutionRequest.ts`:

**Line 93 of `useSubmitSolutionRequest.ts`**: Same pattern — `serializeLineItems(filteredPayload.expectedOutcomes)` and line 144. Both are safe after fix #1.

### Summary

The only code change needed is making `serializeLineItems` accept `undefined` and return `null`. This is a one-line defensive fix that covers all call sites (draft save, draft update, and full submit) across all governance modes.

