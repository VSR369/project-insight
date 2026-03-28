

# Remove Effort Level Section Completely

Effort level is redundant — complexity assessment already covers this concern. This plan removes `effort_level` from the curation UI, AI review pipeline, and all supporting configuration.

## Changes

### 1. Remove from Section Format Config
**File:** `src/lib/cogniblend/curationSectionFormats.ts`
- Delete the `effort_level` entry from `SECTION_FORMAT_CONFIG`
- Remove `'effort_level'` from `aiUsesContext` arrays in `submission_deadline` and any other sections referencing it

### 2. Remove from AI Review Triage
**File:** `supabase/functions/triage-challenge-sections/index.ts`
- Remove `"effort_level"` from the `ALL_SECTIONS` array (line 91)
- Remove the `effort_level` context line from `buildChallengeContext()` (line 139)
- Remove `effort_level` from the `.select()` column list (line 350)

### 3. Remove from Refine Edge Function
**File:** `supabase/functions/refine-challenge-section/index.ts`
- Remove `"effort_level"` from the sections set (line 32)
- Remove `effort_level` from the format map (line 43)

### 4. Remove from Generate Spec Edge Function
**File:** `supabase/functions/generate-challenge-spec/index.ts`
- Remove `effort_level` from the prompt instructions, JSON schema, output mapping, and cleanup

### 5. Remove from Store Sync & Hydration
**File:** `src/hooks/useCurationStoreSync.ts`
- Remove `effort_level: 'effort_level'` from `SECTION_DB_FIELD_MAP`

**File:** `src/hooks/useCurationStoreHydration.ts`
- Remove `effort_level` from the type interface, hydration field map, and select query

### 6. Remove from Challenge Wizard
**File:** `src/components/cogniblend/challenge-wizard/StepRewards.tsx`
- Remove the `EFFORT_LEVELS` constant, the `effortLevel` watch, `rewardGuidance`, and the entire Effort Level radio group UI block

**File:** `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts`
- Remove `effort_level` from the Zod schema

**File:** `src/components/cogniblend/challenge-wizard/useFormCompletion.ts`
- Remove `'effort_level'` from required fields in CONTROLLED mode (Step 3)

**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx`
- Remove `effort_level` from the save payload (line 405) and step field list (line 808)

### 7. Remove from Settings Panel & Spec Review
**File:** `src/components/cogniblend/spec/ChallengeSettingsPanel.tsx`
- Remove the Effort Level radio group and its `effortLevel` prop

**File:** `src/pages/cogniblend/AISpecReviewPage.tsx`
- Remove `effortLevel` prop passing (lines 1614, 1847)

### 8. Remove from Query Hook
**File:** `src/hooks/queries/useChallengeForm.ts`
- Remove `effort_level` from the type interface and `.select()` query

### 9. Clean Up Supporting Files
**File:** `src/hooks/mutations/useGenerateChallengeSpec.ts` — Remove `effort_level` from the spec type

**File:** `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` — Remove `effort_level` from the legacy type

**File:** `src/components/cogniblend/spec/ExtendedBriefPreview.tsx` — Remove `effort_level` from props type

**File:** `src/components/cogniblend/challenge-wizard/__tests__/useFormCompletion.test.ts` — Remove from test expectations

### 10. Prompt Templates
**File:** `src/lib/aiReviewPromptTemplate.ts` — Remove `effort_level` / `radio` format references if present

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts` — Same cleanup

## Files Changed (17 files)

| File | Change |
|------|--------|
| `src/lib/cogniblend/curationSectionFormats.ts` | Delete `effort_level` entry, remove from `aiUsesContext` |
| `supabase/functions/triage-challenge-sections/index.ts` | Remove from sections list, context builder, select |
| `supabase/functions/refine-challenge-section/index.ts` | Remove from sections set and format map |
| `supabase/functions/generate-challenge-spec/index.ts` | Remove from prompt, schema, output, cleanup |
| `src/hooks/useCurationStoreSync.ts` | Remove from DB field map |
| `src/hooks/useCurationStoreHydration.ts` | Remove from type, hydration map, select |
| `src/hooks/queries/useChallengeForm.ts` | Remove from type and select |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Remove from spec type |
| `src/components/cogniblend/challenge-wizard/StepRewards.tsx` | Remove effort level UI block |
| `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Remove from schema |
| `src/components/cogniblend/challenge-wizard/useFormCompletion.ts` | Remove from required fields |
| `src/pages/cogniblend/ChallengeWizardPage.tsx` | Remove from payload and step fields |
| `src/components/cogniblend/spec/ChallengeSettingsPanel.tsx` | Remove effort level radio group |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Remove effortLevel prop |
| `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` | Remove from type |
| `src/components/cogniblend/spec/ExtendedBriefPreview.tsx` | Remove from props type |
| `src/components/cogniblend/challenge-wizard/__tests__/useFormCompletion.test.ts` | Update test |

The `RadioSectionRenderer` component itself is kept — it may be used by future radio-format sections. Only `effort_level` references are removed.

