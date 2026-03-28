

# Convert Preferred Approach to Line Items Format

## What changes

Make "Preferred Approach" use the exact same line_items format as "Approaches NOT of Interest" — both in the original display and in AI-generated suggestions.

## Files to change

### 1. `src/lib/cogniblend/curationSectionFormats.ts`
Change `preferred_approach.format` from `'rich_text'` to `'line_items'`.

### 2. `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`
Move `preferred_approach` from the `rich_text` switch case (lines 360-394) into a line_items case alongside `approaches_not_of_interest`. It will use `LineItemsSectionRenderer` with `itemLabel="Approach"` and an empty-state placeholder like: *"Preferred approaches have not been specified — solvers have full freedom to propose any approach."*

### 3. `supabase/functions/refine-challenge-section/index.ts`
- Change `preferred_approach` format from `'rich_text'` to `'line_items'` in `SECTION_FORMAT_MAP`
- Update `EB_FORMAT_INSTRUCTIONS.preferred_approach` to return a JSON array of phrases (matching `approaches_not_of_interest` pattern): `"Return ONLY a valid JSON array of short phrase strings describing preferred approaches. Preserve the seeker's original intent. Max 10 items."`

### 4. `src/lib/aiReviewPromptTemplate.ts` + `supabase/functions/review-challenge-sections/promptTemplate.ts`
- Change `preferred_approach` in `SECTION_FORMAT_MAP` from `'rich_text'` to `'line_items'`
- Update `EXTENDED_BRIEF_FORMAT_INSTRUCTIONS.preferred_approach` to produce a JSON array instead of preserving rich text unchanged

### 5. Edge function redeployment
Redeploy `refine-challenge-section` and `review-challenge-sections`.

## Result
Both "Preferred Approach" and "Approaches NOT of Interest" render identically — numbered line item cards in view mode, editable list inputs in edit mode, and proper JSON array AI suggestions.

