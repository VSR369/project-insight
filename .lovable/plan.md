

## Fix: Hide Tier Filter for Senior Admin Users

### Problem
The tier filter dropdown is shown to all admin tiers, allowing Senior Admins to see filter options (Supervisor, Senior Admin) for tiers they shouldn't even know about. The RLS now correctly restricts data at the DB level, but the UI still exposes irrelevant filter options.

### Solution
In `PlatformAdminListPage.tsx`, conditionally hide the tier filter dropdown entirely when the user is NOT a Supervisor. Only Supervisors need tier filtering since they're the only ones who see multiple tiers.

### Change

**File: `src/pages/admin/platform-admins/PlatformAdminListPage.tsx`**

Wrap the tier filter `<Select>` block (lines 106-115) with `{isSupervisor && ( ... )}` so it only renders for Supervisors. No other changes needed — the RLS policies already restrict the data, and Senior Admins will only ever see basic admins in the list.

