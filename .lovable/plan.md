

# Remove Remaining effort_level References

The previous removal missed 3 files with active `effort_level` code. Here is what remains and how to fix each.

## Files to Change

### 1. `src/pages/cogniblend/CurationReviewPage.tsx`
This is the biggest offender — effort_level is still rendered as a full curation section.

- **Type interface (~line 154):** Remove `effort_level: string | null`
- **Section config (~line 668-677):** Delete the entire `effort_level` object from the sections array (key, label, attribution, dbField, isFilled, render)
- **Category sectionKeys (~line 727):** Remove `"effort_level"` from the Publication & Logistics category array
- **getSectionValue switch (~line 838):** Remove `case "effort_level"` branch
- **`.select()` query (~line 1016):** Remove `effort_level` from the column list
- **fieldToSection map (~line 1257):** Remove `effort_level: 'effort_level'`
- **ALL_SECTIONS array (~line 1452):** Remove `'effort_level'`
- **SINGLE_CODE_MAP (~line 1678):** Remove the `effort_level` entry
- **RadioSectionRenderer usage (~line 2862-2866):** Remove the effort_level rendering block
- **Options switch (~line 2903):** Remove `case "effort_level"` branch
- **Complexity context (~line 2078):** Remove `effort_level: challenge?.effort_level` from the context object passed to complexity assessment

### 2. `src/hooks/cogniblend/useCurationMasterData.ts`
- Delete the `EFFORT_OPTIONS` constant array (~lines 46-51)
- Remove `effortOptions` from the return type interface (~line 37)
- Remove `effortOptions: EFFORT_OPTIONS` from the return object (~line 139)
- Update the JSDoc comment (~line 4) to remove "effort levels"

### 3. `src/components/cogniblend/challenge-wizard/__tests__/useFormCompletion.test.ts`
- Remove `'effort_level'` from the Step 3 expected required fields array (~line 49)

### 4. `src/components/cogniblend/spec/ChallengeSettingsPanel.tsx`
- Update JSDoc comment (~line 3) to remove "Effort Level" mention — it now only shows Deadline and Visibility

### 5. `src/lib/aiReviewPromptTemplate.ts`
- In the `date` format instruction (~line 100), remove the phrase "and effort level" from the calculation guidance text

### 6. `src/components/cogniblend/challenge-wizard/StepRewards.tsx`
- Update JSDoc comment (~line 10) to remove "Effort Level + Reward Guidance" from the numbered list

## No database migration needed
The `effort_level` column stays in the DB (harmless) — we're only removing it from the frontend and AI pipeline. The auto-generated `src/integrations/supabase/types.ts` is managed by Supabase and will retain the column type — this is expected and safe.

## Summary
6 files, all surgical deletions of effort_level references. No new code added.

