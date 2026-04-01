

# Restore "Fill Test Data" Button Visibility in Preview

## Problem
The "Fill Test Data" button is gated by `import.meta.env.DEV`, which is `false` in the Lovable preview (production build). The button exists in the code and the seed data is correctly formatted — it's just invisible in the preview.

## Solution
Replace the `import.meta.env.DEV` check with a condition that also works in the Lovable preview environment. Two options:

1. **Use `import.meta.env.MODE !== 'production'`** — still won't work in Lovable preview (also production mode).
2. **Show the button always but styled as a dev/test tool** — simplest and most practical. The button already uses `variant="ghost"` and muted styling, and is clearly labeled as test tooling. Since this is an internal platform in active development, showing it is safe.

**Recommended:** Remove the `import.meta.env.DEV` gate entirely. The button is harmless (only pre-fills form fields) and critical for developer/tester productivity.

## Changes

| File | Change |
|---|---|
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Remove `import.meta.env.DEV &&` wrapper around the Fill Test Data button (line 416). Keep the button styling as-is. |

This is a single-line change — remove the conditional, keep everything else.

