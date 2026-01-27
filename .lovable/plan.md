
# Fix Invitations Submenu Hover/Clickable Indicators

## Problem Identified

The "Solution Provider" and "Panel Reviewer" sub-menu items under "Invitations" don't show a visual indicator (pointer cursor or arrow) when hovering, making them appear non-clickable.

**Root Cause:**
The `SidebarMenuSubButton` component renders as an `<a>` tag by default, but without an `href` attribute. Browsers don't show the pointer cursor for anchor tags without `href`. Additionally, there's no visual arrow indicator on sub-items.

---

## Solution

Add `cursor-pointer` class and a small `ChevronRight` icon to each sub-menu item to provide clear visual feedback that these items are clickable.

---

## File to Modify

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add `cursor-pointer` class and chevron icons to sub-menu buttons |

---

## Technical Implementation

Update the `SidebarMenuSubButton` elements to include:
1. `className="cursor-pointer"` - ensures pointer cursor on hover
2. A small `ChevronRight` icon before each label

```typescript
<SidebarMenuSubButton
  onClick={() => navigate('/admin/invitations')}
  isActive={isActive('/admin/invitations')}
  className="cursor-pointer"
>
  <ChevronRight className="h-3 w-3" />
  Solution Provider
</SidebarMenuSubButton>
```

---

## Visual Result

**Before:**
```text
├── Invitations ▶
│   ├── Solution Provider      (no cursor change, no arrow)
│   └── Panel Reviewer         (no cursor change, no arrow)
```

**After:**
```text
├── Invitations ▶
│   ├── ▸ Solution Provider    (pointer cursor + small arrow)
│   └── ▸ Panel Reviewer       (pointer cursor + small arrow)
```

---

## Behavior Change

| Aspect | Before | After |
|--------|--------|-------|
| Cursor on hover | Default (arrow) | Pointer (hand) |
| Visual indicator | None | Small chevron icon |
| Click feedback | Works but unclear | Clear clickable appearance |

---

## No Breaking Changes

- Navigation functionality remains unchanged
- Only visual/UX improvements
- Consistent with standard navigation patterns
