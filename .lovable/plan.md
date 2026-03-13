

# Plan: Fix `depth=1` Override — Enforce Actual Tier

## Problem
`depth === 1` grants every admin Supervisor privileges. Must be removed from 3 files so access is strictly based on `admin_tier`.

## Changes

### 1. `src/components/admin/AdminSidebar.tsx` (lines 137-140)
```typescript
// FROM:
const effectiveSupervisor = isSupervisor || depth === 1;
const canSeeTeamManagement = effectiveSupervisor || isSeniorAdmin;
const canSeeSeekerConfig = effectiveSupervisor || isSeniorAdmin;

// TO:
const effectiveSupervisor = isSupervisor;
const canSeeTeamManagement = isSupervisor || isSeniorAdmin;
const canSeeSeekerConfig = isSupervisor || isSeniorAdmin;
```

### 2. `src/components/admin/TierGuard.tsx` (lines 39-40)
Remove the depth=1 bypass:
```typescript
// REMOVE:
if (depth === 1) return true;

// REPLACE WITH:
// Depth only controls tier creation availability, not runtime access
```

### 3. `src/pages/admin/platform-admins/PlatformAdminListPage.tsx` (line 63)
```typescript
// FROM:
const effectiveSupervisor = isSupervisor || depth === 1;

// TO:
const effectiveSupervisor = isSupervisor;
```

## Unchanged
- `PlatformAdminForm.tsx` — depth=1 restricts tier dropdown (correct)
- `CreatePlatformAdminPage.tsx` — depth=1 blocks creation (correct)
- `PermissionsManagementPage.tsx` — depth=1 shows only supervisor column (correct)
- All DB/RLS unchanged

