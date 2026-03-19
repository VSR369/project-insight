

# Fix "Invalid method: USER" Error + Implement Remaining Plan Items

## Root Cause (Confirmed)

The error originates from **database functions**, not application code. Two PostgreSQL functions insert `method: 'USER'` into `audit_trail`, which is rejected by the `trg_audit_trail_validate` trigger (only allows `HUMAN`, `AUTO_COMPLETE`, `SYSTEM`).

The previous fix only changed TypeScript files — but the actual error is in the **SQL functions** running server-side.

## Changes Required

### 1. Database Migration: Fix `'USER'` → `'HUMAN'` in SQL Functions

Two functions need updating:

- **`initialize_challenge`** — line with `'CHALLENGE_CREATED', 'USER'` → `'HUMAN'`
- **`submit_question`** — line with `'QA_QUESTION_SUBMITTED', 'USER'` → `'HUMAN'`

Single migration that recreates both functions with the corrected enum value.

### 2. Verify TypeScript Files (Already Fixed)

The application-side files (`useSubmitSolutionRequest.ts`, `usePublishChallenge.ts`, `useQAManagement.ts`) were already corrected in the previous round. No further TypeScript changes needed for the method fix.

## Summary

One database migration fixes both the "Invalid method: USER" error and the cascading "AI generation unavailable" banner. The `initialize_challenge` function is called during every challenge creation — fixing it unblocks the entire Create with AI flow.

