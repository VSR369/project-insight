

# Fix: MSME Quick Assign "Myself" Tab Not Submitting

## Root Cause

In `MsmeQuickAssignModal.tsx`, the "Myself" tab displays the admin's name/email from `useCurrentAdminProfile` and `useAuth`, but **never writes those values into the react-hook-form**. The form defaults are `user_name: ""` and `user_email: ""`.

When the user clicks "Assign N Roles", `form.handleSubmit(onSubmit)` runs Zod validation which fails silently:
- `user_name` is empty → fails `min(1, "Name is required")`  
- `user_email` is empty → fails `email("Invalid email")`

No error messages are shown because the "Myself" tab doesn't render `FormField` components with `<FormMessage />` — it just shows a static user card.

## Fix

Add a `useEffect` that syncs `adminName` and `adminEmail` into the form whenever:
1. The "Myself" tab is active, AND
2. The admin profile has loaded

```typescript
// After adminEmail/adminName are derived (~line 88)
useEffect(() => {
  if (activeTab === "myself" && adminEmail) {
    form.setValue("user_name", adminName);
    form.setValue("user_email", adminEmail);
  }
}, [activeTab, adminEmail, adminName, form]);
```

Also reset the form fields when switching tabs so "New User" tab doesn't get pre-filled with admin data:

```typescript
// In tab click handler or via useEffect on activeTab
useEffect(() => {
  if (activeTab === "new_user") {
    form.setValue("user_name", "");
    form.setValue("user_email", "");
    form.setValue("selected_roles", []);
  } else if (activeTab === "myself" && adminEmail) {
    form.setValue("user_name", adminName);
    form.setValue("user_email", adminEmail);
    form.setValue("selected_roles", []);
  } else if (activeTab === "existing") {
    setSelectedMemberEmail(null);
    form.setValue("selected_roles", []);
  }
}, [activeTab]);
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/rbac/MsmeQuickAssignModal.tsx` | Add useEffect to sync admin profile into form for "Myself" tab; reset fields on tab switch |

## What Stays Unchanged
- All business rules (co-holding, duplicate prevention EC-11, domain scope)
- Direct/Invite enrollment mode logic
- Edge function calls for confirmation/invitation emails
- Existing Team Member tab flow
- Zod schema validation rules
- Session recovery logic

