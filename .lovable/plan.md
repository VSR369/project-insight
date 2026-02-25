

## Current State of `vsr@btbt.co.in`

Your single email has accumulated:

| What | Records |
|------|---------|
| `user_roles` | `platform_admin` (should NOT be there) |
| `org_users` | 2 rows — org `2a8b744d` and org `58be3565` (both as `tenant_admin`) |

This causes two bugs:
1. Login priority is Admin > Reviewer > Org > Provider, so `platform_admin` always wins — you land on `/admin`
2. Having 2 `org_users` rows makes `.maybeSingle()` throw an error, so the system thinks you have NO org access

## Best Practice: One Email, Multiple Roles

Using one email for multiple roles is **completely valid** — the system is designed for it. A single user CAN be a provider, reviewer, AND org admin simultaneously. The problem is not your approach; it is two specific bugs:

1. **Data bug**: An incorrect `platform_admin` role was assigned to your account
2. **Code bug**: `.maybeSingle()` crashes when a user belongs to multiple organizations

## Fix Plan (3 Changes)

### Change 1: Remove incorrect `platform_admin` role (Data Fix)

Delete the `platform_admin` entry from `user_roles` for user `58fa3afe-e64a-4bc2-9c33-2ce267fe6f13`. This user should only have organization access, not admin access.

### Change 2: Fix `.maybeSingle()` for multi-org users (Code Fix)

Add `.limit(1)` before `.maybeSingle()` in three locations so users with multiple organizations don't break:

**`src/pages/Login.tsx` line 158:**
```
.eq('is_active', true).maybeSingle()
→ .eq('is_active', true).limit(1).maybeSingle()
```

**`src/pages/Login.tsx` line 258:**
```
.eq('is_active', true).maybeSingle()
→ .eq('is_active', true).limit(1).maybeSingle()
```

**`src/components/routing/RoleBasedRedirect.tsx` line 49:**
```
.eq('is_active', true).maybeSingle()
→ .eq('is_active', true).limit(1).maybeSingle()
```

### Change 3: Respect the user's portal tab selection (Logic Fix)

Currently, even when you click the "Organization" tab, the fallback logic overrides your choice if you have other roles. The `canAccessSelected` check already exists but the fallback ignores the tab. No code change needed beyond fixes 1 and 2 — once `platform_admin` is removed and `.maybeSingle()` works, the tab selection will be respected correctly.

## After Fix: How Same-Email Multi-Role Works

| You click tab | System checks | Result |
|--------------|---------------|--------|
| Organization | `org_users` has record? Yes | → `/org/dashboard` |
| Provider | `solution_providers` has record? Yes | → `/pulse/feed` |
| Reviewer | `panel_reviewers` has record? Yes | → `/reviewer/dashboard` |
| Admin | `user_roles` has `platform_admin`? No | → Error toast, falls back to next available |

The portal tab acts as the user's intent. The system validates access for that specific tab and only falls back if the user genuinely lacks access.

### Files to Change

| File | Change |
|------|--------|
| `user_roles` table | Delete `platform_admin` row for user `58fa3afe-...` |
| `src/pages/Login.tsx` | Add `.limit(1)` at lines 158 and 258 |
| `src/components/routing/RoleBasedRedirect.tsx` | Add `.limit(1)` at line 49 |

