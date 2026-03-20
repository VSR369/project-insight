

## Plan: Fix AI Spec Review Page Data Loading

### Problems Identified

**1. `profiles.display_name` column does not exist (400 errors)**
Two files query `profiles.display_name`, but the actual column names are `first_name` and `last_name`. This causes 400 errors on the dashboard and CR assignment lookups.

- `src/hooks/queries/useMyRequests.ts` (line 84)
- `src/pages/requests/SolutionRequestsListPage.tsx` (line 166)

**2. WhatsNextCard shows ALL org challenges, not just the user's**
The query fetches challenges in phases 1-4 regardless of user involvement. This led the user to click into a **demo challenge** (phase 1, no AI data) thinking it was their AI-generated challenge.

**3. Demo challenge at phase 1 shows empty fields on spec review**
The challenge `a7962f69` was created by the test setup script with null `problem_statement`, `scope`, `hook`, `ip_model`, and empty `deliverables`. The spec review page shows "No content yet" for all these fields because no AI generation was ever run for it.

**4. `check_sla_status` RPC error: `"record "v_timer" has no field "duration_days"`**
A minor DB function bug causing 400 errors on the dashboard.

### Changes

**File 1: `src/hooks/queries/useMyRequests.ts`**
- Change `select('id, display_name, email')` to `select('id, first_name, last_name, email')`
- Update the profile name resolution to use `first_name + last_name` or fall back to email

**File 2: `src/pages/requests/SolutionRequestsListPage.tsx`**
- Same fix as above: replace `display_name` with `first_name, last_name`

**File 3: `src/components/cogniblend/dashboard/WhatsNextCard.tsx`**
- Filter challenges to only show those where the current user has an active `user_challenge_roles` entry
- Join or sub-query `user_challenge_roles` filtered by `user_id`

**File 4: `src/pages/cogniblend/AISpecReviewPage.tsx`**
- Add a guard: if the challenge has no AI-generated data (null `problem_statement`, empty deliverables, null hook), show an info banner explaining "This challenge was not created with AI. Use the AI creation flow to generate a specification." with a link to create or to the Advanced Editor.

**File 5: DB migration to fix `check_sla_status` function**
- Fix the `duration_days` column reference in the `check_sla_status` RPC to use the correct column name from `sla_timers`.

### Technical Details

- The `profiles` table has columns: `id, user_id, first_name, last_name, email, phone, avatar_url, created_at, updated_at`
- Profile display name should be constructed as `[first_name last_name].trim() || email`
- The WhatsNextCard should use `user_challenge_roles` to filter: query the user's active challenge roles first, then filter challenges by those IDs
- The spec review "no data" guard checks: if `problem_statement` is null AND `hook` is null AND deliverables items are empty, show the info state

