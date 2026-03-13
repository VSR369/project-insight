

# Plan: Add Missing Permission Categories to the Matrix

## Problem
Six sidebar sections still use hardcoded tier checks instead of the dynamic `tier_permissions` table. This means Supervisors cannot toggle access for these features per tier.

## Scope

### New permission categories to add (PermissionsManagementPage.tsx)

| Category | Permission Keys | Default: Supervisor | Default: Senior | Default: Admin |
|---|---|---|---|---|
| **Taxonomy Management** | `taxonomy.view`, `taxonomy.create`, `taxonomy.edit` | all on | view+create+edit | view only |
| **Interview Setup** | `interview.view`, `interview.manage_kit`, `interview.manage_quorum`, `interview.manage_availability`, `interview.approve_reviewers` | all on | all on | view only |
| **Seeker Config** | `seeker_config.view`, `seeker_config.edit`, `seeker_config.manage_compliance` | all on | view+edit | off |
| **Invitations** | `invitations.view`, `invitations.send`, `invitations.manage_reviewers` | all on | all on | off |
| **Content** | `content.view_questions`, `content.manage_questions`, `content.view_tags`, `content.manage_tags` | all on | all on | off |

Total: 19 new permission keys x 3 tiers = 57 new rows in `tier_permissions`.

Note: Compliance items (Export Control, Data Residency, Blocked Domains) are folded into `seeker_config.manage_compliance` since they are a sub-section of Seeker Config.

### File changes

#### 1. `src/pages/admin/permissions/PermissionsManagementPage.tsx`
- Add 5 new entries to `PERMISSION_CATEGORIES` array with the keys above
- Add matching `CardDescription` entries for each new category

#### 2. `src/components/admin/AdminSidebar.tsx`
Replace hardcoded tier checks with `hasPermission()` calls:

```
Taxonomy Management:  canSeeTeamManagement → hasPermission('taxonomy.view')
Interview Setup:      canSeeTeamManagement → hasPermission('interview.view')
Seeker Config:        canSeeSeekerConfig   → hasPermission('seeker_config.view')
Compliance items:     effectiveSupervisor  → hasPermission('seeker_config.manage_compliance')
Invitations:          canSeeTeamManagement → hasPermission('invitations.view')
Content:              canSeeTeamManagement → hasPermission('content.view_questions')
```

#### 3. Database migration (new SQL file)
Seed 57 rows into `tier_permissions` with `ON CONFLICT DO NOTHING` to be idempotent.

### What stays unchanged
- Verification section items (already use `effectiveSupervisor` which maps to existing `verification.*` / `supervisor.*` keys)
- Marketplace section (already has permission keys)
- Master Data (just added)
- Team Management visibility (stays `canSeeTeamManagement` — governed by `admin_management.*` keys)
- Org Approvals visibility (stays visible to all tiers — governed by `org_approvals.*` keys)
- "Other" section: Settings, Test items, My Profile — these are utility/dev items, not feature access
- All DB triggers, RLS, and audit log logic

### Technical notes
- The `hasPermission()` function from `useAdminTier()` is already available and used for Master Data
- No new hooks or components needed
- The migration uses `ON CONFLICT DO NOTHING` so re-running is safe

