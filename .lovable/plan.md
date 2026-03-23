

# Expand Curation Queue to Show Incoming (Phase 2) Challenges

## Confirmed Assumption

Yes — challenges appear in the Curator's queue as soon as they're assigned the CU role, but remain **read-only** ("Incoming") until LC/FC complete their work and the challenge advances to Phase 3. At Phase 3, the Curator gains full edit access to prepare the challenge package.

## Changes

### File: `src/pages/cogniblend/CurationQueuePage.tsx`

**1. Expand query to fetch Phase 2 + Phase 3 challenges (lines 159-170)**

Replace the single `eq('current_phase', 3)` query with a two-step approach:
- First fetch challenge IDs where user holds active CU role from `user_challenge_roles`
- Then fetch those challenges where `current_phase` is 2 or 3

```typescript
// Step 1: Get CU-assigned challenge IDs
const { data: cuRoles } = await supabase
  .from('user_challenge_roles')
  .select('challenge_id')
  .eq('user_id', user.id)
  .eq('role_code', 'CU')
  .eq('is_active', true);

const cuChallengeIds = (cuRoles ?? []).map(r => r.challenge_id);

// Step 2: Fetch challenges at phase 2 or 3
const { data: rows } = await supabase
  .from('challenges')
  .select('id, title, operating_model, maturity_level, created_at, current_phase, phase_status, organization_id')
  .in('id', cuChallengeIds)
  .in('current_phase', [2, 3])
  .eq('is_deleted', false)
  .eq('is_active', true)
  .order('created_at', { ascending: true });
```

**2. Add "Incoming" tab (line 55-59)**

Add a new tab between existing ones:

```text
Awaiting Review (phase 3) | Incoming (phase 2) | Under Revision | All
```

Filter logic:
- **Awaiting Review**: `current_phase === 3` and not breached
- **Incoming**: `current_phase === 2` (awaiting LC/FC)
- **Under Revision**: phase 3 + SLA breached
- **All**: everything

**3. Add phase status column + row styling (lines 280-325)**

- New "Status" column showing:
  - Phase 2: amber `Awaiting Legal` badge
  - Phase 3: green `Ready for Review` badge
- Phase 2 rows: muted styling, click navigates to a **read-only** curation review (existing `CurationReviewPage` already respects phase checks)
- Phase 3 rows: normal clickable → full edit access

**4. Update `EnrichedCurationChallenge` type (line 44)**

Add `current_phase` to the type (already in the select but not explicitly typed for filtering).

### No other files need changes

The `CurationReviewPage` already checks `current_phase` and will naturally restrict editing for Phase 2 challenges. The Curator can view the content but cannot modify until LC/FC advance it to Phase 3.

