

# Recommended Admin Sidebar Reorganization

## Current State: 12 groups (from the actual code)

```text
1. Dashboard (1 item)
2. Master Data (7 items) — permission-gated
3. Taxonomy Management (1 item) — permission-gated
4. Interview Setup (4 items) — permission-gated
5. Verification (10 items!) — the problem group
6. Marketplace (6 items)
7. [Unlabeled] Org Approvals + Enterprise Agreements (2 items)
8. Team Management (3 items) — permission-gated
9. Seeker Config (14-18 items) — permission-gated
10. Invitations (collapsible, 2 sub-items) — permission-gated
11. Content (2 items) — permission-gated
12. Other (profile, settings, 3 test tools)
```

## Recommendation: 8 Groups (incorporating Claude's reviewer feedback)

The reviewer made three strong points that override my original 7-group proposal:

1. **Keep Seeker Config top-level** — it has 14-18 items and is likely accessed frequently. Burying it inside a mega-group creates depth without benefit.
2. **Split personal vs platform admin items** — "My Performance" and "System Config" serve different intents.
3. **Don't over-merge** — semantic purity matters less than task-flow alignment.

### Proposed 8-group structure

```text
GROUP                          ITEMS                                    SOURCE
─────────────────────────────  ───────────────────────────────────────   ──────
1. Dashboard                   Dashboard                                unchanged

2. Reference Data              Countries, Industry Segments,            Master Data +
   (collapsible sub-sections)  Org Types, Participation Modes,          Taxonomy
                               Expertise Levels, Departments,
                               Functional Areas,
                               Proficiency Taxonomy

3. Interview & Review          Interview KIT, Quorum Requirements,      unchanged
                               Reviewer Availability,
                               Reviewer Approvals (badge)

4. Operations                  Verifications, Knowledge Centre,         from Verification +
                               Reassignments (badge), Org Approvals     unlabeled group
                               (badge), Enterprise Agreements,
                               Notification Audit

5. Marketplace                 Dashboard, Resource Pool,                unchanged
                               Solution Requests, Assignment History,
                               Admin Contact, Email Templates

6. Seeker Config               Pricing Overview, Subscription Tiers,    unchanged (top-level)
   (collapsible: Compliance)   Membership Tiers, ... Shadow Pricing,
                               Export Control, Data Residency,
                               Blocked Domains

7. Content & Invitations       Question Bank, Capability Tags,          Content + Invitations
                               Invitations (collapsible sub-menu)

8. My Workspace                My Profile, My Performance,              from Verification +
   (collapsible: Dev Tools     My Availability, Settings                Team Mgmt + Other
    — supervisor only)         ── supervisor section ──
                               Platform Admins, Assignment Audit Log,
                               System Config, Permissions
                               ── dev tools (collapsible) ──
                               Regression Test Kit,
                               Social Channel Test, Smoke Test
```

## Why 8, not 7

The reviewer is right: Seeker Config at 14-18 items deserves its own top-level group. Forcing it into "Platform Data & Config" alongside Master Data creates a 22+ item mega-group that requires expansion every session. The 8-group structure keeps every group between 1-6 visible items (with collapsibles for overflow), which is the sweet spot for scanability.

## What changes

- **Single file**: `src/components/admin/AdminSidebar.tsx`
- Reorder JSX groups and relabel `SidebarGroupLabel` text
- Move items between groups (no route/permission/icon changes)
- Add one collapsible sub-section in "My Workspace" for Dev Tools (supervisor-only items)
- Merge Taxonomy's single item into Reference Data
- Move personal items (My Performance, My Availability) out of "Verification" into "My Workspace"
- Move platform admin items (System Config, Permissions, Platform Admins) into the supervisor section of "My Workspace"
- Merge orphaned Org Approvals group into "Operations"

## What does NOT change

- Zero route changes
- Zero permission logic changes
- Zero icon changes
- Zero new components
- All badge counts stay on the same items
- Footer "Back to App" unchanged
- Existing Collapsible pattern reused (already imported)
- All `hasPermission()` gates remain identical

## On Cards

Cards inside the sidebar would break the standard navigation pattern. The sidebar already uses the shadcn `SidebarGroup` + `Collapsible` pattern which users expect. Cards are better suited for the Dashboard page itself (quick-access tiles), not the navigation rail.

