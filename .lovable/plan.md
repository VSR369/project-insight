

# Fix: Make Aggregator Roles Tab Match Core Roles Tab Layout

## Problem

You are correct. The **Core Roles** tab shows a clean, simple `RoleTable` (headers + rows + actions). But the **Aggregator Roles** tab renders `AggRoleManagement`, which wraps the same `RoleTable` inside:

1. A **RoleReadinessPanel** (the full readiness breakdown with progress bar, per-role status, warnings) — this is the same content shown on the separate **Role Readiness** menu item (`/org/role-readiness`)
2. A multi-role users info card
3. A Card with header "Aggregator Challenge Roles" + an extra "Assign Role" button
4. Then finally the `RoleTable` inside that card

This is redundant because the **RoleReadinessWidget** is already shown at the top of the dashboard (the pink "NOT READY — 3 roles missing" banner). Embedding the full readiness panel again inside the tab is confusing and makes it look like a different screen.

## Fix

Simplify `AggRoleManagement` to match `CoreRoles` tab — just render the `RoleTable` directly, same as Core Roles does.

### Changes to `src/components/rbac/AggRoleManagement.tsx`
- Remove the `RoleReadinessPanel` (already visible at top of dashboard; full version lives at `/org/role-readiness`)
- Remove the Card wrapper and "Aggregator Challenge Roles" header (Core Roles tab has no such wrapper)
- Keep the multi-role users info badge (this is useful, lightweight info)
- Keep the `RoleTable` render — identical pattern to Core Roles tab
- Remove the extra "Assign Role" button (each row already has "Invite User")

**Result**: Both tabs will show the same clean table layout. Readiness details stay in the widget at top + the dedicated Role Readiness page.

