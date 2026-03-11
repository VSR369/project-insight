

# Analysis: "No Eligible Members" Dead End in Assign Modal

## Root Cause

The system currently has **only 1 pool member** (Srinivasa Rao Vegendla) who is already **fully booked** and holds all 4 roles. When the admin clicks "Assign Members" from the Team Incomplete banner, the modal shows **"No eligible pool members found"** with no guidance on what to do next.

The problem is **not** that roles don't exist — all 4 role codes (R3, R5_MP, R6_MP, R7_MP) exist in `md_slm_role_codes`. The problem is that there are no **available pool members** with those roles. The admin needs to first go to the Resource Pool page and create new members, then come back to assign them.

## What Needs to Change

The fix is purely **UX guidance** — no new database tables or role creation needed. The assign modal and banner must clearly tell the admin what to do when no candidates are available.

### 1. Update `AssignMemberModal.tsx` — Empty State with Action Link

When `candidates.length === 0`, replace the passive "No eligible pool members found" text with an actionable empty state:

- Show an info card explaining **why** no members are available (none exist with this role, or all are fully booked)
- Include a **"Go to Resource Pool"** button that navigates to `/admin/marketplace/resource-pool` (opens in same tab or new tab)
- After navigating away and creating a member, the modal's query will refetch when the admin returns

### 2. Update `TeamCompletionBanner.tsx` — Contextual Guidance

When the banner is shown, add a secondary line: "If no eligible members are available, add new members in the Resource Pool first." with a link to the Resource Pool page. This prevents the admin from hitting the dead-end modal at all.

### 3. Update `AssignMemberModal.tsx` — Remove "fully_booked" Filter Option

Currently the modal hard-filters out fully booked members. Instead:
- Still filter them out of the selectable list
- But show a note: "X member(s) with this role are fully booked" so the admin understands the situation and can go adjust capacity if needed

## Files Changed

| File | Change |
|---|---|
| `src/components/admin/marketplace/AssignMemberModal.tsx` | Replace empty dropdown text with actionable empty state (link to Resource Pool), show fully-booked member count |
| `src/components/admin/marketplace/TeamCompletionBanner.tsx` | Add secondary guidance text with Resource Pool link when team is incomplete |

