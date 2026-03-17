

# Plan: Seed CogniBlend Test Data

## Problem
The `user_challenge_roles` table is empty. No users have challenge governance roles, so nobody can access the CogniBlend portal. Challenges exist but are stuck in Phase 1 with no role assignments.

## What to build

### 1. Edge Function: `seed-cogni-test-data`
A one-shot seeder that creates a full CogniBlend test environment using the **existing** users and challenges.

**Role assignments** (using existing `@cogniblend.com` users):

| User | Email | Roles Assigned |
|------|-------|---------------|
| Robert | robert@cogniblend.com | CR (Creator), CU (Curator) |
| Rajesh | rajesh@cogniblend.com | ID (Innovation Director), ER (Expert Reviewer) |
| Test Robert | panel@cogniblend.com | AM (Account Manager), FC (Finance Coordinator) |

**Challenge setup** — Take 3 existing challenges and:
- Assign all 3 users with their respective roles via `user_challenge_roles`
- Advance 1 challenge to Phase 2 (Creator active) with populated content fields (problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule)
- Advance 1 challenge to Phase 3 (Curation) with full content so the Curation Review page can be tested
- Leave 1 in Phase 1 (Draft) as baseline

**Additional seed data per challenge**:
- `challenge_legal_docs`: 2 Tier 1 + 1 Tier 2 doc records
- `amendment_records`: 1 record on the Phase 3 challenge (cycle 1 of 3)
- Domain tags on `challenges.domain_tags`
- Complexity parameters, maturity level, IP model filled

### 2. Login credentials
The seeder will reset passwords for the 3 `@cogniblend.com` users to a known test password (`CogniTest123!`) so you can log in immediately.

### 3. Call button
Add a temporary "Seed CogniBlend Data" button on the CogniBlend login page (dev-only) that invokes the edge function.

## Test login matrix after seeding

| Login As | Password | Portal | What You'll See |
|----------|----------|--------|----------------|
| robert@cogniblend.com | CogniTest123! | CogniBlend | Creator dashboard, challenge editor, 1 challenge in Phase 2 |
| rajesh@cogniblend.com | CogniTest123! | CogniBlend | ID dashboard, curation queue (Phase 3 challenge), approval queue |
| panel@cogniblend.com | CogniTest123! | CogniBlend | AM dashboard, finance overview |

Robert (CU role) can also access the Curation Review page at `/cogni/curation/:id` for the Phase 3 challenge.

## Files to create/edit

| File | Action |
|------|--------|
| `supabase/functions/seed-cogni-test-data/index.ts` | Create — edge function with all seeding logic |
| `src/pages/cogniblend/CogniLoginPage.tsx` | Edit — add dev-only seed button |

