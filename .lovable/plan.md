

# Plan: Rearrange "Expand Challenge Details" Section

## Changes (1 file)

**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`**

1. **Move the Expand Challenge Details block** (lines 639-718) from its current position (between Expected Outcomes and Maturity Level) to **after Supporting Files** (after line 830, before the Actions/Generate button section).

2. **Default to collapsed**: Change `useState(true)` to `useState(false)` on line 259.

3. **Restyle the trigger heading** — make it prominent with red color and larger font:
   - Change `text-sm font-semibold text-foreground` → `text-lg font-bold text-destructive`
   - Change the "(optional — recommended)" badge to also use `text-destructive/70` styling
   - Increase the chevron icon to `h-5 w-5 text-destructive`

## Result

The form order becomes: Template → Problem → Expected Outcomes → Maturity → Prize → Deadline → Supporting Files → **Expand Challenge Details** (collapsed, red heading) → Generate with AI button.

