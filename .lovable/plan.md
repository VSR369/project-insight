

# Plan: Taxonomy-Based Auto-Assignment + AM Approval Gate in Curation

## Status: IMPLEMENTED ✅

## What Was Done

### 1. Industry Segment Mandatory for RQ (AGG) ✅
- `aggSchema` updated: `industry_segment_id` is now `z.string().min(1)` (mandatory)
- Industry Segment dropdown added to RQ form after Template Selector
- Loading state waits for `segmentsLoading` for both models

### 2. Auto-Assignment Hook Created ✅
- New file: `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`
- Queries `platform_provider_pool` for best-fit member by role code
- Matching: Industry (MUST) → Proficiency (opt) → Sub-Domain (opt) → Speciality (opt)
- Ranks by match score (specificity) then workload (fewest current_assignments)
- Inserts into `challenge_role_assignments` + `user_challenge_roles`
- Logs audit trail with `ROLE_AUTO_ASSIGNED` action

### 3. Submission Flow Updated ✅
- `architectId` removed from `SubmitPayload` and `DraftPayload`
- Manual architect picker replaced with `autoAssignChallengeRole()` for CR role
- Auto-assignment triggered after challenge creation using `industrySegmentId`

### 4. AM Approval Gate in Curation ✅
- `CurationActions` now accepts `operatingModel` prop
- **MP model**: Button says "Send to Account Manager for Approval"
  - Sets `phase_status = 'AM_APPROVAL_PENDING'`
  - Sends notification to AM user
- **AGG model**: Button says "Submit to Innovation Director" (unchanged flow)
- `CurationReviewPage` passes `operating_model` to CurationActions

### 5. Seeding Data Panels ✅
- **CurationReviewPage**: Collapsible "Original Brief from AM/RQ" accordion with problem statement, budget, timeline (read-only)
- **ApprovalReviewPage**: Card with "Original Brief from AM/RQ" showing same seeding data chain

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Mandatory industry_segment_id in AGG, removed architectId from payload |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | **New** — taxonomy-based pool matching |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Auto-assign CR, removed manual architectId |
| `src/components/cogniblend/curation/CurationActions.tsx` | MP: AM approval gate; AGG: direct to ID |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Seeding data panel + operatingModel prop pass |
| `src/pages/cogniblend/ApprovalReviewPage.tsx` | Seeding data panel |
