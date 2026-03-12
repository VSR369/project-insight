

# Fix: MSME Quick Assign — Existing Team Member Tab

## Problem
The "Existing Team Member" tab in `MsmeQuickAssignModal` (lines 248-255) is a **static placeholder** that just shows "Existing team member selection will be available once team members are onboarded." It never reads the `assignments` prop to build or display actual team members.

The modal already receives `assignments: RoleAssignment[]` as a prop — same data the `AssignRoleSheet` uses successfully.

## Fix — `src/components/rbac/MsmeQuickAssignModal.tsx`

### Build existing members list (same pattern as AssignRoleSheet)
Derive `existingMembers` from the `assignments` prop by deduplicating on `user_email`, collecting each member's current roles:

```typescript
const existingMembers = (() => {
  const map = new Map<string, { email: string; name: string | null; roles: string[] }>();
  for (const a of assignments) {
    if (a.status !== "active" && a.status !== "invited") continue;
    const existing = map.get(a.user_email);
    if (existing) {
      if (!existing.roles.includes(a.role_code)) existing.roles.push(a.role_code);
    } else {
      map.set(a.user_email, { email: a.user_email, name: a.user_name, roles: [a.role_code] });
    }
  }
  return Array.from(map.values());
})();
```

### Replace placeholder with member list UI
Replace lines 248-255 with:
- List of member cards (avatar initials, name, email, current role badges)
- Clicking a member selects them and populates the form fields (`user_name`, `user_email`)
- Show the `RoleSelectionSection` below the selected member (reusing existing component)
- If no members exist, show the current empty state message

### Pre-fill form on member selection
When a member is clicked, call `form.setValue("user_name", member.name)` and `form.setValue("user_email", member.email)`, enabling the existing submit flow to work unchanged.

### Filter applicableRoles for SOA context
The current filter (line 55-57) shows `mp` and `both` roles. For SOA context (this modal is used from the Role Management Dashboard), it should show `agg` and `both` roles instead — matching the fix already applied to `AssignRoleSheet`. Change to:
```typescript
const applicableRoles = allRoles?.filter((r) =>
  r.model_applicability === "agg" || r.model_applicability === "both"
) ?? [];
```

### Files to modify
| File | Change |
|------|--------|
| `src/components/rbac/MsmeQuickAssignModal.tsx` | Build existing members from `assignments`, render member cards with selection, pre-fill form, fix role filter |

