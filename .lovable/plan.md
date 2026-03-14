

# Audit: Hide Permission-Denied Menu Items & Empty Groups

## Current State

After reading the full sidebar, here's the permission gating status of every group and item:

| Group | Group-Level Gate | Ungated Items Inside |
|-------|-----------------|---------------------|
| Dashboard | None (correct — universal) | Dashboard |
| Reference Data | `master_data.view \|\| taxonomy.view` | All 8 items shown if group visible |
| Interview & Review | `interview.view` | All 4 items shown if group visible |
| **Operations** | **None** | Verifications, Knowledge Centre, Org Approvals — always shown |
| **Marketplace** | **None** | Dashboard, Resource Pool, Solution Requests, Assignment History — always shown |
| Seeker Config | `seeker_config.view` | 14 base items always shown if group visible |
| Content & Invitations | `content.view_questions \|\| invitations.view` | Items gated individually ✓ |
| My Workspace | **None** | My Profile, My Performance, My Availability — always shown |

**The problems:**
1. **Operations group** has no top-level gate — it shows to all tiers even if some items inside (Reassignments, Enterprise Agreements, Notification Audit, Team Performance) are gated away, leaving a shorter list that may confuse users about what's "missing"
2. **Marketplace group** has no top-level gate — Admin Contact and Email Templates disappear for basic admins but the group still shows
3. **Reference Data** gates the group but shows all 8 items uniformly — no item-level gating for edit vs view
4. **Seeker Config** gates the group but the 14 base items all render even though `seeker_config.view_shadow_pricing` and `seeker_config.manage_compliance` are already correctly gated for sub-items

## Recommended Approach

The best UX practice: **show only what the user can act on.** No grayed-out items, no "access denied" screens reached from the sidebar. If you can't use it, you don't see it.

### Changes (single file: `AdminSidebar.tsx`)

**1. Operations group — add group-level gate**
Wrap the entire group in a permission check. Since Verifications and Org Approvals are available to all admin tiers per the permission matrix, use `hasPermission('verification.view')` as the group gate (this permission is enabled for all tiers). This ensures the group disappears entirely if somehow a user has no operational permissions.

**2. Marketplace group — add group-level gate**
Wrap in `hasPermission('marketplace.view')`. The 4 base items (Dashboard, Resource Pool, Solution Requests, Assignment History) are available to all tiers, but the group should still be gated to prevent showing to users without any marketplace access.

**3. My Workspace — keep ungated (correct behavior)**
My Profile, My Performance, My Availability are personal items every admin needs. The supervisor items inside are already correctly gated. No change needed.

**4. Hide entire group when all visible items are zero**
For groups where every item has its own permission check (like Content & Invitations), the group is already hidden when both `content.view_questions` and `invitations.view` are false. This pattern is correct — extend it to Operations and Marketplace.

**5. Reference Data — add item-level gating**
Currently if the group is visible, all 8 items show. Add `hasPermission('master_data.view')` to the 7 master data items and `hasPermission('taxonomy.view')` to Proficiency Taxonomy separately, so users with only one permission see only their relevant items.

### Summary of edits

```text
Line ~213: Reference Data group — split items by permission
  - Master data items: wrap in hasPermission('master_data.view')
  - Proficiency Taxonomy: wrap in hasPermission('taxonomy.view')

Line ~253: Operations group — add group gate
  + {hasPermission('verification.view') && ( ... )}

Line ~361: Marketplace group — add group gate  
  + {hasPermission('marketplace.view') && ( ... )}
```

### What does NOT change
- Zero route changes
- Zero new permissions added to database
- Zero icon or label changes
- All existing item-level gates remain
- My Workspace group stays ungated (personal items)
- Dashboard stays ungated (universal)
- Knowledge Centre items within groups unaffected

