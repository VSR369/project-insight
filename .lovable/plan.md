

# Re-Engineer Seed Functions: Remove Legacy Roles (AM, RQ, CA, ID)

## Problem

Two edge functions and one UI component still reference legacy role codes (AM, RQ, CA, ID) that were removed from the architecture. The current 5-role system is: **CR, CU, ER, LC, FC**.

### Legacy references found:

**`setup-test-scenario/index.ts`** (lines 21-92):
- `mp_quick` scenario: uses `["AM", "CA", "CU", "ID", "ER", "FC"]`
- `mp_enterprise_3`: uses `["CA", "CU"]`, `["ID", "ER"]`, `["AM", "FC"]`
- `agg_enterprise_8`: uses `["RQ"]`, `["ID"]`
- `agg_quick_bypass`: uses `["RQ", "CR", "CU", "ID", "ER", "FC"]`
- `new_horizon_demo`: already uses modern roles (CR, CU, ER, LC, FC) -- OK
- Challenge descriptions reference "AM intake" and "RQ intake" (lines 339, 378)
- Step 5 comment references "AM, CA" and "RQ, CR" (line 399)

**`seed-cogni-master/index.ts`** (lines 23-41):
- MP Solo: `challengeRoles: ["AM","CR","CU","ID","ER","LC","FC"]`
- MP Director: `challengeRoles: ["ID"]`
- AGG Solo: `challengeRoles: ["RQ","CR","CU","ID","ER","LC","FC"]`
- AGG Director: `challengeRoles: ["ID"]`

**`CogniLoginDevTools.tsx`** -- already uses modern role display labels (Creator, Curator, etc.) but the backend seeds legacy codes for some users.

## Plan

### Step 1: Update `setup-test-scenario/index.ts` scenarios

Replace all 4 legacy scenarios with modern role codes:

| Scenario | Old Roles | New Roles |
|----------|-----------|-----------|
| `mp_quick` solo | AM,CA,CU,ID,ER,FC | CR,CU,ER,LC,FC |
| `mp_enterprise_3` user1 | CA,CU | CR,CU |
| `mp_enterprise_3` user2 | ID,ER | CU,ER |
| `mp_enterprise_3` user3 | AM,FC | LC,FC |
| `agg_enterprise_8` RQ user | RQ | CR |
| `agg_enterprise_8` ID user | ID | CU |
| `agg_quick_bypass` solo | RQ,CR,CU,ID,ER,FC | CR,CU,ER,LC,FC |

Also update:
- Challenge descriptions (remove "AM intake" / "RQ intake" references)
- Step 5 comments (remove legacy role references)
- User display names (e.g., "AGG Requestor" -> "AGG Creator", "AGG Innov Director" -> "AGG Curator")

### Step 2: Update `seed-cogni-master/index.ts` challenge roles

| User | Old challengeRoles | New challengeRoles |
|------|-------------------|-------------------|
| MP Solo | AM,CR,CU,ID,ER,LC,FC | CR,CU,ER,LC,FC |
| MP Director | ID | CU |
| AGG Solo | RQ,CR,CU,ID,ER,LC,FC | CR,CU,ER,LC,FC |
| AGG Director | ID | CU |

Update display names accordingly (Director -> Curator where role is now CU).

### Step 3: Update `CogniLoginDevTools.tsx` quick login labels

- `mp-director` label "Director" with roles `["ID"]` -> display as "Curator" with `["CU"]`
- `agg-director` similarly
- Update the role badge arrays to match the new seed data

### Step 4: Deploy both edge functions

Deploy `setup-test-scenario` and `seed-cogni-master`.

### Technical Details

- The `new_horizon_demo` scenario is already correct (uses CR, CU, ER, LC, FC)
- The `LEGACY_ROLE_ALIASES` in `cogniRoles.ts` provides runtime mapping, but seeding legacy codes into the DB is wrong -- the source data should be clean
- No database migration needed -- only edge function code and one UI component change

