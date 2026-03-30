

# Fix: `masterDataOptions is not defined` — Pass 2 Crash

## Root Cause

The edge function logs show **repeated crashes**:
```
ReferenceError: masterDataOptions is not defined
    at callAIPass2Rewrite (index.ts:664)
```

**What's happening:** The previous fix added `masterDataOptions` usage inside `callAIPass2Rewrite` (lines 522-527) and `buildPass2SystemPrompt` calls, but **never added it as a function parameter**. The variable `masterDataOptions` is defined at line 1182 in the main request handler — it's not in scope inside `callAIPass2Rewrite` or `callAIBatchTwoPass`.

This means **Pass 2 (Rewrite) crashes every single time**, and the catch block at line 669 silently falls back to Pass 1 results (analysis-only — no suggestions). That's why re-reviews "work sometimes" — Pass 1 analysis succeeds, but the actual rewritten suggestion is always missing.

## Fix (single file, 3 lines)

**File:** `supabase/functions/review-challenge-sections/index.ts`

### Change 1: Add `masterDataOptions` parameter to `callAIPass2Rewrite`
Line 408-416 — add parameter to function signature:
```typescript
async function callAIPass2Rewrite(
  apiKey: string,
  model: string,
  pass1Results: any[],
  challengeData: any,
  waveAction: string,
  clientContext?: any,
  sectionConfigs?: SectionConfig[],
  masterDataOptions?: Record<string, { code: string; label: string }[]>,  // ADD THIS
): Promise<Map<string, string>> {
```

### Change 2: Add `masterDataOptions` parameter to `callAIBatchTwoPass`
Line 637-648 — add parameter to orchestrator signature:
```typescript
async function callAIBatchTwoPass(
  ...existing params...,
  providedComments?: any[],
  masterDataOptions?: Record<string, { code: string; label: string }[]>,  // ADD THIS
)
```

### Change 3: Thread `masterDataOptions` through the call chain
- Line 665: Pass it from `callAIBatchTwoPass` → `callAIPass2Rewrite`
- Line 1293: Pass it from main handler → `callAIBatchTwoPass`

## Impact
- Pass 2 will stop crashing — eligibility, visibility, and solver expertise sections will receive proper AI-generated suggestions instead of analysis-only fallbacks
- Master data allowed values will be enforced in the rewrite pass, preventing junk codes

## Deployment
- Redeploy `review-challenge-sections` edge function

