

## Plan: Restrict Compliance Items in Seeker Config to Supervisors Only

### What Changes

In `AdminSidebar.tsx`, split `seekerConfigItems` into two arrays:

1. **General Seeker Config** (visible to Supervisor + Senior Admin): All current items except the three compliance ones
2. **Compliance Config** (visible to Supervisor only): Export Control, Data Residency, Blocked Domains

### Implementation

**File: `src/components/admin/AdminSidebar.tsx`**

- Extract `Export Control`, `Data Residency`, and `Blocked Domains` from `seekerConfigItems` into a new `complianceConfigItems` array
- Filter rendering: general items show when `canSeeSeekerConfig` (Supervisor or Senior Admin), compliance items show only when `isSupervisor`
- Render compliance items in the same Seeker Config sidebar group, just conditionally included

This is a single-file, ~10-line change with no backend or route guard changes needed (page-level guards can be added separately if desired).

