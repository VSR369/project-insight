# Fix: Registration Page Shows "Configuration Locked" for New Users

## Problem Identified

When a new user (or a user whose provider record was deleted) visits the Registration page, they see:
- "Configuration Locked - Provider not found" warning banner
- This is confusing because new users should be able to fill out the form

**Root Cause**: The `useCanModifyField` hook returns `{allowed: false, reason: 'Provider not found'}` when no provider record exists. The Registration page interprets this as "locked" and shows the banner.

**Current Logic (Registration.tsx line 302)**:
```typescript
const isIndustryLocked = !configurationCheck.allowed;
```

This is too simplistic - it doesn't distinguish between:
1. New user (no provider record yet) - should NOT be locked
2. User at locked lifecycle stage (assessment started) - SHOULD be locked

---

## Solution

### Option A: Fix in Registration.tsx (Recommended)

The Registration page should check if `provider` exists before showing the lock banner. If there's no provider, they're a new user and the industry field should be editable.

**Change in Registration.tsx (around line 302)**:

```typescript
// Current (buggy)
const isIndustryLocked = !configurationCheck.allowed;

// Fixed: Only show as locked if provider exists AND configuration is not allowed
// New users (no provider yet) should be able to edit all fields
const isIndustryLocked = provider && !configurationCheck.allowed;
```

### Option B: Also fix in useLifecycleValidation.ts

The hook could return `allowed: true` when there's no provider, since a new user should be allowed to do anything:

**Change in useLifecycleValidation.ts (lines 72-73)**:

```typescript
// Current (wrong for new users)
if (!provider) {
  return { allowed: false, reason: 'Provider not found', isLoading: false };
}

// Fixed: New users (no provider) should have full access
if (!provider) {
  return { allowed: true, reason: undefined, isLoading: false };
}
```

---

## Recommended Approach

Implement **both fixes** for defense in depth:

1. **Fix `useCanModifyField`** to return `allowed: true` for new users (no provider)
2. **Fix Registration.tsx** as a safety net to also check `provider` exists

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/useLifecycleValidation.ts` | Return `allowed: true` when no provider exists |
| `src/pages/enroll/Registration.tsx` | Check `provider` exists before marking as locked |

---

## Code Changes

### 1. src/hooks/queries/useLifecycleValidation.ts (line 72-74)

```typescript
// BEFORE
if (!provider) {
  return { allowed: false, reason: 'Provider not found', isLoading: false };
}

// AFTER
// New users (no provider yet) should have full access to all fields
if (!provider) {
  return { allowed: true, reason: undefined, isLoading: false };
}
```

### 2. src/pages/enroll/Registration.tsx (line 302)

```typescript
// BEFORE
const isIndustryLocked = !configurationCheck.allowed;

// AFTER
// Only lock if provider exists AND lifecycle doesn't allow configuration changes
// New users (no provider) should be able to edit freely
const isIndustryLocked = !!provider && !configurationCheck.allowed;
```

---

## Your Test Data Issue

After implementing the code fix, you still need to handle the missing provider record for your existing test user.

**Option 1: Create a new test account**
- Sign up with a new email
- The trigger will create all required records

**Option 2: Manually create provider record**
Run this SQL in Supabase SQL Editor:
```sql
-- For provider@test.local (user_id: 32aec070-360a-4d73-a6dd-28961c629ca6)
INSERT INTO profiles (user_id, email, first_name, last_name)
VALUES ('32aec070-360a-4d73-a6dd-28961c629ca6', 'provider@test.local', '', '');

INSERT INTO solution_providers (
  user_id, first_name, last_name, is_student,
  lifecycle_status, onboarding_status, created_by
)
VALUES (
  '32aec070-360a-4d73-a6dd-28961c629ca6', '', '', false,
  'registered', 'not_started', '32aec070-360a-4d73-a6dd-28961c629ca6'
);

INSERT INTO user_roles (user_id, role, created_by)
VALUES ('32aec070-360a-4d73-a6dd-28961c629ca6', 'solution_provider', '32aec070-360a-4d73-a6dd-28961c629ca6')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## Test Scenarios After Fix

1. **New user signup** - No lock banner, can edit all fields
2. **Existing user at registered/enrolled stage** - No lock banner, can edit all fields
3. **User who started assessment** - Lock banner shows, industry field disabled
4. **User at terminal state (verified)** - Lock banner shows, all fields disabled

---

## Summary

The fix ensures that:
1. New users see an editable registration form
2. Users at early lifecycle stages can still modify their profile
3. Users at locked stages (assessment started) correctly see the lock banner
4. The behavior is consistent and predictable