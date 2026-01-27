

# Move "Invite Panel Members" to Invitations Sidebar Menu

## Objective

Extract the "Invite Panel Members" functionality from the Quorum Requirements page and make it accessible as a separate page under the Invitations menu in the Admin sidebar.

---

## Current Architecture

```text
/admin/interview/quorum-requirements (InterviewRequirementsPage.tsx)
├── Tab: Configure Interview Requirements (Quorum Matrix)
└── Tab: Invite Panel Members (InvitePanelMembersTab.tsx)
```

---

## Target Architecture

```text
Admin Sidebar
├── Invitations (Collapsible Submenu)
│   ├── Solution Provider    → /admin/invitations
│   └── Panel Reviewer       → /admin/invitations/panel-reviewers (NEW)
└── Interview Setup
    └── Quorum Requirements  → /admin/interview/quorum-requirements (Tabs removed)
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/admin/AdminSidebar.tsx` | Modify | Convert "Invitations" to collapsible submenu with 2 sub-items |
| `src/pages/admin/interview-requirements/InterviewRequirementsPage.tsx` | Modify | Remove tabs, keep only Quorum Matrix content |
| `src/pages/admin/invitations/PanelReviewerInvitationsPage.tsx` | **Create** | New page wrapping `InvitePanelMembersTab` |
| `src/pages/admin/invitations/index.ts` | Modify | Export the new page |
| `src/App.tsx` | Modify | Add new route for `/admin/invitations/panel-reviewers` |

---

## Implementation Details

### 1. Create New Page: PanelReviewerInvitationsPage.tsx

Create a dedicated page for Panel Reviewer invitations that reuses the existing `InvitePanelMembersTab` component:

```typescript
// src/pages/admin/invitations/PanelReviewerInvitationsPage.tsx
import { AdminLayout } from "@/components/admin/AdminLayout";
import { InvitePanelMembersTab } from "@/pages/admin/interview-requirements";

export function PanelReviewerInvitationsPage() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Invitations" },
    { label: "Panel Reviewers" },
  ];

  return (
    <AdminLayout
      title="Panel Reviewer Invitations"
      description="Invite and manage review panel members"
      breadcrumbs={breadcrumbs}
    >
      <InvitePanelMembersTab />
    </AdminLayout>
  );
}
```

### 2. Modify AdminSidebar.tsx

Convert the single "Invitations" menu item into a collapsible submenu:

**Required Imports:**
- Add `ChevronRight` from lucide-react
- Add `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from "@/components/ui/collapsible"
- Add `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` from sidebar components

**Changes:**
- Remove "Invitations" from `otherItems` array
- Add state for managing collapsible: `const [invitationsOpen, setInvitationsOpen] = useState(...)`
- Add collapsible submenu in the "Other" group before the remaining items:

```typescript
<Collapsible
  open={invitationsOpen}
  onOpenChange={setInvitationsOpen}
  className="group/collapsible"
>
  <SidebarMenuItem>
    <CollapsibleTrigger asChild>
      <SidebarMenuButton
        isActive={location.pathname.startsWith('/admin/invitations')}
      >
        <Mail className="h-4 w-4" />
        <span className="flex-1">Invitations</span>
        <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
      </SidebarMenuButton>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarMenuSub>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            onClick={() => navigate('/admin/invitations')}
            isActive={location.pathname === '/admin/invitations'}
          >
            Solution Provider
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        <SidebarMenuSubItem>
          <SidebarMenuSubButton
            onClick={() => navigate('/admin/invitations/panel-reviewers')}
            isActive={location.pathname === '/admin/invitations/panel-reviewers'}
          >
            Panel Reviewer
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      </SidebarMenuSub>
    </CollapsibleContent>
  </SidebarMenuItem>
</Collapsible>
```

### 3. Simplify InterviewRequirementsPage.tsx

Remove the tabs and keep only the Quorum Matrix content:

**Remove:**
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` imports and usage
- `UserPlus` icon import
- `InvitePanelMembersTab` import and usage
- Tab wrapper around content

**Update:**
- Description text to focus only on quorum configuration
- Page content to render matrix directly without tabs

### 4. Update App.tsx Routes

Add new route:

```typescript
<Route
  path="/admin/invitations/panel-reviewers"
  element={
    <AdminGuard>
      <PanelReviewerInvitationsPage />
    </AdminGuard>
  }
/>
```

### 5. Update invitations/index.ts

Add export for the new page:

```typescript
export { PanelReviewerInvitationsPage } from './PanelReviewerInvitationsPage';
```

---

## Visual Result

**Before (Quorum Requirements Page):**
```text
┌─────────────────────────────────────────────────────┐
│ Platform Admin                                       │
│ Manage interview panel quorum requirements...        │
├─────────────────────────────────────────────────────┤
│ [Configure Interview Requirements] [Invite Panel...] │ ← Two tabs
├─────────────────────────────────────────────────────┤
│ (Matrix or Invite form based on tab)                 │
└─────────────────────────────────────────────────────┘
```

**After (Quorum Requirements Page):**
```text
┌─────────────────────────────────────────────────────┐
│ Quorum Requirements                                  │
│ Configure the required number of interviewers...     │
├─────────────────────────────────────────────────────┤
│ (Matrix content only - no tabs)                      │
└─────────────────────────────────────────────────────┘
```

**After (Panel Reviewer Invitations Page - NEW):**
```text
┌─────────────────────────────────────────────────────┐
│ Panel Reviewer Invitations                           │
│ Invite and manage review panel members               │
├─────────────────────────────────────────────────────┤
│ (Invite form + Existing Panel Members table)         │
└─────────────────────────────────────────────────────┘
```

---

## Sidebar Visual Change

**Before:**
```text
Other
├── Invitations (single link)
├── Question Bank
└── ...
```

**After:**
```text
Other
├── Invitations ▶ (click to expand)
│   ├── Solution Provider
│   └── Panel Reviewer
├── Question Bank
└── ...
```

---

## No Breaking Changes

- Existing `/admin/invitations` route continues to work for Solution Provider invitations
- The `InvitePanelMembersTab` component is reused without modification
- All Panel Reviewer invitation functionality preserved

