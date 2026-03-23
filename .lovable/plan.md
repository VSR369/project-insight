

# Fix: `v?.trim is not a function` crash in ConversationalIntakeContent

## Root Cause
Line 480 in `ConversationalIntakePage.tsx`:
```typescript
const hasExpanded = Object.values(eb).some((v) => v?.trim());
```

The `extended_brief` JSON column can contain nested objects or arrays as values, not just strings. Calling `.trim()` on an object throws `TypeError`.

Same issue on line 471:
```typescript
if (!KNOWN_BRIEF_KEYS.has(key) && typeof val === 'string' && val.trim()) {
```
This line is safe (has `typeof val === 'string'` guard), but line 480 lacks the guard.

## Fix
**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`**

Line 480 — add a type guard:
```typescript
const hasExpanded = Object.values(eb).some((v) => typeof v === 'string' && v.trim());
```

This is a one-line fix. No other files need changes.

