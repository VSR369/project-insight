

# Fix Draft Resume — Complete Data Persistence Across Governance Modes

## Root Causes Found

### Bug 1 — Industry Segment never synced to parent on resume
`ChallengeCreatePage.handleDraftModeSync` accepts `(gov, eng)` — no industry segment parameter. When a draft loads, `useCreatorDraftLoader` calls `onDraftModeSync(gov, eng)` but the parent's `industrySegmentId` state stays at org default. The `ChallengeConfigurationPanel` shows the wrong industry.

### Bug 2 — `evaluation_criteria` and `deliverables` missing from DRAFT_COLUMNS
`useCreatorDraftLoader.ts` line 13: `DRAFT_COLUMNS` does not include `evaluation_criteria` or `deliverables`. Lines 98-99 cast `challenge.evaluation_criteria` and `challenge.deliverables` but they were never fetched — always `undefined`. Result: weighted criteria and deliverables are always empty on resume.

### Bug 3 — `hook` field never persisted in drafts
`useCreatorDraftSave.ts` line 60 sets `hook: data.hook` in the base payload, but `DraftPayload` in `solutionRequestPayloads.ts` has NO `hook` field. `buildChallengeUpdatePayload` doesn't write `hook` to the DB. On resume, `hook` is always empty. This breaks CONTROLLED mode which requires the hook field.

### Bug 4 — `weightedCriteria` and `deliverables_list` never included in draft save payload
`useCreatorDraftSave.ts` builds the `base` object (lines 46-61) but never includes `weightedCriteria` or `deliverables_list`. These form fields are silently dropped during Save Draft even though they exist in the form values. The `DraftPayload` type does include `weightedCriteria` but the hook never maps it. `deliverables_list` has no corresponding payload field at all.

### Bug 5 — `onDraftModeSync` callback type too narrow
The callback type `(gov: GovernanceMode, eng: string) => void` cannot carry industry segment ID back to the parent.

---

## Fixes

### 1. `src/hooks/cogniblend/useCreatorDraftLoader.ts`
- Add `evaluation_criteria, deliverables` to `DRAFT_COLUMNS`
- Extend `DraftSyncCallback` to `(gov: GovernanceMode, eng: string, industrySegmentId?: string) => void`
- Pass `challenge.industry_segment_id` in the `onDraftModeSync` call

### 2. `src/pages/cogniblend/ChallengeCreatePage.tsx`
- Update `handleDraftModeSync` to accept and apply the third `industry` argument:
```typescript
const handleDraftModeSync = useCallback((gov: GovernanceMode, eng: string, industry?: string) => {
  setGovernanceMode(gov);
  setEngagementModel(eng);
  if (industry) setIndustrySegmentId(industry);
}, []);
```

### 3. `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- Update `onDraftModeSync` prop type to match the new 3-argument signature

### 4. `src/lib/cogniblend/solutionRequestPayloads.ts`
- Add `hook?: string` and `deliverablesList?: string[]` to both `DraftPayload` and `SubmitPayload` interfaces
- Update `buildChallengeUpdatePayload` to write `hook` and `deliverables` columns to the DB

### 5. `src/hooks/cogniblend/useCreatorDraftSave.ts`
- Add `weightedCriteria` and `deliverablesList` to the `base` payload object:
```typescript
weightedCriteria: data.weighted_criteria?.length ? data.weighted_criteria : undefined,
deliverablesList: cleanArray(data.deliverables_list),
```

### 6. `src/hooks/cogniblend/useSubmitSolutionRequest.ts`
- Ensure `hook` and `deliverables` are written in the submit flow's `.update()` call (they're currently missing there too)

---

## Governance Mode Impact Matrix

| Field | QUICK (5) | STRUCTURED (8) | CONTROLLED (12) | Bug Impact |
|-------|-----------|----------------|-----------------|------------|
| industry_segment_id | Optional | Required | Required | Lost on resume (Bug 1) |
| weighted_criteria | Hidden | Required | Required | Never saved/loaded (Bug 2, 4) |
| deliverables_list | Hidden | Optional | Required | Never saved/loaded (Bug 2, 4) |
| hook | Hidden | Hidden | Required | Never persisted (Bug 3) |

QUICK mode is least affected (only industry). CONTROLLED mode is most broken — 3 of its 12 required fields are silently lost on resume.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useCreatorDraftLoader.ts` | Add missing columns, sync industry segment |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Accept industry in draft sync callback |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Update onDraftModeSync prop type |
| `src/lib/cogniblend/solutionRequestPayloads.ts` | Add hook + deliverablesList to types and update builder |
| `src/hooks/cogniblend/useCreatorDraftSave.ts` | Include weightedCriteria + deliverablesList in save payload |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Write hook + deliverables in submit update |

