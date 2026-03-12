

# Fix MSME Quick Assign Modal: Domain Scope on All Tabs + Dynamic Tab Label

## Issues

1. **Domain Taxonomy selector only appears under "Myself" tab** — it should appear at the bottom of all 3 tabs (New User, Existing Team Member too)
2. **"New User (Invite)" tab label is static** — it should reflect the Direct/Invite toggle (e.g., "New User (Direct)" when Direct is selected)

## Changes

**File:** `src/components/rbac/MsmeQuickAssignModal.tsx`

### 1. Move Domain Taxonomy out of per-tab content
Extract the `Collapsible` domain taxonomy block (lines 283-300) from inside the "myself" tab and place it **after** the tab content section but still inside the scrollable area — so it appears at the bottom of whichever tab is active.

### 2. Add Domain Taxonomy to New User and Existing tabs
- For **New User** tab: add the same `Collapsible` + `ScopeMultiSelect` after the `RoleSelectionSection` (after line 339, inside the form)
- For **Existing Team Member** tab: add it after the `RoleSelectionSection` when a member is selected (after line 403)

Since all 3 tabs share the same `domainScope` state, the simplest approach is to extract the domain taxonomy block out of the per-tab conditional and render it once at the bottom of the scrollable area, visible regardless of which tab is active.

### 3. Dynamic tab label for "New User"
Change the static label map (line 224):
```typescript
// Before
const labels = { myself: "Myself", new_user: "New User (Invite)", existing: "Existing Team Member" };

// After  
const labels = { myself: "Myself", new_user: `New User (${enrollMode === "direct" ? "Direct" : "Invite"})`, existing: "Existing Team Member" };
```

### Summary of edits
| Location | Change |
|----------|--------|
| Line 224 | Make `new_user` label dynamic based on `enrollMode` |
| Lines 283-300 | Remove domain taxonomy from inside "myself" tab |
| After line 406 (end of tab content div) | Add shared domain taxonomy section that renders for all tabs |

