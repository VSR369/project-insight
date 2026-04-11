

## Fix Plan: "Challenge Not Found" + Complete Phase Response Mismatch

### Verified Root Causes

**Bug 1 — "Challenge Not Found" (the screenshot):**
The `usePublicChallenge` query selects `description` from `seeker_organizations` (line 110), but that column does not exist. PostgREST returns a 400 error, the hook returns `null`, and the page shows "Challenge Not Found." Confirmed in DB logs: `column seeker_organizations_1.description does not exist`.

**Bug 2 — `complete_phase` response shape mismatch:**
The DB function returns `current_phase` (confirmed in `prosrc` line 193), but `CompletePhaseResult` reads `new_phase` (line 34). Every reference to `result.new_phase` (lines 80, 119, 146) evaluates to `undefined`, breaking toast messages and navigation logic after phase transitions.

### Already Fixed (No Action Needed)

| Proposed Fix | Status |
|---|---|
| Fix 2: MyChallengesPage error UI | Already at lines 146-156 |
| Fix 3: Empty catch in executeSubmit | Already at lines 173-178 |
| Fix 4: CurationQueuePage org filter | Already fixed in previous round |

### Implementation (2 file edits)

**1. Fix `src/hooks/cogniblend/usePublicChallenge.ts`**
- Remove `description` from the `seeker_organizations` join (line 110) — column does not exist
- Set `organization_description` to `null` in `buildResult` (line 214)

**2. Fix `src/hooks/cogniblend/useCompletePhase.ts`**
- Change `CompletePhaseResult.new_phase` to `current_phase` (line 34)
- Update all 4 references from `result.new_phase` to `result.current_phase` (lines 80, 119, 146)
- Add `previous_phase` and `governance_mode` fields to the interface to match actual DB return shape

