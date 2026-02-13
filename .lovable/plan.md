
# Fix: Remove Remaining AdminLayout Wrappers from 14 Admin Pages

## Root Cause

The previous refactor created `AdminShell` as a persistent layout for all `/admin/*` routes, but **14 pages were not updated** and still wrap themselves in `<AdminLayout>`. This component renders a **second** `SidebarProvider`, `AdminSidebar`, `AdminHeader`, and `<main>` — creating a nested double-layout inside the shell.

This causes:
- **Empty space on the left**: The inner `AdminLayout` renders a second sidebar that competes with the shell's sidebar
- **Sidebar scroll jumping to top**: The inner sidebar remounts on every navigation, resetting scroll position
- **Slow/jumpy content display**: The browser has to render two complete layout trees, causing visible thrashing

## Pages That Still Need Fixing (14 files)

| # | File | Current Wrapper |
|---|------|----------------|
| 1 | `src/pages/admin/capability-tags/CapabilityTagsPage.tsx` | `<AdminLayout title="Capability Tags" ...>` |
| 2 | `src/pages/admin/invitations/InvitationsPage.tsx` | `<AdminLayout title="Solution Provider Invitations" ...>` |
| 3 | `src/pages/admin/invitations/PanelReviewerInvitationsPage.tsx` | `<AdminLayout title="Panel Reviewer Invitations" ...>` |
| 4 | `src/pages/admin/reviewer-approvals/ReviewerApprovalsPage.tsx` | `<AdminLayout title="Reviewer Management" ...>` |
| 5 | `src/pages/admin/interview-requirements/InterviewRequirementsPage.tsx` | `<AdminLayout title="Quorum Requirements" ...>` |
| 6 | `src/pages/admin/reviewer-availability/ReviewerAvailabilityPage.tsx` | `<AdminLayout>` (no title) |
| 7 | `src/pages/admin/interview-kit/InterviewKitPage.tsx` | `<AdminLayout title=...>` |
| 8 | `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx` | `<AdminLayout title=...>` |
| 9 | `src/pages/admin/question-bank/QuestionBankPage.tsx` | `<AdminLayout title=...>` |
| 10 | `src/pages/admin/academic-taxonomy/AcademicTaxonomyPage.tsx` | `<AdminLayout title=...>` |
| 11 | `src/pages/admin/proficiency-taxonomy/ProficiencyTaxonomyPage.tsx` | `<AdminLayout title=...>` |
| 12 | `src/pages/admin/level-speciality-map/LevelSpecialityMapPage.tsx` | `<AdminLayout title=...>` |
| 13 | `src/pages/admin/SaasAgreementPage.tsx` | `<AdminLayout title=...>` |
| 14 | `src/pages/admin/RegressionTestKitPage.tsx` | `<AdminLayout title=...>` |

## What Changes for Each File

Each page will have the same transformation applied:

**Before:**
```tsx
import { AdminLayout } from "@/components/admin";
// ...
return (
  <AdminLayout title="Page Title" description="..." breadcrumbs={[...]}>
    {/* page content */}
  </AdminLayout>
);
```

**After:**
```tsx
// AdminLayout import removed
// ...
return (
  <>
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
      <p className="text-muted-foreground mt-1">Description text</p>
    </div>
    {/* page content */}
  </>
);
```

The `AdminLayout` import is removed, the wrapper is replaced with a fragment containing an inline page header (title + description). The sidebar, header, and main content area are already provided by `AdminShell`.

## Expected Results

- No more double sidebar or empty space on the left
- Sidebar scroll position preserved when clicking any menu item
- Instant content swap on navigation (no layout remounting)
- All 30+ admin pages now render consistently inside the single `AdminShell`
