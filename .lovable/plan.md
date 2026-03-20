

## Plan: Restore Original 8 Solver Types, Remove Redundant 5-Code Model

### Summary
Reactivate the original 8 solver types (display_order 10-80) as the canonical set for both eligibility and visibility. Deactivate the 5 newer codes (CE, IO, DR, OC, OPEN). Update all UI, edge function, and auto-assignment logic accordingly.

### Database Change
- Set `is_active = true` for the 8 original codes: `certified_basic`, `certified_competent`, `certified_expert`, `registered`, `expert_invitee`, `signed_in`, `open_community`, `hybrid`
- Set `is_active = false` for the 5 redundant codes: `CE`, `IO`, `DR`, `OC`, `OPEN`

### Files to Update

**1. Edge Function — `supabase/functions/generate-challenge-spec/index.ts`**
- Update the system prompt's deterministic selection rules to use the original 8 codes instead of CE/IO/DR/OC/OPEN
- Update the broadness hierarchy to: `certified_expert < certified_competent < certified_basic < expert_invitee < registered < signed_in < open_community < hybrid`
- Update fallback defaults (e.g., default eligible = `registered`, default visible = `open_community`)
- Update post-processing overlap/hierarchy logic to use the new hierarchy
- Redeploy

**2. Auto-Assignment — `src/lib/cogniblend/solverAutoAssign.ts`**
- Replace `BREADTH_ORDER` from `['IO','CE','OC','DR','OPEN']` to `['certified_expert','certified_competent','certified_basic','expert_invitee','registered','signed_in','open_community','hybrid']`
- Update `computeSolverAssignment` rules to map to original codes:
  - IP-sensitive → eligible: `certified_expert`, visible: `registered`
  - PoC → eligible: `registered`, visible: `open_community`
  - Blueprint open → eligible: `open_community`, visible: `open_community`
  - Default → eligible: `registered`, visible: `open_community`

**3. Constants — `src/constants/challengeOptions.constants.ts`**
- Replace `ELIGIBILITY_MODELS` entries from CE/IO/DR/OC/OPEN to the original 8 codes with their labels and descriptions

**4. Approval Tab — `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx`**
- Replace `ELIGIBILITY_OPTIONS_ENTERPRISE` and `ELIGIBILITY_OPTIONS_LIGHTWEIGHT` with options based on original 8 codes
- Update `ELIGIBILITY_MODELS` local constant similarly

**5. Wizard — `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx`**
- No code changes needed (already reads dynamically from `useSolverEligibility` which filters by `is_active = true`)

**6. Spec Review — `src/pages/cogniblend/AISpecReviewPage.tsx`**
- Update auto-repair logic in `useEffect` to use new codes from `computeSolverAssignment`
- No structural changes needed (solver editor reads from `useSolverEligibility` dynamically)

**7. Intake — `src/pages/cogniblend/ConversationalIntakePage.tsx`**
- Update fallback assignment to use new codes (flows through updated `computeSolverAssignment`)

### Technical Details
- Hierarchy (narrowest → broadest): `certified_expert < certified_competent < certified_basic < expert_invitee < registered < signed_in < open_community < hybrid`
- `hybrid` is broadest: certified experts get priority + open community can also submit
- AI selects exactly 1 eligible code + 1 visible code from the active 8
- Visible must be broader than eligible (same hierarchy enforcement)
- All existing UI components that use `useSolverEligibility()` will automatically pick up the change since they query `is_active = true`

