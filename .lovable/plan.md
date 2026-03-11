

# MOD-02: Solution Requests Queue & Assignment History

## What We're Building

Two new screens for the Marketplace module, matching the uploaded Figma references:

1. **Solution Requests Queue** (SCR-04) — Table listing pending Marketplace challenges with org name, challenge title, domain tags, submitted date, and status (Pending Assignment / Assigned / Blocked + Core Roles Missing).
2. **Assignment History** (SCR-06/07) — Per-challenge detail page showing the assigned team members with their roles, domain tags, availability status, and Reassign action buttons.

## Existing Infrastructure

- `challenge_role_assignments` table exists with: `challenge_id`, `pool_member_id`, `role_code`, `status`, `assigned_by`, `assigned_at`, `reassignment_reason`, `replaced_by`
- `platform_provider_pool` table has: `full_name`, `role_codes`, `domain_scope`, `availability_status`, `current_assignments`, `max_concurrent`
- `challenges` table has: `title`, `status`, `organization_id`, `engagement_model_id`, `created_at`
- Routes exist for `/admin/marketplace` and `/admin/marketplace/resource-pool`
- Sidebar has Marketplace group (senior_admin+)
- `md_slm_role_codes` master data is already used by the pool member form

## Plan

### 1. Data Hooks — `src/hooks/queries/useSolutionRequests.ts`

- `useSolutionRequests()` — Fetches challenges with `engagement_model_id` matching Marketplace model, joined with organizations for org name. Returns: id, title, org name, domain tags (from challenge industry tags or challenge metadata), submitted_at, status.
- `useChallengeAssignments(challengeId)` — Fetches `challenge_role_assignments` for a specific challenge, joined with `platform_provider_pool` to get member name, role codes, availability status, and domain scope industry names.
- `useChallengeAssignmentStatus(challengeId)` — Derives assignment status: checks if all 4 role categories are filled (R3 ×1, R5_MP ×1, R6_MP ×1, R7_MP ×2).
- `useCheckCoreRoles(organizationId)` — Checks if the org has active R2/R8/R9 core roles (via `role_assignments` table if it exists, or a simple status derivation). Returns missing core roles list for the "Blocked / Core Roles Missing" status badge.

### 2. Solution Requests Page — `src/pages/admin/marketplace/SolutionRequestsPage.tsx`

- Breadcrumb: "Platform Admin > Solution Requests"
- Link to "View Assignment History" (top-right)
- Card with title "Pending Marketplace Requests"
- Table columns (uppercase headers per admin UI standard):
  - **Organisation Name** — from joined org data
  - **Challenge Title** — challenge.title
  - **Domain Tags** — industry segment badges (outline style)
  - **Submitted At** — formatted date
  - **Status** — Badge: "Pending Assignment" (green outline), "Assigned" (green solid), "Blocked" (red) + "Core Roles Missing" (amber/red pill) stacked
- Click row → navigate to assignment detail
- Empty state and loading skeletons

### 3. Assignment History Page — `src/pages/admin/marketplace/AssignmentHistoryPage.tsx`

- Breadcrumb: "Platform Admin > Assignment History"
- Lists challenges that have assignments, expandable per challenge
- Per challenge card:
  - Title + org name (header)
  - "Assigned by" + admin name + timestamp (top-right)
  - **Team Members** section listing each assigned pool member:
    - Name (bold)
    - Role code label (e.g., "Challenge Architect (R3)") + domain tag (e.g., "Healthcare")
    - Availability badge (Available/Partially Available/Fully Booked) using existing `AvailabilityBadge` component
    - "Reassign" text button (opens reassignment modal)

### 4. Reassignment Modal — `src/components/admin/marketplace/ReassignmentModal.tsx`

- Shows current assignee (greyed out), role, challenge
- Pool member search dropdown filtered by same role + availability
- Reason text area (required, min 10 chars, max 500 — per `reassignmentSchema`)
- Save: Updates old assignment status to "Reassigned", inserts new Active row
- Zod validation per tech spec

### 5. Sidebar & Routing Updates

**`src/components/admin/AdminSidebar.tsx`:**
- Add "Solution Requests" menu item under Marketplace group: `/admin/marketplace/solution-requests`

**`src/App.tsx`:**
- Add routes:
  - `marketplace/solution-requests` → `SolutionRequestsPage`
  - `marketplace/assignment-history` → `AssignmentHistoryPage`

**`src/pages/admin/marketplace/MarketplaceDashboard.tsx`:**
- Remove `comingSoon: true` from "Solution Requests" card

### 6. Validation Schema — `src/lib/validations/challengeAssignment.ts`

```typescript
const challengeAssignmentSchema = z.object({
  challenge_id: z.string().uuid(),
  assignments: z.array(z.object({
    role_code: z.enum(["R3","R5_MP","R6_MP","R7_MP"]),
    pool_member_id: z.string().uuid(),
  }))
  .refine(a => a.filter(x=>x.role_code==="R3").length >= 1, "Challenge Architect required")
  .refine(a => a.filter(x=>x.role_code==="R5_MP").length >= 1, "Challenge Curator required")
  .refine(a => a.filter(x=>x.role_code==="R6_MP").length >= 1, "Innovation Director required")
  .refine(a => a.filter(x=>x.role_code==="R7_MP").length >= 2, "Minimum 2 Expert Reviewers required"),
});

const reassignmentSchema = z.object({
  role_code: z.enum(["R3","R5_MP","R6_MP","R7_MP"]),
  new_pool_member_id: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});
```

## Files Changed

| File | Change |
|---|---|
| `src/hooks/queries/useSolutionRequests.ts` | **New** — hooks for solution requests and challenge assignments |
| `src/pages/admin/marketplace/SolutionRequestsPage.tsx` | **New** — SCR-04 queue page |
| `src/pages/admin/marketplace/AssignmentHistoryPage.tsx` | **New** — SCR-06 history page |
| `src/components/admin/marketplace/ReassignmentModal.tsx` | **New** — SCR-07 reassignment modal |
| `src/lib/validations/challengeAssignment.ts` | **New** — Zod schemas per tech spec |
| `src/App.tsx` | Add 2 routes for solution-requests and assignment-history |
| `src/components/admin/AdminSidebar.tsx` | Add "Solution Requests" menu item |
| `src/pages/admin/marketplace/MarketplaceDashboard.tsx` | Remove comingSoon from Solution Requests card |

