

## Critical Review of Audit Findings

### Verdict Summary

| # | Claimed Bug | Actual Status | Action |
|---|---|---|---|
| A | File upload/URLs hidden for STRUCTURED | **REAL** | Fix needed — extract file/URL section |
| B | referenceUrls not restored on draft reopen | **Already fixed** | No action |
| C | Schema misalignment for QUICK | **Invalid** | DB confirms only 5 required fields; schema matches |
| D | crApprovalRequired always true | **REAL** | Fix needed |
| E | Missing query invalidations in useCompletePhase | **REAL** | Fix needed |
| F | No curator→creator notification | **Already handled by RPC** | No action — `complete_phase` RPC + `notification_routing` table handles this server-side |
| G | SQL migrations not applied | **Already applied** | No action — both JSONB fix and routing config are live |

### Detailed Analysis

**Bug B (referenceUrls):** Code at `useCreatorDraftLoader.ts:119-124` already calls `onReferenceUrlsLoaded(urls)`. `ChallengeCreatorForm.tsx:108` passes `handleReferenceUrlsLoaded` which calls `setReferenceUrls`. This is wired correctly.

**Bug C (QUICK schema):** DB query confirms QUICK has exactly 5 required fields: `title, problem_statement, domain_tags, currency_code, platinum_award`. The schema correctly makes `maturity_level` and `weighted_criteria` optional for QUICK. The audit claim is wrong.

**Bug F (notifications):** The `notification_routing` table has a row for `phase=2, event_type=PHASE_COMPLETE` routing to CU. The `complete_phase` RPC triggers these. No client-side notification needed.

**Bug G (migrations):** Verified live: `assign_challenge_role` uses JSONB (not RECORD), and `notification_routing` has phase 2 entries.

---

### Fixes to Implement (3 genuine bugs)

#### Fix A — File Upload + Reference URLs accessible for STRUCTURED

**Problem:** These sections live inside `AdditionalContextTab`, which is gated behind `isControlled`. STRUCTURED creators cannot attach files or add URLs.

**Approach:** We cannot flip the tab to `!isQuick` (that was tried and correctly reverted — it exposes CONTROLLED-only fields to STRUCTURED). Instead, extract the file upload and reference URL sections into a new `ReferenceAttachmentsSection` component and render it below the tabs for all non-QUICK modes. The CONTROLLED-only context fields (stakeholders, root causes, etc.) stay in the Additional Context tab.

Files:
- **New:** `src/components/cogniblend/creator/ReferenceAttachmentsSection.tsx` — file upload + URL input (extracted from AdditionalContextTab lines 112-135)
- **Edit:** `src/components/cogniblend/creator/AdditionalContextTab.tsx` — remove file upload and URL sections
- **Edit:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` — render `ReferenceAttachmentsSection` below tabs for `!isQuick`, pass attachedFiles/referenceUrls state

#### Fix D — crApprovalRequired derives from governance mode

**Problem:** `useCurationActionData.ts:174` reads `extendedBrief?.creator_approval_required` which is never written by the Creator form. Result: always `undefined !== false → true`, so every MP challenge forces Creator approval — QUICK MP can never auto-publish from curation.

**Fix:** Pass `governanceMode` into `useCurationActionData`. Derive: `crApprovalRequired = governanceMode !== 'QUICK'` (QUICK auto-publishes; STRUCTURED/CONTROLLED require Creator approval). Remove the `extendedBrief` query since it's only used for this check.

Files:
- **Edit:** `src/hooks/cogniblend/useCurationActionData.ts` — add `governanceMode` to options, replace line 174 logic, remove extendedBrief query
- **Edit:** `src/components/cogniblend/curation/CurationActions.tsx` — pass `governanceMode` to the hook

#### Fix E — Missing cache invalidations in useCompletePhase

**Problem:** `onSuccess` only invalidates `cogni-dashboard`, `cogni-waiting-for`, `cogni-open-challenges`. Missing: `curation-review`, `curation-queue`, `public-challenge`, `cogni-my-challenges`. Curator submits but their queue doesn't refresh.

**Fix:** Add the 4 missing invalidations to `useCompletePhase.ts` onSuccess callback.

File:
- **Edit:** `src/hooks/cogniblend/useCompletePhase.ts` — add 4 `invalidateQueries` calls at lines 228-230

