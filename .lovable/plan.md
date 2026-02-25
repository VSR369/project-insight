

## Diagnosis and Fix Plan

### Your 3 Questions Answered

**1. Email domain restrictions in master data**
You can remove domain restrictions if you want to allow any email. That is a data configuration choice, not a code issue. It does not affect the login problem.

**2. What happens when a password is set during org registration?**
This is the root cause. Here is exactly what happens:

- Your account `vsr@btbt.co.in` was **first created on Jan 14** via the regular `/register` page with some password (let's call it Password-A)
- When you registered org "Bulbul" (Feb 24), you entered password `Bulbul@1234`. The edge function tried to create a new auth user, got "already exists", then **silently skipped the password** and only created the `org_users` mapping. Password-A remained active.
- When you registered org "RTC" (Feb 25), you entered password `Rtc@1234`. Same thing happened — password was **silently discarded**. Password-A is still the only valid password.

The bug is on **line 135-136** of `create-org-admin/index.ts`: when an existing user is found, it sets `userId = foundUserId` and moves on **without updating the password**. The password you typed during org registration was collected but never saved to Supabase Auth.

**3. Why "email or password not right"?**
Because Supabase still has Password-A (from Jan 14 registration). Neither `Bulbul@1234` nor `Rtc@1234` were ever stored.

### Currency and Phone Code Auto-Population

The country-to-currency/phone-code auto-population is **already implemented** in `OrganizationIdentityForm.tsx` (lines 136-147) and `PrimaryContactForm.tsx` (lines 127-131). When you select India, it correctly fetches `INR`, `₹`, `+91` from the `countries` table. If this is not working for you, it may be a UI rendering issue I can investigate separately.

---

### Fix Plan (2 Changes)

**Change 1: Fix `supabase/functions/create-org-admin/index.ts`** — Update password for existing users

After line 136 (`isExistingUser = true`), add a password update call:

```typescript
// User exists — update password to the one they just provided
const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(
  foundUserId,
  { password }
);
if (pwdError) {
  console.warn("Password update for existing user failed:", pwdError.message);
}

// Also update user metadata with seeker role_type
await supabaseAdmin.auth.admin.updateUserById(foundUserId, {
  user_metadata: {
    first_name: first_name ?? undefined,
    last_name: last_name ?? undefined,
    role_type: "seeker",
  },
});
```

This ensures that whenever a user registers a new organization, their password is updated to the one they just entered — which is what they expect.

**Change 2: Immediate password reset for `vsr@btbt.co.in`**

After deploying the edge function fix, I will reset the password for `vsr@btbt.co.in` to `Rtc@1234` (or whatever you prefer) using a one-time admin API call, so you can log in immediately without re-registering.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/create-org-admin/index.ts` | Add `updateUserById` password sync after line 136 |

### What This Fixes Permanently

- Any user registering multiple orgs with the same email will always have their **latest password** active
- No more silent password discarding
- Login with the most recently set password will always work

