

# Fix "Organization not found" on Generate with AI

## Diagnosis

The demo scenario was **successfully re-seeded** just now (I ran it via the edge function API). All 9 users, org_users links, user_roles, a demo challenge, and user_challenge_roles are now correctly in the database.

The previous seed run had silently failed, leaving the org record but no relational data (org_users, user_roles, etc.). This caused `useCurrentOrg()` to return `null`, triggering the "Organization not found" error.

**However, there is still a bug**: The edge function sets `organization_name` but not `legal_entity_name`. The `useCurrentOrg` hook reads `legal_entity_name` for display, so the org name shows as "Organization" (the fallback) instead of "New Horizon Company".

## Plan

### Step 1: Fix edge function — set `legal_entity_name` alongside `organization_name`

**File**: `supabase/functions/setup-test-scenario/index.ts` (line 152)

Add `legal_entity_name: config.orgName` to the org insert so that `useCurrentOrg` reads the correct name.

### Step 2: Re-deploy and re-seed

The edge function will auto-deploy. The user should then:
1. Go to `/cogni/demo-login`
2. Click "Seed Demo Scenario" to re-seed with the fix
3. Log in as any demo user
4. "Generate with AI" should now work since `currentOrg` will resolve correctly

### What was already fixed
- The early validation in `handleGenerateWithAI` (org check before AI call) is already in place
- The seed data is currently correct in the database from the re-seed I just ran
- No database migrations needed

