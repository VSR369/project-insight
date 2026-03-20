

# Plan: Simplify AI Spec — Solver-Type-Driven Eligibility & Visibility

**Status: ✅ IMPLEMENTED**

## Summary

Replaced the confusing 4-card eligibility/visibility/enrollment/submission display with a **solver-type-driven** approach matching the Manual Editor. The AI now selects solver categories from `md_solver_eligibility` master data at runtime, and access control fields are auto-derived from the primary category's defaults.

## Changes Made

| File | Change |
|------|--------|
| `supabase/functions/generate-challenge-spec/index.ts` | Fetches `md_solver_eligibility` from DB, injects into prompt, AI selects codes, derives access fields from defaults. Enhanced prompt for structured deliverables (concrete, measurable outputs) and weighted evaluation criteria (weights must sum to exactly 100). |
| `src/hooks/mutations/useGenerateChallengeSpec.ts` | Added `SolverEligibilityDetail` type, updated `GeneratedSpec` with `solver_eligibility_codes`, `solver_eligibility_details`, `eligibility_notes` |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | STRUCTURED mode: editable `SolverEligibilityEditor` with checkbox cards from `useSolverEligibility()` + visibility/enrollment/submission dropdowns from constants. QUICK mode: read-only `SolverEligibilityReadOnly`. Auto-derives access fields from primary solver tier defaults. |
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Updated `handleSpecGenerated` to map new solver fields |
