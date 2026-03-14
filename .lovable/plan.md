

# Fix: Filter "Create On Behalf" Orgs to Verified Only

## Problem
The `useOrgPickerOptions` hook (used by `CreateOnBehalfSheet`) fetches all orgs where `is_active = true` — no verification filter. Unverified, pending, rejected orgs all appear in the dropdown.

## Confirmed
The `seeker_organizations` table has a `verification_status` column using `org_verification_status_enum`. Only `'verified'` orgs should be assignable.

## Change: 1 file, 1 line added

**`src/hooks/queries/useOrgPicker.ts`** — add filter after `is_active`:

```typescript
// Before:
.eq("is_active", true)

// After:
.eq("is_active", true)
.eq("verification_status", "verified")
```

This ensures only verified and approved organizations appear in the "Create Role On Behalf" dropdown. All other consumers of `useOrgPickerOptions` (if any) also benefit from this safer default.

## Impact: Zero breakage
- The hook is used by `ResourcePoolPage` to feed `CreateOnBehalfSheet` — this is the correct fix point
- No other callers need unverified orgs in their picker

