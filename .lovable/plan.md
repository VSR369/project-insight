

# Plan: Remove Redundant Get Started Page & Simplify Flow

## Summary
Remove the `/pulse/get-started` page (PulseGetStartedPage.tsx) since it duplicates content already shown on the Welcome page. Update the ProfileBuildBanner to navigate directly to `/welcome`.

---

## Current Flow (Redundant)
```
Pulse Feed → Click "Get Started" → /pulse/get-started → Click "Let's Build Your Profile" → /welcome
```

## New Flow (Simplified)
```
Pulse Feed → Click "Let's Build Your Profile" → /welcome → /enroll/participation-mode
```

---

## Changes Required

### 1. Update ProfileBuildBanner Navigation
**File:** `src/components/pulse/layout/ProfileBuildBanner.tsx`

| Current | New |
|---------|-----|
| `navigate('/pulse/get-started')` | `navigate('/welcome')` |
| Button text: "Get Started" | Button text: "Let's Build Your Profile" |

---

### 2. Remove `/pulse/get-started` Route from App.tsx
**File:** `src/App.tsx`

- Remove the route definition (lines 601-608):
```tsx
// REMOVE THIS:
<Route
  path="/pulse/get-started"
  element={
    <AuthGuard>
      <PulseGetStartedPage />
    </AuthGuard>
  }
/>
```

- Remove `PulseGetStartedPage` from the import statement at line 93

---

### 3. Remove Page Export
**File:** `src/pages/pulse/index.ts`

- Remove: `export { default as PulseGetStartedPage } from './PulseGetStartedPage';`

---

### 4. Delete the Redundant Page File
**File:** `src/pages/pulse/PulseGetStartedPage.tsx`

- Delete the entire file (it's no longer needed)

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/pulse/layout/ProfileBuildBanner.tsx` | Update navigation to `/welcome`, change button text |
| `src/App.tsx` | Remove route for `/pulse/get-started`, remove import |
| `src/pages/pulse/index.ts` | Remove export of `PulseGetStartedPage` |
| `src/pages/pulse/PulseGetStartedPage.tsx` | **DELETE** |

---

## Technical Notes

1. **Welcome page already has**: The motivational content, "Why Your Profile Matters" section, and "Let's Build Your Profile" CTA that navigates to `/enroll/participation-mode`

2. **No breaking changes**: The `/pulse/get-started` route was only used from the banner, and we're updating that reference

3. **Cleaner user journey**: One less click for users to start building their profile

