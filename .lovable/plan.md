

# Role Management Module — Explanation & Issues Found

## How the Module Works (Plain English)

The Role Management Dashboard is where the **Seeking Org Admin** builds their organization's **role pool** for the Aggregator engagement model. Here is the lifecycle:

```text
┌─────────────────────────────────────────────────────────┐
│  SO Admin opens Role Management Dashboard               │
│                                                         │
│  Sees 7 roles to fill:                                  │
│    Core: R2 (Account Manager), R8 (Finance), R9 (Legal) │
│    AGG:  R4 (Creator), R5_AGG, R6_AGG, R7_AGG           │
│                                                         │
│  For each empty role → clicks "Invite User"             │
│    → Side-sheet opens                                   │
│    → Enters person's Name + Email                       │
│    → Clicks "Save & Invite"                             │
│    → System creates assignment with status: "invited"   │
│    → Person receives email invitation                   │
│    → Upon acceptance → status becomes "active"          │
│    → Person is now available in the system              │
│                                                         │
│  When all 7 roles are filled → Readiness = READY        │
│  Challenges can proceed in the lifecycle                │
└─────────────────────────────────────────────────────────┘
```

**"New User (Invite)"** = Someone not yet in the system. You enter their name and email; they get an invitation.

**"Existing Team Member"** = Someone already onboarded in your organization. You pick them from a list instead of typing their details. **This tab is currently a placeholder** — it shows "will be available once team members are onboarded" instead of querying actual team members.

## Issues Found

### Issue 1: MSME Toggle Shows Marketplace Roles (Wrong Model)
**File**: `MsmeToggle.tsx` line 28
**Bug**: Filters roles by `model_applicability === "mp"` — shows R3, R5_MP, R6_MP, R7_MP.
**Should**: Filter by `"agg"` or `"both"` since SO Admin only manages Aggregator model.
**Screenshot confirms**: Image-300 shows "(R3, R2, R5_MP, R8, R9, R6_MP, R7_MP)" — this is wrong for the SO Admin context.

### Issue 2: "Existing Team Member" Tab is a Dead Placeholder
**File**: `AssignRoleSheet.tsx` lines 329-335
**Bug**: Shows a static message "Existing team member assignment will be available once team members are onboarded" with no actual functionality.
**Should**: Query `role_assignments` for users already in the org (status = "active") and show a selectable list. When the admin has already invited an Account Manager (R2), that person should appear as a selectable option for other roles.

### Issue 3: Button Label Inconsistency
**RoleTable**: When role is unassigned → button says "Invite User". When role has someone → button says "Invite". Both do the same thing (open AssignRoleSheet). This is correct behavior but the naming difference is confusing.

### Issue 4: MSME Description Text Says "Marketplace"
**File**: `MsmeToggle.tsx` line 63
**Bug**: Says "Allow one person to hold all marketplace roles"
**Should**: Say "Allow one person to hold all aggregator roles" for the SO Admin context.

## Fix Plan

### Step 1: Fix MSME Toggle for Aggregator context
- Change role filter from `"mp"` to `"agg"` or `"both"` (line 28)
- Change description from "marketplace roles" to "aggregator roles" (line 63)

### Step 2: Build "Existing Team Member" tab in AssignRoleSheet
- Query `role_assignments` for the org where `status = 'active' OR status = 'invited'` to get known team members
- Deduplicate by `user_email` to build a selectable list
- Show each person's name, email, and current role(s)
- On select + submit, create a new `role_assignment` for the selected person with the chosen role
- Uses the existing `existingMemberAssignSchema` from `roleAssignment.ts` (already defined but unused)

### Step 3: Standardize button labels
- Unassigned role: "Invite User" (opens sheet)
- Assigned role: "Invite" + "Deactivate" (current behavior is correct, just make "Invite" say "Add User" to differentiate from the initial invite)

### Files Modified
- `src/components/rbac/MsmeToggle.tsx` — Fix model filter + description text
- `src/components/rbac/roles/AssignRoleSheet.tsx` — Implement Existing Team Member tab with selectable list
- `src/components/rbac/roles/RoleTable.tsx` — Minor button label clarification

