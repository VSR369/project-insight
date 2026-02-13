

# Fix: Slow Admin Page Loading and Sidebar Scroll Jumping

## Root Causes Identified

### Problem 1: Full-Screen Flash on Every Navigation (Slow/Jumpy Loading)

Every admin page is lazy-loaded and wrapped with `LazyRoute`, which uses `Suspense` with `RouteLoadingFallback` -- a **full-screen centered skeleton** that replaces the entire viewport including the sidebar and header:

```
RouteLoadingFallback = full h-screen div with centered skeleton
```

When you click a sidebar item, this sequence happens:
1. The entire screen goes blank (sidebar disappears)
2. The full-screen "Loading..." skeleton shows
3. The lazy chunk loads
4. The new page renders with its own `AdminLayout` (sidebar + header + content)

This causes a visible **flash/jump** because the sidebar unmounts and remounts on every navigation. Even though the chunk loads in milliseconds, the user sees the layout disappear and reappear.

### Problem 2: Sidebar Scroll Position Resets to Top

Each admin page renders its own `<AdminLayout>` which creates a fresh `<SidebarProvider>` and `<AdminSidebar>`. On every route change, the sidebar component is fully unmounted and remounted, which resets its scroll position to the top. If you had scrolled down to "Shadow Pricing" in the Seeker Config section, clicking it navigates to a new route, remounts the sidebar, and you're back at the top.

## Solution

### Fix 1: Shared Admin Layout Route (Prevents Sidebar Remounting)

Instead of each page independently rendering `AdminLayout`, create a **parent route layout** for all `/admin/*` routes. The sidebar and header render once and stay mounted; only the content area swaps via React Router's `<Outlet>`.

**Architecture change:**

```text
BEFORE (current - broken):
  /admin/countries  -> LazyRoute -> CountriesPage -> AdminLayout -> Sidebar + Content
  /admin/base-fees  -> LazyRoute -> BaseFeesPage  -> AdminLayout -> Sidebar + Content
  (sidebar remounts on every navigation)

AFTER (fixed):
  /admin/*  -> AdminGuard -> AdminShell (Sidebar + Header + Outlet)
    /admin/countries  -> Suspense -> CountriesPage (content only)
    /admin/base-fees  -> Suspense -> BaseFeesPage  (content only)
  (sidebar stays mounted, only content area changes)
```

### Fix 2: Move Suspense Inside the Layout

Instead of wrapping the entire page with `Suspense` (which flashes the full-screen fallback), place the `Suspense` boundary inside the content area only. The fallback becomes a content-area skeleton, not a full-screen takeover.

### Fix 3: Remove AdminLayout from Individual Pages

Each admin page currently wraps itself in `<AdminLayout>`. After the shared shell is in place, pages will just return their content directly (title, breadcrumbs passed as route metadata or kept inline without the layout wrapper).

## Files to Change

| # | File | Action |
|---|------|--------|
| 1 | `src/components/admin/AdminShell.tsx` | **New** -- Shared layout with Sidebar + Header + `<Outlet>` with Suspense |
| 2 | `src/App.tsx` | **Modify** -- Nest all `/admin/*` routes under a parent route using `AdminShell` |
| 3 | All admin pages (~25 files) | **Modify** -- Remove `<AdminLayout>` wrapper, return content directly |

## Technical Details

### New File: `AdminShell.tsx`

This component renders the sidebar and header once, with a `Suspense`-wrapped `<Outlet>` for the content area. The Suspense fallback is a **content-area skeleton** (not full-screen), so the sidebar stays visible during loading.

```text
AdminShell
  +-- SidebarProvider (mounted once, never remounts)
  |   +-- AdminSidebar (scroll position preserved)
  |   +-- SidebarInset
  |       +-- AdminHeader
  |       +-- <main>
  |           +-- Suspense fallback={ContentSkeleton}
  |               +-- <Outlet /> (only this swaps on navigation)
```

### App.tsx Route Structure Change

```text
BEFORE:
  <Route path="/admin" element={<AdminGuard><LazyRoute><AdminDashboard /></LazyRoute></AdminGuard>} />
  <Route path="/admin/master-data/countries" element={<AdminGuard><LazyRoute><CountriesPage /></LazyRoute></AdminGuard>} />
  ... (30+ individual routes)

AFTER:
  <Route path="/admin" element={<AdminGuard><AdminShell /></AdminGuard>}>
    <Route index element={<Suspense><AdminDashboard /></Suspense>} />
    <Route path="master-data/countries" element={<Suspense><CountriesPage /></Suspense>} />
    ... (nested under shared shell)
  </Route>
```

### Admin Page Changes (all ~25 pages)

Each page changes from:
```tsx
return (
  <AdminLayout title="Countries" breadcrumbs={[...]}>
    <DataTable ... />
  </AdminLayout>
);
```

To:
```tsx
return (
  <>
    <div className="mb-6">
      <h1 className="text-2xl font-bold">Countries</h1>
    </div>
    <DataTable ... />
  </>
);
```

Or alternatively, keep a lightweight `AdminPageHeader` component for title/breadcrumbs without the layout wrapper.

## Expected Results

- Clicking any admin sidebar item will instantly show the new page content without the sidebar/header disappearing
- Sidebar scroll position will be preserved across navigations
- The loading skeleton (if any) will only appear in the content area, not full-screen
- Overall perceived performance will be significantly faster since no layout remounting occurs

