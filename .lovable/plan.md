

# Fix: Pre-Flight Falsely Flags Extended Brief Subsections as Empty

## Root Cause

The `handleAIReview` function (line 1725-1738) builds `sectionContents` for the pre-flight check by:
1. Checking the Zustand store
2. Falling back to `(challenge as any)?.[key]`

Step 2 fails for **all 6 extended brief subsections** (`context_and_background`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`) because these are stored inside the `extended_brief` JSONB column, not as top-level fields on the `challenges` table.

The `getSectionContent` helper (line 926) already handles this correctly via `EXTENDED_BRIEF_FIELD_MAP`, but it is never called during pre-flight content assembly.

## Fix — Single change in `CurationReviewPage.tsx`

### Location: Lines 1733-1738 (the fallback branch inside the `sectionContents` builder)

After the existing store/challenge fallback loop, add a second pass that populates any still-missing extended brief subsections from `challenge.extended_brief`:

```typescript
// After the existing loop (line 1738), add:
// Populate extended_brief subsections that aren't top-level challenge fields
const eb = parseJson<any>(challenge.extended_brief);
if (eb) {
  for (const [subKey, jsonbField] of Object.entries(EXTENDED_BRIEF_FIELD_MAP)) {
    if (!sectionContents[subKey]) {
      const val = eb[jsonbField];
      if (val != null) {
        sectionContents[subKey] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    }
  }
}
```

This is ~8 lines. It uses the already-imported `EXTENDED_BRIEF_FIELD_MAP` and `parseJson`, so no new imports needed. It covers all 6 subsections universally — any future subsections added to the map will automatically be included.

## What this fixes
- "Context & Background" false warning disappears when content exists in `extended_brief.context_background`
- All other extended brief subsections (`root_causes`, `affected_stakeholders`, etc.) will also be correctly detected if they are ever added to pre-flight checks
- No changes to `preFlightCheck.ts` needed — the problem is in how data is assembled, not how it is checked

