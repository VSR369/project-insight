

# Plan: Master Seed Following Existing Role Architecture

## The Two Role Systems (As Designed)

The project has two distinct role layers that must both be seeded:

**Layer 1 -- Org-Level Roles (`role_assignments` + `md_slm_role_codes`)**
These are created by Platform Admin (MP roles) or Seeking Org Admin (AGG roles):

| Code | Name | Model | Created By |
|------|------|-------|------------|
| R2 | Account Manager | both | Platform Admin (on behalf) |
| R3 | Challenge Architect | MP | Platform Admin |
| R4 | Challenge Creator | AGG | Seeking Org Admin |
| R5_MP | Challenge Curator/MP | MP | Platform Admin |
| R5_AGG | Challenge Curator/AGG | AGG | Seeking Org Admin |
| R6_MP | Innovation Director/MP | MP | Platform Admin |
| R6_AGG | Innovation Director/AGG | AGG | Seeking Org Admin |
| R7_MP | Expert Reviewer/MP | MP | Platform Admin |
| R7_AGG | Expert Reviewer/AGG | AGG | Seeking Org Admin |
| R8 | Finance Coordinator | both | Platform Admin (on behalf) |
| R9 | Legal Coordinator | both | Platform Admin (on behalf) |
| R10_CR | Challenge Requestor | AGG | Seeking Org Admin |

**Layer 2 -- Challenge-Level Roles (`user_challenge_roles` + `platform_roles`)**
These map users to CogniBlend governance phases:

| Code | Name | Model |
|------|------|-------|
| AM | Account Manager | MP |
| RQ | Challenge Requestor | AGG |
| CR | Challenge Creator/Architect | BOTH |
| CU | Challenge Curator | BOTH |
| ID | Innovation Director | BOTH |
| ER | Expert Reviewer | BOTH |
| LC | Legal Coordinator | BOTH |
| FC | Finance Coordinator | BOTH |

## What We'll Build

### 1. New Edge Function: `seed-cogni-master`

Creates **two complete test organizations** with full data following the existing design patterns.

**Step-by-step seeding order (mirrors real app flow):**

1. Create auth users + profiles (14 users)
2. Create 2 orgs in `seeker_organizations` (1 MP, 1 AGG)
3. Create `org_users` mappings
4. Create `seeking_org_admins` for Primary Admin of each org
5. Create `role_assignments` -- **Platform Admin creates MP roles (R3, R5_MP, R6_MP, R7_MP) + core roles (R2, R8, R9)** for the MP org
6. Create `role_assignments` -- **Seeking Org Admin creates AGG roles (R4, R5_AGG, R6_AGG, R7_AGG, R10_CR) + core roles (R2, R8, R9)** for the AGG org
7. Create 3 challenges per org (phases 1, 2, 3) with full content
8. Create `user_challenge_roles` mapping users to challenge-level governance roles
9. Legal docs, audit trail, Q&A, amendment records

**MP Org: "CogniTest Marketplace Corp" (MP, LIGHTWEIGHT)**

| Email | Display Name | Org Roles (role_assignments) | Challenge Roles (user_challenge_roles) |
|-------|-------------|-----|-----|
| `mp-solo@cognitest.dev` | MP Solo Founder | R2, R3, R5_MP, R6_MP, R7_MP, R8, R9 | AM, CR, CU, ID, ER, LC, FC |
| `mp-architect@cognitest.dev` | MP Architect | R3 | CR |
| `mp-curator@cognitest.dev` | MP Curator | R5_MP | CU |
| `mp-director@cognitest.dev` | MP Director | R6_MP | ID |
| `mp-reviewer@cognitest.dev` | MP Reviewer | R7_MP | ER |
| `mp-finance@cognitest.dev` | MP Finance | R8 | FC |
| `mp-legal@cognitest.dev` | MP Legal | R9 | LC |

**AGG Org: "CogniTest Aggregator Corp" (AGG, ENTERPRISE)**

| Email | Display Name | Org Roles (role_assignments) | Challenge Roles (user_challenge_roles) |
|-------|-------------|-----|-----|
| `agg-solo@cognitest.dev` | AGG Solo Founder | R2, R4, R5_AGG, R6_AGG, R7_AGG, R8, R9, R10_CR | RQ, CR, CU, ID, ER, LC, FC |
| `agg-creator@cognitest.dev` | AGG Creator | R4 | CR |
| `agg-curator@cognitest.dev` | AGG Curator | R5_AGG | CU |
| `agg-director@cognitest.dev` | AGG Director | R6_AGG | ID |
| `agg-reviewer@cognitest.dev` | AGG Reviewer | R7_AGG | ER |
| `agg-finance@cognitest.dev` | AGG Finance | R8 | FC |
| `agg-legal@cognitest.dev` | AGG Legal | R9 | LC |

**All passwords: `CogniTest2026!`**

Note: R3 = Challenge Architect (MP), R4 = Challenge Creator (AGG) -- correctly mapped per `md_slm_role_codes`.

### 2. Updated CogniBlend Login Page

Below existing Developer Tools:
- **"Seed Master Test Data"** button invoking `seed-cogni-master`
- Collapsible **Quick Login** section with two tabs: "MP Users" (blue) / "AGG Users" (purple)
- One-click login buttons showing email + role badges
- Seed results log

### 3. Config Registration

Add `[functions.seed-cogni-master]` with `verify_jwt = false` in `supabase/config.toml`.

## Files

| Action | File |
|--------|------|
| Create | `supabase/functions/seed-cogni-master/index.ts` |
| Edit | `src/pages/cogniblend/CogniLoginPage.tsx` |
| Edit | `supabase/config.toml` |

