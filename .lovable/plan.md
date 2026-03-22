

# Plan: Add Taxonomy Cascade to CR/CA Spec Review & Ensure Data Pass-Through

## What This Solves

1. **Data pass-through**: Industry Segment selected by AM/RQ is currently stored in `eligibility` JSON but not displayed to or editable by the CR/CA on the AISpecReviewPage.
2. **Missing taxonomy fields**: CR/CA needs to optionally refine Proficiency Level, Sub Domains, and Specialities to guide role assignments (CU, ID) downstream.
3. **Assignment matching**: The `autoAssignChallengeRole` function already supports taxonomy-based matching — we just need to persist the CR/CA's taxonomy selections and pass them when assigning CU and ID roles.

## Current Data Flow

```text
AM/RQ Intake → challenge.eligibility = { industry_segment_id, sub_domain_ids, ... }
            → autoAssignChallengeRole(CR) using industry_segment_id

CR/CA Spec Review → NO taxonomy fields shown
                  → Phase advance → LC → CU → ID
                     (CU/ID assigned without taxonomy refinement from CR)
```

## Target Data Flow

```text
AM/RQ Intake → challenge.eligibility = { industry_segment_id, ... }
            → autoAssignChallengeRole(CR)

CR/CA Spec Review → Shows industry_segment (read-only, from AM/RQ)
                  → CR/CA selects: Proficiency Areas (optional)
                  →                Sub Domains (optional)
                  →                Specialities (optional)
                  → Saves to eligibility JSON
                  → Phase advance triggers autoAssignChallengeRole(CU, ID)
                    using the refined taxonomy
```

## Changes

### 1. AISpecReviewPage.tsx — Add Taxonomy Section

Add a "Domain Targeting" card below the AM Brief Reference Panel showing:
- **Industry Segment**: Read-only display (pre-filled from AM/RQ's `eligibility.industry_segment_id`). Fetches segment name from `useIndustrySegmentOptions`.
- **Proficiency Areas**: Optional multi-select using `useTaxonomyCascade`. "Not selected" = ALL.
- **Sub Domains**: Optional multi-select, filtered by selected proficiency areas. "Not selected" = ALL.
- **Specialities**: Optional multi-select, filtered by selected sub domains. "Not selected" = ALL.

State managed via local `useState` arrays, saved alongside other fields on "Approve & Continue" / "Confirm & Submit".

On submit, these are merged into the `eligibility` JSON:
```typescript
eligibility: {
  ...existingEligibility,
  proficiency_area_ids: selectedProfAreas,
  sub_domain_ids: selectedSubDomains,
  speciality_ids: selectedSpecialities,
}
```

### 2. AISpecReviewPage.tsx — Trigger CU/ID Auto-Assignment on Phase Advance

In `handleConfirmSubmit` and `handleApproveAndContinue`, after advancing to Phase 2, call `autoAssignChallengeRole` for CU and ID roles using the taxonomy selections:

```typescript
const industrySegmentId = eligibility?.industry_segment_id;
if (industrySegmentId) {
  await autoAssignChallengeRole({
    challengeId, roleCode: 'CU',
    industrySegmentId,
    proficiencyAreaIds: selectedProfAreas,
    subDomainIds: selectedSubDomains,
    specialityIds: selectedSpecialities,
    assignedBy: user.id,
  });
  await autoAssignChallengeRole({
    challengeId, roleCode: 'ID',
    industrySegmentId,
    proficiencyAreaIds: selectedProfAreas,
    subDomainIds: selectedSubDomains,
    specialityIds: selectedSpecialities,
    assignedBy: user.id,
  });
}
```

### 3. useChallengeDetail — Include `extended_brief` in Select

Add `extended_brief` to the select query so taxonomy data stored in `eligibility` is available to the spec review page (already selecting `eligibility` — just need to parse it).

### 4. Display in Both QUICK and STRUCTURED Modes

The taxonomy card renders in both governance modes, always below the AM Brief panel and above the spec sections.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Add taxonomy cascade UI + auto-assign CU/ID on phase advance |
| `src/hooks/queries/useChallengeForm.ts` | Add `extended_brief` to select if missing |

## Notes

- No schema changes needed — `eligibility` is already a JSONB column that stores `industry_segment_id`, `sub_domain_ids`, etc.
- The `useTaxonomyCascade` hook is already battle-tested in StepProviderEligibility and CogniSubmitRequestPage.
- "Not selected" for optional fields means ALL — matching the existing pool member assignment logic where empty arrays = all.

