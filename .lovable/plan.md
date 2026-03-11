

# Fix: Add Missing Marketplace Sub-Menu Items to Admin Sidebar

## Problem
The Marketplace section in `AdminSidebar.tsx` only has 3 items: Dashboard, Resource Pool, Solution Requests. The newly created pages — **Role Management**, **Admin Contact**, and **Email Templates** — have routes in `App.tsx` but were never wired into the sidebar navigation.

## Changes

### `src/components/admin/AdminSidebar.tsx`

Add 3 new `SidebarMenuItem` entries inside the Marketplace `SidebarGroup` (after "Solution Requests", lines ~404):

1. **Role Management** → `/admin/marketplace/roles` — icon: `ShieldCheck`
2. **Admin Contact** → `/admin/marketplace/admin-contact` — icon: `Contact` (or `UserCog`)
3. **Email Templates** → `/admin/marketplace/email-templates` — icon: `Mail`

All 3 are already gated by `canSeeTeamManagement` (senior_admin+) since they sit inside that conditional block.

Add the required lucide icon imports (`ShieldCheck`, `Contact`, `Mail`) at the top of the file.

No other files need changes — the routes already exist in `App.tsx`.

