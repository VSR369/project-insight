

# Creator & Curator Role Audit: Gaps vs Project Knowledge

## Summary

After reviewing all Creator and Curator files against project knowledge (memories + architecture standards), I found **9 issues** — mostly legacy terminology that contradicts the Role Architecture v2 ("AM, RQ, CA, ID removed"), plus missing architecture standard compliance.

---

## Issues Found

### Issue 1: Legacy role names in UI strings (contradicts Role Architecture v2)

Per memory `cogniblend-role-governance`: "All legacy roles (AM, RQ, CA, ID) have been removed. The Curator (CU) inherits all approval authority previously held by the Innovation Director."

But multiple files still reference removed roles in user-visible text:

| File | Legacy Reference | Should Be |
|------|-----------------|-----------|
| `WorkflowProgressBanner.tsx` L24 | `Challenge Creator / Architect (CR/CA)` | `Challenge Creator (CR)` |
| `WorkflowProgressBanner.tsx` L31 | `Challenge Creator / Architect (CR/CA)` | `Challenge Creator (CR)` |
| `WorkflowProgressBanner.tsx` L44-46 | `Innovation Director Approval`, `Innovation Director (ID)` | `CU Approval` or skip (CU already owns this) |
| `RequestJourneySection.tsx` L38-42 | `You (AM)`, `Challenge Creator / Architect`, `Innovation Director` (5 refs) | Use modern role names (CR, CU) |
| `WhatsNextCard.tsx` L28,34,44-46 | `Challenge Creator / Architect`, `Innovation Director` | `Challenge Creator`, `Curator` |
| `CurationActions.tsx` L254,277,338,394,459-462 | `Account Manager`, `Innovation Director` in toasts/buttons | `Challenge Creator`, `Curator` |

### Issue 2: Legacy `SimpleIntakeForm` uses AM/RQ role model

`SimpleIntakeForm.tsx` is documented as "Model-adaptive intake form for AM/RQ roles" and references `am_approval_required`, `Challenge Architect`, and legacy workflow. Per Role Architecture v2, AM and RQ are removed. This entire form may be the legacy intake path that should either be removed or fully migrated to use CR terminology.

### Issue 3: `CurationActions` still routes to "Innovation Director" for AGG model

Line 316-338: AGG model submit calls `completePhase` and toasts "Challenge submitted to Innovation Director for review." Per memory, "The Curator (CU) inherits all approval and cancellation authority previously held by the Innovation Director." The AGG path should either complete curation directly or go to a CU senior review — not ID.

### Issue 4: `am_approval_required` workflow in CurationActions

Lines 225-286: For MP model, CurationActions checks `am_approval_required` from `extended_brief` and routes to "Account Manager" for pre-publish approval. Per Role Architecture v2, AM is removed. This approval should either be removed (CU has full authority) or rebranded to "Creator Approval" if the CR role retains pre-publish sign-off.

### Issue 5: `WorkflowProgressBanner` phase model references 13 phases

`RequestJourneySection.tsx` defines 13 phases with owners like AM, ID, Challenge Architect. The `WorkflowProgressBanner` maps to 6 steps. Both reference legacy roles. These need updating to match the modern 2-core-role architecture.

### Issue 6: Missing `handleMutationError` in CurationActions

`CurationActions.tsx` uses raw `toast.error()` in `onError` handlers (lines 183-185, 283-285) instead of the centralized `handleMutationError` from `@/lib/errorHandler`. Per architecture standard Section 11.5, all error handling must use the centralized handler.

### Issue 7: Direct Supabase calls in CurationActions component

`CurationActions.tsx` makes direct `supabase.from()` and `supabase.rpc()` calls inside the component (lines 89-98, 121-138, 230-234, 317-346). Per architecture standard Section 5.2: "Services are stateless... services call data access helpers, never Supabase directly from components."

### Issue 8: `MyActionItemsSection` JSDoc references legacy CA/CR

Line 4: "For CA/CR: also shows unread lifecycle notifications." CA is a removed legacy role. Comment should reference CR only.

### Issue 9: Missing `expected_outcomes` visibility check in EssentialDetailsTab

The Expected Outcomes field (lines 305-321 in EssentialDetailsTab) always renders without checking `isFieldVisible(rules, 'expected_outcomes')`. All other governance-aware fields use this check. While expected_outcomes is mandatory for all modes, the pattern should be consistent — if a Supervisor marks it hidden via `md_governance_field_rules`, it should respect that.

---

## Fix Plan

### Phase 1: Terminology cleanup (low risk, high impact)

| File | Change |
|------|--------|
| `WorkflowProgressBanner.tsx` | Replace "CR/CA" with "CR", replace "Innovation Director (ID)" with "Curator (CU)", update step labels |
| `RequestJourneySection.tsx` | Update `PHASE_OWNER` to use modern role names (CR, CU, ER, LC, FC) |
| `WhatsNextCard.tsx` | Update `PHASE_ACTIONS` role labels to modern names |
| `MyActionItemsSection.tsx` | Update JSDoc comment (CA → CR only) |

### Phase 2: Curator submission flow fix

| File | Change |
|------|--------|
| `CurationActions.tsx` | (a) Replace "Account Manager" with "Challenge Creator" in all toasts/labels. (b) Replace "Innovation Director" with appropriate CU-based terminology. (c) Rebrand `AM_APPROVAL_PENDING` UI labels to "Creator Approval Pending". (d) Replace raw `toast.error` with `handleMutationError`. |

### Phase 3: Architecture compliance

| File | Change |
|------|--------|
| `EssentialDetailsTab.tsx` | Wrap Expected Outcomes in `isFieldVisible(rules, 'expected_outcomes')` check |
| `SimpleIntakeForm.tsx` | Update JSDoc and user-visible strings from AM/RQ/CA to CR terminology (form is still used by the conversational intake route) |

### Files Changed (8 total)

1. `src/components/cogniblend/WorkflowProgressBanner.tsx`
2. `src/components/cogniblend/dashboard/RequestJourneySection.tsx`
3. `src/components/cogniblend/dashboard/WhatsNextCard.tsx`
4. `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`
5. `src/components/cogniblend/curation/CurationActions.tsx`
6. `src/components/cogniblend/creator/EssentialDetailsTab.tsx`
7. `src/components/cogniblend/SimpleIntakeForm.tsx`
8. `src/pages/cogniblend/CurationChecklistPanel.tsx` (same ID references)

