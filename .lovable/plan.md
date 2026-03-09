

# Plan: Simplify Primary SO Admin Sidebar + Fix Admin Management Table

## 1. Simplify Sidebar for Primary SO Admin

**Problem:** The sidebar currently shows "Settings" for SO Admins, which is confusing. The user does not want Settings, Role Management, or Knowledge Centre for Primary SO Admin.

**Change in `OrgSidebar.tsx`:** For Primary SO Admin, the Organization section should only contain **Admin Management** — no Settings, no Role Management, no Knowledge Centre.

```
// PRIMARY SO Admin sees:
Dashboard
──────────
Organization
  Admin Management
──────────
[Sign Out]
```

The `orgItems` for `isSOAdmin` changes from:
- Settings + Admin Management (if PRIMARY)

To:
- Admin Management only (if PRIMARY)
- Nothing (if DELEGATED — they only see Dashboard)

## 2. Fix Admin Management Table to Match Reference Image

**Changes in `AdminManagementPage.tsx`:**

- **Name column**: Add colored avatar circle with initials (first letter of first+last name). Colors cycle through a palette array based on index.
- **Status badges**: Use colored inline styles — green for `active`, amber for `pending_activation`, red for `suspended`, grey for `deactivated` (instead of generic shadcn badge variants).
- **Replace single "Scope" column** with two columns:
  - **Industry Segments** — resolve `domain_scope.industry_segment_ids` to names, show as Badge pills (max 2 + "+N" overflow)
  - **Proficiency Areas** — show count as "N areas" text
- **Subtitle**: Add "Manage your organisation's Delegated Administrators and their domain scopes"
- **Footer**: Add "Showing X of Y admins" below the table

## Files

| File | Action |
|------|--------|
| `src/components/org/OrgSidebar.tsx` | Edit — remove Settings from PRIMARY SO Admin org items |
| `src/pages/org/AdminManagementPage.tsx` | Edit — avatar initials, colored status badges, split scope into Industry Segments + Proficiency Areas columns, footer count |

No new pages or routes needed (Role Management, Knowledge Centre, Settings are all removed from scope).

