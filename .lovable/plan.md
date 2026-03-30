

# Organization Details as Tab 0 in Progress Strip

## Summary

Move the `OrgContextPanel` from its current inline accordion position into the wave-based tab system as **Tab 0 ("Organization")** — the first tab in the progress strip, before Foundation. On page load, it defaults as the active tab. Clicking "Next" or any other tab navigates normally.

## Changes

### 1. Modify `GROUPS` array in `CurationReviewPage.tsx`

Add a new group at index 0:

```typescript
{
  id: "organization",
  label: "0. Organization",
  icon: "🏢",
  colorDone: "bg-purple-100 text-purple-800 border-purple-300",
  colorActive: "bg-purple-50 border-purple-400",
  colorBorder: "border-purple-200",
  sectionKeys: [],  // No curation sections — uses custom panel
  prerequisiteGroups: [],
}
```

### 2. Update Progress Strip grid

Change from `lg:grid-cols-6` to `lg:grid-cols-7` to accommodate the new tab.

### 3. Render OrgContextPanel when `activeGroup === "organization"`

In the main content area (left 3/4 panel), when the organization tab is active, render the `OrgContextPanel` component instead of the section accordion. The right rail can show a simplified info card explaining why org context matters for AI quality.

### 4. Handle progress for the organization tab

Since this tab has no curation sections, compute its "done" status based on whether the org has at least a name + one enrichment field filled (website, description, or an uploaded doc). Show 0/1 or 1/1 progress.

### 5. Remove inline OrgContextPanel

Remove the current inline rendering of `OrgContextPanel` between the header and Original Brief accordion (lines ~2901-2907).

### 6. Default active tab

Change the initial `activeGroup` state from `"foundation"` to `"organization"` so the curator lands on org context first.

### 7. Adjust `OrgContextPanel` layout

Remove the accordion wrapper inside the component — since it now occupies the full content area, it should render as a flat card layout matching the visual style of other wave tabs.

## Files Modified

- `src/pages/cogniblend/CurationReviewPage.tsx` — Add org group, update grid, conditional rendering, default tab, remove inline panel
- `src/components/cogniblend/curation/OrgContextPanel.tsx` — Remove accordion wrapper, render as flat card content

