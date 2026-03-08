

# System Config Menu Item — Fix Plan

## Problem Identified

The "System Config" menu item is currently placed in the **"Other"** sidebar group (line 118 in `otherItems` array) with a `requiresSupervisor: true` flag. According to the Figma design, it should be a **standalone item in the Verification group**, positioned between "Reassignments" and "Permissions".

This means:
1. It's buried at the bottom of the sidebar instead of being prominently placed
2. If the user scrolls past or doesn't see the "Other" group, it appears missing
3. The Figma shows it as a distinct, individually-rendered item (not part of a generic list)

## Fix

### File: `src/components/admin/AdminSidebar.tsx`

**Remove** "System Config" from the `otherItems` array (line 118).

**Add** it as a standalone `SidebarMenuItem` in the Verification group, directly after "Reassignments" and before "Permissions" (around line 291-348), guarded by `isSupervisor`:

```tsx
{isSupervisor && (
  <SidebarMenuItem>
    <SidebarMenuButton
      onClick={() => navigate('/admin/system-config')}
      onMouseEnter={() => handleMouseEnter('/admin/system-config')}
      isActive={location.pathname.startsWith('/admin/system-config')}
    >
      <Settings className="h-4 w-4" />
      <span>System Config</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

This also uses `startsWith` for the active check so both `/admin/system-config` and `/admin/system-config/domain-weights` highlight the menu item.

**No other files are impacted.** Routes, guards, and the page component remain unchanged.

