

## Plan: Workflow Corrections — Prevent AI Re-generation & Enhance Curator Review

### Current State (What's Working)
- Challenge `a7962f69` now has ALL AI-generated fields populated (problem_statement, scope, hook, deliverables, evaluation_criteria, ip_model, solver types)
- Flow is already: **Spec Review → Legal Doc Upload → Curator Review → Innovation Director**
- The `AICurationQualityPanel` already exists on the Curator Review page and calls the `check-challenge-quality` edge function
- The `hasAiData` check correctly detects populated data

### Problems to Fix

1. **Auto-regeneration fires when it shouldn't** — The `useEffect` in `AISpecReviewPage.tsx` will re-trigger AI generation if any downstream viewer opens a challenge that somehow lost data. This is wrong: AI should generate ONCE (by CR), and subsequent roles should see existing data without regeneration risk.

2. **Curator AI review doesn't include legal documents** — The `check-challenge-quality` edge function only analyzes spec fields. It should also fetch and report on attached legal documents (completeness, tier coverage).

3. **No role-awareness on auto-gen** — The auto-generate should only fire for the Challenge Creator (CR) role, not for any user who happens to land on the spec page.

### Changes

**File 1: `src/pages/cogniblend/AISpecReviewPage.tsx`**
- Add role check to the auto-generation guard: only trigger if the current user holds the CR role for this challenge (query `user_challenge_roles` for `role_code = 'CR'`)
- Import `useUserChallengeRoles` and `useAuth` (already available)
- Guard becomes: `!hasAiData && isCR && !autoGenTriggered.current`
- For non-CR users viewing a challenge with missing data, show a read-only message: "Waiting for Challenge Creator to generate specification" instead of triggering generation

**File 2: `supabase/functions/check-challenge-quality/index.ts`**
- After fetching challenge data, also query `challenge_legal_docs` for this challenge
- Include legal doc summary (count by tier, attached vs required, any missing) in the AI prompt
- Add a new output field `legal_compliance_score` (0-100) and `legal_gaps` array to the tool schema
- This gives the Curator AI-assisted visibility into whether legal docs are complete

**File 3: `src/components/cogniblend/curation/AICurationQualityPanel.tsx`**
- Add display for the new `legal_compliance_score` and `legal_gaps` fields
- Show a "Legal Documents" section in the quality assessment with pass/fail indicators

### Technical Details

- `useUserChallengeRoles(userId, challengeId)` returns the user's roles for a specific challenge — check for `role_code === 'CR'`
- The `challenge_legal_docs` table has columns: `challenge_id`, `doc_type`, `tier`, `file_url`, `status`, `lc_status`
- The edge function already uses `adminClient` (service role), so it can query legal docs without RLS issues
- No database schema changes needed — all tables exist

