

# Plan: Tier-Based Sidebar & Knowledge Centre Access Control

## Analysis Summary

I audited every sidebar section and route against the `tier_permissions` seed data and `TierGuard` route protections. Here is what I found:

### Current State — Sidebar Visibility Matrix

```text
Section/Item                  | Basic Admin | Senior Admin | Supervisor | Issue
─────────────────────────────-+─────────────+──────────────+────────────+──────────────────
Dashboard                     | ✓ visible   | ✓ visible    | ✓ visible  | OK
Master Data (7 items)         | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Taxonomy (2 items)            | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Interview Setup (4 items)     | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Verification - Verifications  | ✓ visible   | ✓ visible    | ✓ visible  | OK (all tiers)
Verification - Knowledge Ctr  | ✓ visible   | ✓ visible    | ✓ visible  | OK (help docs)
Verification - Reassignments  | ✗ hidden    | ✗ hidden     | ✓ visible  | OK ✓
Verification - Notif Audit    | ✗ hidden    | ✗ hidden     | ✓ visible  | OK ✓
Verification - Team Perf      | ✗ hidden    | ✗ hidden     | ✓ visible  | OK ✓
Verification - My Perf        | ✓ visible   | ✓ visible    | ✓ visible  | OK
Verification - My Availability| ✓ visible   | ✓ visible    | ✓ visible  | OK
Verification - System Config  | ✗ hidden    | ✗ hidden     | ✓ visible  | OK ✓
Verification - Permissions    | ✗ hidden    | ✗ hidden     | ✓ visible  | OK ✓
Marketplace (whole group)     | ✗ hidden    | ✓ visible    | ✓ visible  | OK ✓
Org Approvals                 | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Enterprise Agreements         | ✗ hidden    | ✓ visible    | ✓ visible  | ⚠ Route unguarded
Team Management               | ✗ hidden    | ✓ visible    | ✓ visible  | OK ✓
Seeker Config (whole group)   | ✗ hidden    | ✓ visible    | ✓ visible  | OK ✓
Invitations (SP + Reviewer)   | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Question Bank                 | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Capability Tags               | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Test items (3)                | ✓ visible   | ✓ visible    | ✓ visible  | ⚠ No gating
Settings                      | ✗ hidden    | ✓ visible    | ✓ visible  | OK ✓
```

### Problems Found

**P1 — 8 sidebar sections have NO tier gating** (visible to Basic Admin who shouldn't see them):
- Master Data, Taxonomy, Interview Setup, Org Approvals, Invitations, Question Bank, Capability Tags, Test items

**P2 — 11 routes have NO TierGuard** (Basic Admin can access via URL even if sidebar were hidden):
- All Master Data routes (7), Taxonomy routes (2), Interview routes (4), Invitations (2), Question Bank, Capability Tags, Org Approvals, Enterprise Agreements, Test items (3)

**P3 — Knowledge Centre shows ALL content** (including Supervisor-only System Config Reference) to all tiers

**P4 — `hasPermission()` from the dynamic tier_permissions table is never used in the sidebar** — all gating is hardcoded

## Proposed Changes

### Approach
Use `hasPermission()` from `useAdminTier` for sections that already have permission keys in `tier_permissions`, and use hardcoded tier checks (`canSeeTeamManagement` / `effectiveSupervisor`) for sections without permission keys. This avoids a migration while making the sidebar correct.

### File Changes

| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | **Edit** — Gate 8 currently-ungated sidebar sections by tier |
| `src/App.tsx` | **Edit** — Add missing `TierGuard` wrappers on ~15 unguarded routes |
| `src/pages/admin/verifications/VerificationKnowledgeCentrePage.tsx` | **Edit** — Import `useAdminTier`, conditionally show/hide groups based on tier |

### Detail: Sidebar Gating Rules

```text
Section                  | Visible To              | Gating Variable
─────────────────────────+─────────────────────────+──────────────────────
Dashboard                | All                     | (none)
Master Data              | Senior Admin+           | canSeeTeamManagement
Taxonomy                 | Senior Admin+           | canSeeTeamManagement
Interview Setup          | Senior Admin+           | canSeeTeamManagement
Verification core items  | All                     | (none)
Verification supervisor  | Supervisor only         | effectiveSupervisor (already done)
Marketplace              | Senior Admin+           | canSeeTeamManagement (already done)
Org Approvals            | Senior Admin+           | canSeeTeamManagement
Enterprise Agreements    | Senior Admin+           | canSeeTeamManagement (already done)
Invitations              | Senior Admin+           | canSeeTeamManagement
Question Bank            | Senior Admin+           | canSeeTeamManagement
Capability Tags          | Senior Admin+           | canSeeTeamManagement
Test items               | Supervisor only         | effectiveSupervisor
Settings                 | Senior Admin+           | (already done)
Knowledge Centre         | All (content filtered)  | (none)
```

### Detail: Route Guards to Add

Add `<TierGuard requiredTier="senior_admin">` around:
- All 7 Master Data routes
- 2 Taxonomy routes
- 4 Interview routes (kit, kit/questions, quorum, reviewer-availability, reviewer-approvals)
- 2 Invitation routes
- Question Bank, Capability Tags
- Enterprise Agreements (`saas-agreements`)
- Org Approvals (both list and detail routes)

Add `<TierGuard requiredTier="supervisor">` around:
- 3 Test item routes (regression-test-kit, pulse-social-test, smoke-test)

### Detail: Knowledge Centre Tier Filtering

Import `useAdminTier` in the Knowledge Centre page. Filter groups before render:

- **All tiers see:** "Getting Started" (3 items), "Working a Verification" (4 items), "Administration" (2 items — My Availability, My Performance)
- **Supervisor only sees additionally:** "Queue & Assignment Management" (3 items — includes Force Reassign), "System Configuration Reference" (10 items)
- **Senior Admin sees additionally:** "Queue & Assignment Management" minus Force Reassign item

This ensures a Basic Admin opening the Knowledge Centre sees only the 9 topics relevant to their daily work, not Supervisor-only config documentation.

### What This Does NOT Change
- No database migrations needed
- No changes to RLS policies
- No changes to existing working gating logic
- `usePoolPermissions` (canWrite) for Master Data pages stays as-is
- All existing functionality for Supervisor and Senior Admin remains identical

