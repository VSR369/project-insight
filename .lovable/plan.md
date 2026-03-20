

# Plan: Autonomous Solver Type Assignment (5-Why Fix) — COMPLETED

## Root Cause (5-Why)
1. Wrong/redundant solver types showing → UI paths used legacy static options + `model_category` filter
2. AI not selecting reliably → Edge function relied on model output with weak post-correction
3. Empty solver arrays persisted → No auto-repair on page load
4. Not caught → No validation gate before persist
5. Persisted in production → No end-to-end regression coverage

## Changes Implemented

### A. Canonical 5-Code Model in UI ✅
- `StepProviderEligibility.tsx`: Removed `model_category` legacy filter — now uses all active `md_solver_eligibility` rows directly
- `ApprovalPublicationConfigTab.tsx`: Replaced legacy eligibility options (invited_experts, curated_experts, registered_users, anyone) with canonical codes (IO, CE, OC, DR, OPEN)
- `challengeOptions.constants.ts`: Replaced HY (Hybrid) with OPEN; reordered by hierarchy

### B. Deterministic Edge Function ✅
- `generate-challenge-spec/index.ts`: Tool schema now enforces exactly 1 code per array (minItems/maxItems: 1)
- Post-processing ensures visible is strictly broader than eligible via hierarchy enforcement
- Deployed successfully

### C. Auto-Repair on Spec Load ✅
- `AISpecReviewPage.tsx`: Added `useEffect` that detects empty/malformed solver arrays and auto-assigns + persists via `useSaveChallengeStep` — no user intervention required
- `solverAutoAssign.ts`: New deterministic assignment utility with hierarchy: IO < CE < OC < DR < OPEN

### D. Persistence Hardening ✅
- `ConversationalIntakePage.tsx`: Added fallback — if AI returns empty solver arrays, deterministic assignment kicks in before save
- Migration already deactivated 8 legacy codes in previous step

### E. Data Backfill
- 12 existing challenges have empty solver arrays
- Auto-repair effect in AISpecReviewPage self-heals these on first page visit

## Files Changed
| File | Action |
|------|--------|
| `src/lib/cogniblend/solverAutoAssign.ts` | **New** — deterministic solver assignment + hierarchy enforcement |
| `src/components/cogniblend/challenge-wizard/StepProviderEligibility.tsx` | Removed legacy `model_category` filter |
| `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx` | Canonical 5-code eligibility options |
| `src/constants/challengeOptions.constants.ts` | Removed HY, added OPEN, reordered |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Auto-repair effect for empty solver arrays |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Fallback deterministic assignment |
| `supabase/functions/generate-challenge-spec/index.ts` | Enforced single-code selection in tool schema |
