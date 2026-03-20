

# Plan: Restore Original 8 Solver Types — COMPLETED

## Summary
Restored the original 8 solver types (display_order 10-80) as the canonical set for both eligibility and visibility. Deactivated the 5 redundant codes (CE, IO, DR, OC, OPEN).

## Changes Implemented

### A. Database ✅
- Set `is_active = true` for: certified_basic, certified_competent, certified_expert, registered, expert_invitee, signed_in, open_community, hybrid
- Set `is_active = false` for: CE, IO, DR, OC, OPEN

### B. Auto-Assignment (`solverAutoAssign.ts`) ✅
- Updated `BREADTH_ORDER` to 8-code hierarchy
- Updated `computeSolverAssignment` rules to use original codes
- Updated `enforceHierarchy` defaults to registered/open_community

### C. Constants (`challengeOptions.constants.ts`) ✅
- Replaced `ELIGIBILITY_MODELS` with 8 original codes

### D. Approval Tab (`ApprovalPublicationConfigTab.tsx`) ✅
- Updated `ELIGIBILITY_MODELS`, `ELIGIBILITY_OPTIONS_ENTERPRISE`, and `ELIGIBILITY_OPTIONS_LIGHTWEIGHT`

### E. Edge Function (`generate-challenge-spec/index.ts`) ✅
- Updated system prompt selection rules to use original 8 codes
- Updated BREADTH_ORDER and fallback defaults
- Updated post-processing hierarchy enforcement
- Redeployed

### F. No changes needed
- `StepProviderEligibility.tsx` — dynamically reads from `useSolverEligibility` (auto picks up DB change)
- `AISpecReviewPage.tsx` — auto-repair flows through updated `computeSolverAssignment`
- `ConversationalIntakePage.tsx` — fallback flows through updated `computeSolverAssignment`

## Hierarchy
certified_expert < certified_competent < certified_basic < expert_invitee < registered < signed_in < open_community < hybrid
