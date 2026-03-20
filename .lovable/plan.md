

# Plan: Remove Duplicate Solver Categories & Fix AI Selection

## Problem

The `md_solver_eligibility` table contains **two overlapping sets** of solver categories:

| Set | Codes | Display Order | Purpose |
|-----|-------|---------------|---------|
| Old granular | `certified_basic`, `certified_competent`, `certified_expert`, `registered`, `expert_invitee`, `signed_in`, `open_community`, `hybrid` | 10–80 | Legacy, fine-grained tiers |
| New model | `CE`, `IO`, `DR`, `OC`, `OPEN` | 100–140 | Current 5-code model (matches your screenshot) |

Both sets are `is_active = true`, so both appear in the UI and the AI picks from all 13 codes — producing redundant/confusing selections.

The user's screenshot confirms only the 5-code model set (`CE`, `IO`, `DR`, `OC`, `OPEN`) should be used.

## Changes

### 1. Deactivate Old Solver Categories (Migration)

SQL migration to set `is_active = false` on the 8 old codes (`certified_basic`, `certified_competent`, `certified_expert`, `registered`, `expert_invitee`, `signed_in`, `open_community`, `hybrid`). This removes them from:
- The AI prompt (edge function fetches `is_active = true`)
- The review page checkboxes (`useSolverEligibility` fetches `is_active = true`)
- The manual wizard

No data loss — existing challenges referencing these codes keep their stored JSON intact.

### 2. Improve AI Prompt — Context-Aware Selection Logic

**File**: `supabase/functions/generate-challenge-spec/index.ts`

Enhance the system prompt's solver selection instructions to be more prescriptive based on problem characteristics:

```
Selection rules (apply in order):
1. IP-sensitive challenges (IP-EA, IP-EL, pilot/prototype maturity):
   - Eligible: CE or IO (narrow, vetted solvers)
   - Visible: DR or OC (broader discovery, still controlled)
2. Domain-expert challenges (poc maturity, technical problems):
   - Eligible: DR (registered with NDA)
   - Visible: OPEN or DR
3. Open innovation / ideation (blueprint maturity, IP-NONE):
   - Eligible: OPEN
   - Visible: OPEN
4. Visible MUST always be equal to or broader than Eligible
5. Never select the SAME codes for both — visible should be strictly broader unless both are OPEN
```

This gives the AI deterministic decision criteria rather than vague "select 1-3 codes."

### 3. Ensure No Overlap Between Eligible and Visible Selections

**File**: `supabase/functions/generate-challenge-spec/index.ts`

Add post-processing after AI returns codes: if `visible_solver_codes` and `solver_eligibility_codes` are identical, expand visible to include the next broader category. For example, if both are `[DR]`, expand visible to `[DR, OPEN]`.

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Deactivate 8 old solver category codes |
| `supabase/functions/generate-challenge-spec/index.ts` | Better selection rules in prompt + post-processing to prevent identical sets |

