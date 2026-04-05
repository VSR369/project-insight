

# Fix: `CR_DESC` Temporal Dead Zone Error

## Root Cause

Line 45 of `DemoLoginPage.tsx` calls `buildDemoUsers('MP', 'STRUCTURED')` at module scope to initialize `DEMO_USERS`. This function references `CR_DESC` (line 75 inside the function body), but `CR_DESC` is declared on line 47 — **after** the call on line 45.

JavaScript `const` declarations are hoisted but not initialized, so accessing them before their declaration throws a `ReferenceError` (temporal dead zone).

## Fix

**File: `src/pages/cogniblend/DemoLoginPage.tsx`**

Move the `DEMO_USERS` export **below** all the descriptor constants (`CR_DESC`, `LC_DESC`, `CU_DESC`, `ER_DESC`) and below the `buildDemoUsers` function definition.

Specifically:
- Remove line 45: `export const DEMO_USERS: DemoUser[] = buildDemoUsers('MP', 'STRUCTURED');`
- Add it after line 66 (after the `ER_DESC` block and the `buildDemoUsers` function):

```typescript
/** Static demo users list for dev quick-switch (uses default engagement model) */
export const DEMO_USERS: DemoUser[] = buildDemoUsers('MP', 'STRUCTURED');
```

This ensures all constants and the function are fully initialized before `DEMO_USERS` is evaluated.

**1 file, 2-line move. No logic changes.**

