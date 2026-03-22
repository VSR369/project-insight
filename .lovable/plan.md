

# Plan: Add Taxonomy Cascade to CR/CA Spec Review & Ensure Data Pass-Through

## Status: IMPLEMENTED ✅

## What Was Done

### 1. useChallengeDetail — extended_brief added ✅
- Added `extended_brief` to the SELECT query and `ChallengeDetail` interface

### 2. DomainTargetingCard component created ✅
- New component at `src/components/cogniblend/spec/DomainTargetingCard.tsx`
- Industry Segment displayed read-only (from AM/RQ's eligibility JSON)
- Proficiency Areas, Sub Domains, Specialities as optional multi-select checklists
- Uses `useTaxonomyCascade` hook for cascading filters
- "Not selected" = ALL (shown with badge)

### 3. AISpecReviewPage updated ✅
- Parses `eligibility` JSON from challenge to extract `industry_segment_id`
- Added taxonomy state: `selectedProfAreaIds`, `selectedSubDomainIds`, `selectedSpecialityIds`
- DomainTargetingCard rendered in BOTH Quick and Structured modes
- On submit (both `handleConfirmSubmit` and `handleApproveAndContinue`):
  - Taxonomy selections merged into `eligibility` JSONB
  - Auto-assigns CU and ID roles via `autoAssignChallengeRole` using refined taxonomy

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/queries/useChallengeForm.ts` | Added `extended_brief` to select + interface |
| `src/components/cogniblend/spec/DomainTargetingCard.tsx` | NEW — taxonomy cascade card |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Added domain targeting UI + CU/ID auto-assignment |
