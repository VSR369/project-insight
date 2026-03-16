

# Solver Eligibility — Complete 8-Category Gap Analysis & Implementation Plan

## The 8 Categories (Final)

| # | Code | Label | Who | Auth Required? | Provider Record? | Certification? |
|---|------|-------|-----|---------------|-----------------|----------------|
| 1 | `certified_basic` | Certified Basic | ⭐ Basic certified | Yes | Yes | Yes (tier 1) |
| 2 | `certified_competent` | Certified Competent | ⭐⭐ Competent+ | Yes | Yes | Yes (tier 2+) |
| 3 | `certified_expert` | Certified Expert | ⭐⭐⭐ Expert only | Yes | Yes | Yes (tier 3) |
| 4 | `registered` | Registered | Basic info completed | Yes | Yes | No |
| 5 | `expert_invitee` | Expert (Invitee) | VIP Expert invitees | Yes | Yes (auto) | Auto-certified |
| 6 | `signed_in` | Signed In | Authenticated, no provider record | Yes | No | No |
| 7 | `open_community` | Open Community | Anyone — public | No | No | No |
| 8 | `hybrid` | Hybrid | Curated certified + open | Mixed | Mixed | Mixed |

### New Category: "Signed In" — What It Means
- User has a Supabase `auth.users` account (logged in) but has **not** created a `solution_providers` record
- Can participate in **Pulse discussions** (social feed)
- Can participate in challenges marked as **Open Community** or **Signed In** eligible
- When they submit a solution to a challenge, they provide minimal extra details (name, contact) for prize/certificate fulfillment
- **Distinct from "Registered"**: Registered users have a `solution_providers` record with industry, country, etc.

---

## What Exists Today

| Component | Status |
|-----------|--------|
| `challenges` table | Exists — has `visibility` (private/marketplace/invited) but **no** solver eligibility column |
| `solution_providers` table | Exists — has `lifecycle_status` enum and `lifecycle_rank` |
| `lifecycle_status` enum | Exists — 21 statuses from `invited` to `inactive` |
| `invitation_type` enum | Exists — `standard` and `vip_expert` |
| `md_solver_eligibility` table | **Missing** |
| `solver_eligibility_id` on challenges | **Missing** |
| Challenge submission/solution tables | **Missing** — no table for solution submissions exists |
| Lightweight registration screen | **Missing** — all providers go through full enrollment |
| Open community submission flow | **Missing** — no public challenge page |
| Signed-in user challenge participation | **Missing** — Pulse requires AuthGuard but no challenge participation path |
| `community_submissions` table | **Missing** — needed for open/signed-in submissions |
| Eligibility enforcement logic | **Missing** |

---

## Gap Analysis — What Must Be Built

### Gap 1: `md_solver_eligibility` master data table
New table with 8 rows. Columns: `id`, `code`, `label`, `description`, `requires_auth`, `requires_provider_record`, `requires_certification`, `min_star_rating` (nullable), `display_order`, `is_active`, audit fields.

### Gap 2: `solver_eligibility_id` FK on `challenges`
New nullable column referencing `md_solver_eligibility(id)`. Separate from existing `visibility`.

### Gap 3: `challenge_submissions` table
Unified table for ALL solution submissions regardless of solver category. Columns: `id`, `challenge_id` (FK), `user_id` (nullable — null for open community), `provider_id` (nullable — null for signed-in/open), `solver_eligibility_code`, `submitter_name`, `submitter_email`, `submitter_phone`, `submission_text`, `submission_files` (JSONB), `status`, `prize_status`, audit fields.

### Gap 4: Signed-in user challenge participation flow
- These users have `auth.users` accounts but no `solution_providers` record
- Need a lightweight inline form when submitting to a challenge: collects name, contact, and solution
- They can already access Pulse (AuthGuard protects `/pulse/*` routes)
- No new registration screen needed — just a submission form that doesn't require a provider record

### Gap 5: Open community submission flow
- Public challenge landing page (`/challenges/{id}/solve`) — no login required
- Collects: name, email, phone, solution text/files
- Email verification before submission is accepted
- Creates `challenge_submissions` record with `user_id = null`

### Gap 6: Lightweight registration screen for "Registered" category
- New page `/solve/register` — simplified 2-step form
- Collects: name, email, country, industry segment, password
- Creates auth account + `solution_providers` record at `registered` (rank 15)
- Does NOT trigger full certification lifecycle

### Gap 7: Eligibility enforcement logic
Guard function that checks before allowing submission:

```text
Category               → Check
certified_basic        → lifecycle_status='certified', star_rating >= 1
certified_competent    → lifecycle_status='certified', star_rating >= 2
certified_expert       → lifecycle_status='certified', star_rating = 3
registered             → has solution_providers record, lifecycle_rank >= 15
expert_invitee         → invitation_type='vip_expert'
signed_in              → auth.uid() IS NOT NULL (no provider record needed)
open_community         → no check
hybrid                 → accept all, tag source
```

### Gap 8: Challenge Creation UI — Solver Eligibility selector
- New section in `ChallengeCreatePage.tsx` after Visibility
- Radio cards for all 8 categories with descriptions
- Update `challenge.ts` validation schema
- New `useSolverEligibility()` hook in `useChallengeData.ts`

### Gap 9: Prize/Certificate fulfillment data
For open community and signed-in users, the submission form must collect contact/payment info for prize money or certificate delivery. This is stored in `challenge_submissions` fields (`submitter_name`, `submitter_email`, `submitter_phone`, plus optional `payment_details` JSONB for bank/UPI info).

---

## Implementation Phases

### Phase 1: Database Schema (Migration)
1. Create `md_solver_eligibility` table with 8 seed rows
2. Add `solver_eligibility_id` FK to `challenges` table
3. Create `challenge_submissions` table
4. Add RLS policies: md_solver_eligibility (public read), challenge_submissions (insert by eligible users, select by challenge owner)

### Phase 2: Challenge Creation UI
5. Create `useSolverEligibility()` hook
6. Add Solver Eligibility selector to Challenge Creation form
7. Update `challengeSchema` validation

### Phase 3: Submission Flows
8. Build challenge submission form (authenticated — for certified/registered/signed-in)
9. Build public challenge landing page + submission form (open community)
10. Build lightweight registration page `/solve/register` (registered category)

### Phase 4: Enforcement & Fulfillment
11. Eligibility guard — validate solver category before allowing submission
12. Prize/certificate data collection in submission forms

---

## Two-Axis Model Summary

```text
┌──────────────────────────────────────────────────────┐
│              CHALLENGE ACCESS CONTROL                │
│                                                      │
│  AXIS 1: VISIBILITY (who can SEE)                    │
│  ├── private      → org members only                 │
│  ├── marketplace  → all authenticated users           │
│  └── invited      → invited users only               │
│                                                      │
│  AXIS 2: SOLVER ELIGIBILITY (who can SOLVE)          │
│  ├── certified_basic      → ⭐ Basic+               │
│  ├── certified_competent  → ⭐⭐ Competent+          │
│  ├── certified_expert     → ⭐⭐⭐ Expert only       │
│  ├── registered           → basic info providers     │
│  ├── expert_invitee       → VIP invitees             │
│  ├── signed_in            → any logged-in user       │
│  ├── open_community       → anyone, no login         │
│  └── hybrid               → curated + open mix       │
└──────────────────────────────────────────────────────┘
```

