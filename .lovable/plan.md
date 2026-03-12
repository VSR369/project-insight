

# Org Name Always Visible in Header

## Analysis

The org name IS in the header code (`OrgHeader.tsx` line 98), but it uses `hidden lg:flex` which hides it below 1024px, and it's styled as a small, subtle text element positioned just before the user avatar — easy to miss.

## Plan

### Make org name always visible and more prominent
**File:** `src/components/org/OrgHeader.tsx`

- Remove the `hidden lg:flex` class so the org name always shows (change to `flex`)
- Add a `Building2` icon before the org name for visual anchoring
- Increase `max-w-[200px]` to `max-w-[250px]` to avoid excessive truncation
- Add a subtle separator or background pill (`bg-muted rounded-md px-2 py-1`) so it stands out as a distinct element in the header
- On small screens (`sm` and below`), truncate more aggressively but still show it

### One file to modify
| File | Change |
|------|--------|
| `src/components/org/OrgHeader.tsx` | Make org name always visible with icon + subtle styling |

