

## Plan: Wrap All Org Pages in OrgLayout + Add Registration Data Visibility

### Problem Summary

Three org pages (`OrgSettingsPage`, `OrgBillingPage`, `TeamPage`) render raw `<div>` containers instead of using `OrgLayout`. This means they lack:
- The sidebar with navigation links and "Back to App" button
- The header with breadcrumbs, user dropdown, and **Sign Out** option
- Consistent page titles and breadcrumb trails

Meanwhile, `OrgDashboardPage`, `MembershipPage`, and `ChallengeListPage` correctly use `OrgLayout` and have full navigation.

The dashboard also only shows usage gauges and quick action cards — it does not surface the registration data (profile, compliance, contacts, subscription details) that the user captured during sign-up.

---

### Part 1: Wrap OrgSettingsPage in OrgLayout

**File:** `src/pages/org/OrgSettingsPage.tsx`

Currently renders a bare `<div className="max-w-5xl mx-auto p-6 space-y-6">`. Replace with `OrgLayout` wrapper with title, description, and breadcrumbs. Remove the manual `<h1>` and `<p>` since OrgLayout renders those.

---

### Part 2: Wrap OrgBillingPage in OrgLayout

**File:** `src/pages/org/OrgBillingPage.tsx`

Currently renders `<div className="container max-w-5xl mx-auto py-8 space-y-6">` with a manual heading. Replace with `OrgLayout` wrapper. Remove duplicate title/description markup.

---

### Part 3: Wrap TeamPage in OrgLayout

**File:** `src/pages/org/TeamPage.tsx`

Same pattern — currently renders a bare container. Wrap in `OrgLayout` with title "Team Management" and breadcrumb.

---

### Part 4: Enhance Dashboard with Registration Data Summary Cards

**File:** `src/pages/org/OrgDashboardPage.tsx`

Add a new section below the existing quick action cards that shows a summary of registration data across tabs, each linking to the relevant settings tab or page:

| Card | Data Shown | Links To |
|------|-----------|----------|
| Organization Profile | Legal name, type, country, website | `/org/settings` (Profile tab) |
| Admin Details | Admin name, email, status | `/org/settings` (Admin tab) |
| Subscription & Billing | Tier, billing cycle, engagement model, period dates | `/org/settings` (Subscription tab) |
| Compliance | NDA preference, terms acceptance status | `/org/settings` (future tab) |
| Team | Member count, admin count | `/org/team` |

Each card shows 2-3 key fields with a "View Details →" link. This gives the logged-in user a single-screen overview of everything captured during registration.

**New hooks needed:** The dashboard will reuse existing hooks (`useOrgProfile`, `useOrgSubscription` from `useOrgSettings.ts`, `useOrgAdminDetails` from `useOrgAdminHooks.ts`).

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/org/OrgSettingsPage.tsx` | Wrap in `OrgLayout`, remove manual heading |
| `src/pages/org/OrgBillingPage.tsx` | Wrap in `OrgLayout`, remove manual heading |
| `src/pages/org/TeamPage.tsx` | Wrap in `OrgLayout`, remove manual heading |
| `src/pages/org/OrgDashboardPage.tsx` | Add registration data summary cards section |

### What This Achieves

- Every org page gets sidebar (with Dashboard, Challenges, Settings, Team, Membership, Billing links), header (with user dropdown containing **Sign Out**), and "Back to App" button in sidebar footer
- Dashboard becomes a true hub showing all captured registration data at a glance with drill-down links
- Consistent breadcrumb navigation on every page
- No new components or database changes required

