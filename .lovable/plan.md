

# Analysis: Resource Pool Member Creation — Gaps and Plan of Action

## Current State

When a Platform Admin adds a pool member via the "Add Pool Member" form (`PoolMemberForm.tsx`), here is exactly what happens:

1. Admin fills in: name, email, phone, roles, domain scope, max concurrent
2. `useCreatePoolMember` inserts a row into `platform_provider_pool`
3. A toast says "Pool member added successfully"
4. **That's it.** Nothing else happens.

## What's Missing (Gap Analysis)

### 1. No Email Notification
The pool member receives **zero communication**. They have no idea they've been added to the platform. There is no edge function, no email trigger, no notification of any kind.

### 2. No Auth Account Created
Unlike the Seeking Org flow (which uses `create-org-admin` edge function to create a Supabase Auth user), the Resource Pool flow **does not create an auth account**. The `platform_provider_pool` table has no `user_id` column — it's completely disconnected from `auth.users`.

### 3. No Login Path
There is no portal, login page, or dashboard for pool members. They exist only as data rows that Platform Admins manage and assign to challenges. Pool members cannot:
- Log in to any portal
- View their assignments
- Accept or decline anything
- Update their own profile

### 4. No Invitation/Acceptance Workflow
Unlike the SOA Role Assignment flow (which has `acceptance_token`, `send-role-invitation`, `accept-role-invitation`, status lifecycle), the Resource Pool is **Direct enrollment only** — no invitation, no acceptance. The `availability_status` is auto-calculated by the `recalculate_availability_status()` trigger based on workload, not by user action.

### 5. Status Visibility
The `availability_status` (Available, Partially_Available, Fully_Loaded, On_Leave) is visible only to Platform Admins on the Resource Pool list page and the member detail page. There is no member-facing view.

## Architecture Summary

```text
┌─────────────────────────────────────────────────┐
│  SOA Role Assignments (Demand Side)             │
│  ─────────────────────────────────              │
│  ✅ Auth account (via create-org-admin)          │
│  ✅ Invitation email (send-role-invitation)      │
│  ✅ Accept/Decline flow (acceptance_token)       │
│  ✅ Login portal (/org/login)                    │
│  ✅ Status lifecycle (invited→active→declined)   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Resource Pool Members (Supply Side)            │
│  ───────────────────────────────                │
│  ❌ No auth account created                      │
│  ❌ No email sent                                │
│  ❌ No accept/decline flow                       │
│  ❌ No login portal                              │
│  ❌ No member-facing view                        │
│  ✅ Status auto-calculated by workload trigger   │
│  ✅ Audit trail (role_audit_log)                 │
│  ✅ Admin can assign to challenges               │
└─────────────────────────────────────────────────┘
```

## Impact Assessment

The Resource Pool is currently an **admin-managed internal roster** — pool members are passive data entries, not active platform users. This is a fundamental architectural decision, not a bug. However, it means:

- Pool members cannot self-serve (view assignments, update availability, set leave)
- All management burden falls on Platform Admins
- No accountability trail from the member's side (no acceptance = no consent record)

## Recommended Plan of Action

### Phase 1: Notification Email on Creation (Quick Win)
Create a `send-pool-member-welcome` edge function that:
- Sends an informational email when a member is added ("You've been added to the Resource Pool as [Role] by [Admin]")
- No acceptance required — purely informational
- Uses the same Resend setup as existing email functions (requires verified domain)

**Files:**
| File | Change |
|---|---|
| `supabase/functions/send-pool-member-welcome/index.ts` | New edge function to send welcome email |
| `src/hooks/queries/usePoolMembers.ts` | Call the edge function after successful creation |

### Phase 2: Auth Account + Member Portal (Major Feature)
This is a larger undertaking if you want pool members to log in:
- Add `user_id` column to `platform_provider_pool`
- Create auth account on member creation (similar to `create-org-admin`)
- Build a `/provider/login` portal
- Build a provider dashboard showing: assignments, availability, profile
- Add acceptance flow with token-based activation

### Phase 3: Self-Service Capabilities
- Members can update their own availability/leave
- Members can view and acknowledge challenge assignments
- Members can update their domain scope and profile

**Recommendation:** Start with Phase 1 (welcome email) — it's low-effort and immediately useful. Phase 2-3 are significant features that need separate planning based on whether pool members should be active platform users or remain admin-managed entries.

