

# Clean Slate: Delete All Challenge Data for Fresh Testing

## What You Need To Do

You cannot delete data through the app UI. You need to run DELETE statements against the database. Since the data has foreign key relationships, child tables must be cleaned first (cascade order).

## Option 1: Run in Supabase SQL Editor (Recommended)

Go to the **SQL Editor** in your Supabase dashboard and run this script:

```sql
-- Step 1: Delete all child records (foreign keys reference challenges)
DELETE FROM audit_trail;
DELETE FROM curator_section_actions;
DELETE FROM user_challenge_roles;
DELETE FROM challenge_role_assignments;
DELETE FROM challenge_attachments;
DELETE FROM challenge_incentive_selections;
DELETE FROM challenge_legal_docs;
DELETE FROM challenge_package_versions;
DELETE FROM challenge_prize_tiers;
DELETE FROM challenge_qa;
DELETE FROM challenge_submissions;
DELETE FROM cogni_notifications;
DELETE FROM communication_log;
DELETE FROM duplicate_reviews;
DELETE FROM escrow_records;
DELETE FROM ip_transfer_records;
DELETE FROM legal_acceptance_ledger;
DELETE FROM legal_reacceptance_records;
DELETE FROM legal_review_requests;
DELETE FROM pending_challenge_refs;
DELETE FROM rating_records;
DELETE FROM seeker_invoice_line_items;
DELETE FROM sla_timers;
DELETE FROM solutions;
DELETE FROM solver_enrollments;
DELETE FROM amendment_records;
DELETE FROM dispute_records;

-- Step 2: Delete all challenges
DELETE FROM challenges;
```

## Option 2: If tables have ON DELETE CASCADE

If the `challenges` foreign keys use `ON DELETE CASCADE`, you may only need:

```sql
DELETE FROM challenges;
```

But the full script in Option 1 is safer.

## After Cleanup

1. Clear your browser's `sessionStorage` (DevTools → Application → Session Storage → Clear)
2. Refresh the page
3. Go to Creator flow → Create a new challenge from scratch
4. Submit it → It should transition to Phase 2 (Curation) and save the `creator_snapshot`
5. Switch to Curator role → Run AI curation
6. Switch back to Creator → Verify "My Version" vs "Curator Version" tabs

## Current Data

You currently have **15 challenges** in the database, most are duplicates of "Predictive Maintenance for CNC Machining Line — Plant 7". All will be removed.

