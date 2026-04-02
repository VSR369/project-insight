

# Fix: Deduplicate My Challenges List

## Problem

`useMyChallenges` joins `user_challenge_roles` with `challenges`. Since the Creator now holds 5 roles (CR, CU, ER, LC, FC) per QUICK-mode challenge, the query returns 5 rows per challenge. The page renders each row as a separate card.

## Solution

Deduplicate in `useMyChallenges` by grouping rows by `challenge_id`. Store all role codes per challenge in a `role_codes: string[]` array instead of a single `role_code: string`.

### Changes

**File: `src/hooks/cogniblend/useMyChallenges.ts`**
- Change `MyChallengeItem.role_code: string` → `role_codes: string[]`
- After fetching, group rows by `challenge_id` using a Map
- Each unique challenge appears once with all its roles collected
- `roleCounts` still counts per-role for tab filtering

**File: `src/pages/cogniblend/MyChallengesPage.tsx`**
- Update `ChallengeCard` key from `${id}-${role_code}` to just `challenge_id`
- Remove reference to single `role_code`; optionally show role badges from `role_codes[]`

**File: `src/pages/cogniblend/CogniDashboardPage.tsx`**
- Update journey mapping to use `role_codes` instead of `role_code` (no functional change needed, just type alignment)

