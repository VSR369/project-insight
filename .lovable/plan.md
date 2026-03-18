

# Plan: Fix Challenge Wizard — Data Integrity, Master Data Integration, and UI Corrections

## Critical Bug: `initialize_challenge` Duplicate Function (BLOCKER)

The network logs show a **300 error** when saving:
```
"Could not choose the best candidate function between:
  public.initialize_challenge(p_org_id, p_title, p_operating_model, p_creator_id),
  public.initialize_challenge(p_org_id, p_creator_id, p_title, p_operating_model)"
```

There are two overloaded versions of `initialize_challenge` in the database with the same parameter types but different ordering. One must be dropped.

**Fix**: SQL migration to drop the duplicate function, keeping only one signature.

---

## Fixes Organized by Wizard Step

### Step 1 — Challenge Brief

**1. Industry Segment: Pull from master data (currently a free-text input)**
- Current: `<Input placeholder="e.g., Automotive..." {...register('industry_segment_id')} />` (StepProblem.tsx L180-183) — a plain text input
- Fix: Replace with a `<Select>` dropdown using `useIndustrySegmentOptions()` hook (already exists in `useTaxonomySelectors.ts`). The hook fetches from `industry_segments` table.

**2. Experience Countries: Pull from master data**
- Current: Free-text input with manual typing (StepProblem.tsx L186-215)
- Fix: Replace with a searchable multi-select dropdown using `useCountries()` hook (already exists in `useMasterData.ts`). Show country name, store country ID.

**3. Domain Tags: Allow multiple custom entries**
- Current: Only allows selecting from 8 hardcoded tags (`DOMAIN_TAGS` array, StepProblem.tsx L58-61)
- Fix: Add a free-text "Add custom tag" input alongside the predefined list, so users can type and add custom domain tags that aren't in the preset list.

### Step 2 — Evaluation Criteria

**4. Weightage must be editable in all modes**
- Current: Lightweight mode hides weight inputs and auto-distributes equally (StepEvaluation.tsx L133-161). Weight column is not shown. Description and rubrics hidden.
- Fix: Show the full 4-column table (Name, Weight, Description, Rubric) in all modes. Keep default values pre-filled but make all fields editable. Remove the "equally weighted" restriction for lightweight mode. The `isLightweight` branching at L133 will be removed.

### Step 5 — Provider Eligibility

**5. Provider Category: Show checkboxes from master data (not fixed "ALL")**
- Current: Shows "All Categories" checkbox + individual modes from `useParticipationModes()`. The issue is the toggle logic — when "All" is checked, individual checkboxes disappear (L373: `{!isAllModes && participationModes.map(...)}`).
- Fix: Always show all participation mode checkboxes. "All Categories" becomes a "Select All" toggle that checks/unchecks all. Individual modes always visible with checkboxes.

**6. Solver Tier: Change from RadioGroup to Checkboxes**
- Current: RadioGroup allowing single selection (StepProviderEligibility.tsx L429-510)
- Fix: Replace `RadioGroup` + `RadioGroupItem` with checkbox list, store as `string[]` in a new schema field or repurpose `solver_eligibility_id` to accept multiple. Since schema has `solver_eligibility_id` as single string, add a new `solver_eligibility_ids: z.array(z.string()).default([])` field, or change the existing field to an array.

**7. Required Expertise Level: Pull from master data, clean up SMOKE_TEST entries, show only level + name**
- Current: Uses `useExpertiseLevels()` which fetches ALL including inactive and smoke test data. The dropdown shows name + description (L624-633).
- Fix: Add `.not('name', 'like', '__SMOKE_TEST_%')` filter to the query. In the SelectItem, show only `level_number` and `name`, remove description display.

**8. Required Proficiencies: Pull from master data (currently free-text chips)**
- Current: `TextChipInput` with manual typing (L641-647)
- Fix: Replace with a searchable multi-select from `proficiency_areas` table using `useAllProficiencyAreas(true)` hook (already exists in `useScopeTaxonomy.ts`).

**9. Required Sub-Domains: Currently only shows when industry segment selected**
- Current: Only renders if `proficiencyAreas.length > 0` (L650), which requires `industrySegmentId` to be set.
- Fix: When no industry segment is selected, use `useAllProficiencyAreas(true)` to show all available sub-domains. Always render the sub-domain section.

**10. Required Specialities: Pull from master data (currently free-text chips)**
- Current: `TextChipInput` with manual typing (L692-699)
- Fix: Replace with searchable multi-select from `specialities` table using `useSpecialitiesBySubDomains()` or a new `useAllSpecialities()` hook. Cascade from selected sub-domains.

**11. Permitted Artifact Types: Add video and audio types**
- Current: `ARTIFACT_TIERS` constant (L49-61) does not include audio types.
- Fix: Add `'Audio Recording'` to poc/prototype/pilot tiers. `'Video Demo'` already exists but add `'Audio Demo'` and `'Audio Narration'` options.

### Step 6 — Templates

**12. Rename "Submission Template" to "Solution Templates"**
- Current label: "Submission Template" (StepTemplates.tsx L76)
- Fix: Rename to "Solution Templates"

**13. Add Solution Category + Description field**
- Add a section for "Solution Category" with description, pulled from master data (a new `solution_categories` concept, or leverage existing `proficiency_areas`). Include a "+Add New" button allowing creators to add categories not in master data.
- Add schema fields: `solution_category_id` (string, optional) and `solution_category_description` (string, optional).

**14. Legal Document Templates: Allow document uploads**
- Current: Legal docs section is display-only with static badges (StepTemplates.tsx L148-184). No upload capability.
- Fix: Add upload buttons for each legal document type:
  - "Challenge Life Cycle Management Terms & Conditions" — new doc type
  - "Non-Disclosure Agreement" — already listed
  - Support model-specific documents (Aggregator vs Marketplace) by reading `operating_model` from form/org context
- Reuse the existing `supabase.storage.from('challenge-assets').upload()` pattern from the submission template upload.

### Step 7 — Review & Submit

**15. Show ALL captured parameters from all tabs**
- Current: Shows a hardcoded subset of fields in 5 sections (StepReviewSubmit.tsx L48-80). Missing: context fields, all eligibility criteria, phase durations, payment milestones, legal docs, targeting filters, etc.
- Fix: Rebuild `StepReviewSubmit` to dynamically iterate all form values from `form.getValues()`. Group by wizard step. Show every filled field. Add "Edit" buttons per section that navigate back to the corresponding step.

### Cross-Cutting: Data Persistence

**16. Fix `initialize_challenge` duplicate function**
- SQL migration: `DROP FUNCTION IF EXISTS public.initialize_challenge(uuid, text, text, uuid);` — drop the older overload, keep the one matching the call signature in `useSubmitSolutionRequest.ts`.

**17. Ensure form data persists across tab navigation**
- Current: Steps use conditional rendering (`{currentStep === 1 && <StepProblem ... />}`), which unmounts components. However, react-hook-form retains values in its store.
- Verify: The `form.getValues()` call in `buildFieldsFromForm` already captures all fields. The issue is likely the `initialize_challenge` 300 error blocking saves. Once the duplicate function is fixed, saves should work.

**18. Ensure all fields from `buildFieldsFromForm` map to DB columns**
- Current `buildFieldsFromForm` (L248-335) constructs the update payload. Verify each field maps to an actual column in the `challenges` table. Fields stored in JSONB (`deliverables`, `reward_structure`, `phase_schedule`) must have correct nested structure.

**19. Storage bucket RLS for document uploads**
- Verify `challenge-assets` bucket has proper RLS policies allowing authenticated users to upload. The network logs show a successful upload (200), so this appears to work. Add RLS for any new legal document uploads.

---

## Implementation Order

1. **DB Migration**: Drop duplicate `initialize_challenge` function (unblocks all saves)
2. **Step 1**: Replace Industry Segment input with Select dropdown from master data
3. **Step 1**: Replace Experience Countries with searchable multi-select from countries table
4. **Step 1**: Add custom domain tag entry alongside predefined tags
5. **Step 2**: Make all evaluation criteria fields editable in all modes (remove lightweight restrictions)
6. **Step 5**: Fix Provider Category to always show checkboxes
7. **Step 5**: Change Solver Tier from radio to checkboxes
8. **Step 5**: Clean up Expertise Levels query (filter SMOKE_TEST, show only level+name)
9. **Step 5**: Replace Proficiencies/Specialities free-text with master data selectors
10. **Step 5**: Always show Sub-Domains section (even without industry segment)
11. **Step 5**: Add audio/video artifact types
12. **Step 6**: Rename to Solution Templates, add solution category, add legal doc uploads
13. **Step 7**: Rebuild Review tab to show all parameters from all tabs
14. **Cross-cutting**: Verify all `buildFieldsFromForm` fields map to DB, ensure RLS allows saves

---

## Files to Modify

| File | Changes |
|------|---------|
| SQL migration (new) | Drop duplicate `initialize_challenge` |
| `StepProblem.tsx` | Industry segment → Select, Countries → multi-select, Domain tags → allow custom |
| `StepEvaluation.tsx` | Remove isLightweight branching, show full table always |
| `StepProviderEligibility.tsx` | Provider checkboxes always visible, Solver tier → checkboxes, Expertise filter, Proficiencies/Sub-domains/Specialities from master data, add audio artifacts |
| `StepTemplates.tsx` | Rename, add solution category section, add legal doc upload |
| `StepReviewSubmit.tsx` | Complete rewrite to show all form fields dynamically |
| `challengeFormSchema.ts` | Add `solver_eligibility_ids`, `solution_category_id`, `solution_category_description` |
| `ChallengeWizardPage.tsx` | Update `buildFieldsFromForm` for new fields, update `getStepFields` |
| `useScopeTaxonomy.ts` | Add `useAllSpecialities()` hook |
| `useExpertiseLevels.ts` | Add SMOKE_TEST filter |

