

# Current State of MSME Quick Assign — Domain Scope

## What exists today

The **MSME Quick Assign** modal (`MsmeQuickAssignModal.tsx`) currently has:

1. **3 tabs**: Myself / New User / Existing Team Member
2. **Role selection**: Checkboxes for all applicable aggregator roles with Select All / Clear
3. **Assignment modes**: Direct (immediate) or Invite (token-based)
4. **Domain Taxonomy section**: A collapsible labeled "Domain Taxonomy (Optional)" that contains **only a placeholder message**:
   > *"Domain taxonomy selectors will cascade here when industry data is available."*

**In short — domain scope selection is NOT implemented.** Every quick-assign today creates assignments with **no domain scope at all**, which defaults to ALL domains. There is no cascading industry → proficiency area → sub-domain → speciality picker in this modal.

This is why it's confusing — the UI implies domain scoping is possible (the collapsible exists) but it does nothing.

## Proposed Fix

Replace the placeholder with a real domain scope selector, reusing the existing `ScopeMultiSelect` pattern already used in the Delegated Admin forms.

### Changes

| File | What |
|------|------|
| `MsmeQuickAssignModal.tsx` | Replace the placeholder collapsible (lines 277-289) with the real 4-level cascading taxonomy selector (Industry → Proficiency Area → Sub-domain → Speciality) using `ScopeMultiSelect` components. Add "ALL" toggles at each level per existing convention. Store selected scope as a `domain_scope` JSONB object alongside the role assignments. |
| `useRoleAssignments.ts` (or bulk create hook) | Pass `domain_scope` through to the assignment insert so it's persisted on `org_role_assignments.domain_scope` |

### Behavior

- Each taxonomy level has an "All" toggle (on by default for quick assign, matching MSME intent)
- Toggling "All" off reveals the multi-select picker for that level
- The scope cascades: selecting an Industry filters Proficiency Areas, etc.
- The resulting `domain_scope` JSON is saved with each role assignment
- Default remains ALL (empty arrays) — so existing behavior is preserved unless the admin narrows scope

### Scope kept minimal

- Reuses existing `ScopeMultiSelect` / taxonomy hooks already in the codebase
- No new DB changes needed — `domain_scope` column already exists on assignments
- Only the modal UI and the assignment mutation payload change

