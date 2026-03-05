

# Final Gap Analysis & Implementation Plan
## BRD CB-VERIFY-2026-001 vs Current Implementation

### Exclusions (per your instruction)
- OTP integration (product stage — keep current bypass)
- Payment gateway integration (keep dummy/simulation)
- Auto-Assignment Engine / BR-REG-005 (next phase, multi-admin)
- BR-VA-001 SLA escalation automation (SUPERSEDED by CB-MPA-2026-001, next phase)
- Multi-Platform-Admin assignment, workload balancing, Open Queue (next phase)
- Activation reminder automation Day 3/6 (next phase, needs cron + edge function)
- Business Day calendar / holiday configuration (next phase)

---

## Implementable Gaps (13 items)

### GAP 1: `registration_payments` table missing (BRD Section 5.1)
**Status:** Full gap
**BRD requires:** Separate `registration_payments` table with: `id, org_id, payment_amount, transaction_id, gateway_reference, payment_method, payment_timestamp, status (Pending/Completed/Failed/Refunded)`
**Current:** Payment data lives on `seeker_billing_info`. No transaction_id, gateway_reference, or payment_timestamp tracked separately.
**Fix:** Create `registration_payments` table. Populate with dummy data during registration Step 4 (simulated payment). Display in V1 verification section.

### GAP 2: `Registrant Title / Role` field missing from Step 1 registration (BRD Section 2.1.1)
**Status:** Partial gap
**BRD requires:** "Registrant Title / Role" — mandatory text field in Step 1. Stored in `registrant_contact`.
**Current:** `registrant_contact` JSONB stores `job_title` but the Step 1 form may not capture "Relationship to Org" for the registrant themselves (only for delegated admins in Step 2).
**Fix:** Verify Step 1 captures registrant's title/role and persists to `registrant_contact.job_title`. If missing, add field.

### GAP 3: `seeking_org_admins` DB constraints missing (BRD Section 5.3)
**Status:** Full gap
**BRD requires:**
- UNIQUE partial index: `(org_id) WHERE admin_tier = 'PRIMARY' AND status IN ('Invited', 'Active')` — enforces BR-SOA-006
- CHECK or trigger: `domain_scope = 'ALL' WHERE admin_tier = 'PRIMARY'` — enforces BR-SOA-007
**Fix:** Add partial unique index + validation trigger via migration.

### GAP 4: BR-SOA-011 — Primary admin deletion protection trigger missing
**Status:** Full gap
**BRD requires:** Database trigger preventing DELETE or status change to 'Deactivated' on `seeking_org_admins` WHERE `admin_tier = PRIMARY` unless a valid accepted `admin_transfer_requests` record exists.
**Fix:** Create trigger function + trigger via migration.

### GAP 5: BR-VA-004 — Suspension cascade incomplete
**Status:** Partial gap
**BRD requires:** Upon suspension, all org users locked out + challenges placed on Hold.
**Current:** Suspension reason stored, UI shows it. No user lockout or challenge cascade.
**Fix:** Add `useSuspendOrg` mutation enhancement: after setting org to suspended, update all `org_users.is_active = false` for that org. On reinstate, re-activate them. Challenge Hold is out of scope (Challenge Lifecycle module).

### GAP 6: `designated_by` field missing on `seeking_org_admins` (BRD Section 5.1)
**Status:** Partial gap
**BRD requires:** `designated_by` ENUM: SELF, SEPARATE, DELEGATED, TRANSFER on `seeking_org_admins`.
**Current:** Admin records exist but may not track how they were designated.
**Fix:** Add `designated_by` column to `seeking_org_admins` if missing. Populate during admin creation.

### GAP 7: `admin_activation_links.reminders_sent` tracking (BRD Section 5.1)
**Status:** Partial gap
**BRD requires:** `reminders_sent` INTEGER field, `status` ENUM (Pending/Activated/Expired/Resent).
**Current:** Table exists but fields may be incomplete.
**Fix:** Verify schema and add missing columns if needed. Actual reminder automation deferred to next phase.

### GAP 8: `admin_transfer_requests` schema alignment (BRD Section 5.1)
**Status:** Partial gap
**BRD requires:** `initiated_by` ENUM (PRIMARY_ADMIN, PLATFORM_ADMIN), `justification` text, `expires_at` timestamp.
**Current:** Table exists but may lack `initiated_by` enum, `justification`, and `expires_at`.
**Fix:** Add missing columns via migration. UI for Platform Admin override transfer deferred.

### GAP 9: Rejection email notification — BR-VA-002
**Status:** Partial gap
**BRD requires:** Rejection reason communicated to applicant via email within 1 business day.
**Current:** `send-seeker-rejection-email` edge function exists but may not be auto-triggered on rejection.
**Fix:** Wire `useRejectOrg` mutation to invoke `send-seeker-rejection-email` after successful status update.

### GAP 10: V2/V5 confirmation state not persisted
**Status:** Partial gap
**BRD requires:** V1-V6 check results stored as `check_results (JSONB)` on `platform_admin_verification`.
**Current:** V2 and V5 manual confirmations are `useState` only — lost on page reload. No `platform_admin_verification` table.
**Fix:** Since `platform_admin_verification` table is deferred (multi-admin phase), persist V2/V5 confirmation as JSONB on `seeker_organizations.verification_checklist_results` (new column). Load on page open, save on checkbox toggle.

### GAP 11: `Payment Failed` transient state handling (BRD Table 1)
**Status:** Full gap
**BRD requires:** Payment Failed is transient — org stays in Registered, `payment_attempts` counter incremented.
**Current:** No payment failure handling (payment is simulated).
**Fix:** Add `payment_attempts` column to `registration_payments` table (GAP 1). Show retry UI on registration Step 4. Since payment is dummy, this is a structural placeholder.

### GAP 12: Configurable master data for verification parameters (BRD Section 4)
**Status:** Full gap (hardcoded values)
**BRD requires:** System-configurable parameters: Max Correction Cycles (2), Min Rejection Reason Length (50), Activation Link Expiry (7 days), Transfer Acceptance Window (72h).
**Current:** All hardcoded in UI components.
**Fix:** Create `md_system_config` table with key-value pairs. Seed with defaults. Read via `useSystemConfig` hook. Replace hardcoded values in `ReturnForCorrectionDialog`, `RejectOrgDialog`, and `AdminCredentialsCard`.

### GAP 13: Send rejection email on reject action
**Status:** Full gap
**BRD requires:** BR-VA-002 states rejection reason must be communicated via email.
**Current:** `useRejectOrg` updates DB but doesn't trigger email.
**Fix:** After successful rejection mutation, invoke `send-seeker-rejection-email` edge function.

---

## Implementation Plan (4 Batches)

### Batch 1: Database Migrations (Schema)
1. Create `registration_payments` table with all BRD fields + `payment_attempts`
2. Create `md_system_config` key-value table with seeded defaults
3. Add `verification_checklist_results` JSONB column to `seeker_organizations`
4. Add `designated_by` TEXT column to `seeking_org_admins` (if missing)
5. Add missing columns to `admin_activation_links` and `admin_transfer_requests` (if needed)
6. Add partial unique index on `seeking_org_admins` for BR-SOA-006
7. Add validation trigger for BR-SOA-007 (PRIMARY must have domain_scope = ALL)
8. Add deletion protection trigger for BR-SOA-011

### Batch 2: Hooks & Service Updates
1. Create `useSystemConfig` hook to fetch `md_system_config` values
2. Create `useRegistrationPayments` hook for payment record CRUD
3. Update `useRejectOrg` to invoke rejection email edge function
4. Update `useSuspendOrg` to cascade-deactivate `org_users`
5. Update `useReinstateOrg` to re-activate `org_users`
6. Add `useVerificationChecklist` hook to persist/load V2/V5 state

### Batch 3: UI Updates
1. Replace hardcoded correction limit (2) with `md_system_config` value
2. Replace hardcoded rejection min length (50) with `md_system_config` value
3. Update `VerificationChecklist.tsx` to persist V2/V5 confirmations to DB
4. Add payment transaction details display in `SubscriptionDetailCard` (from `registration_payments`)
5. Verify Step 1 registration captures Registrant Title/Role

### Batch 4: Registration Payment Flow
1. On registration Step 4 submit, create dummy `registration_payments` record
2. Display transaction summary on preview page
3. Wire V1 verification to check `registration_payments.status = 'Completed'`

### Files to modify: ~12 files modified, ~4 created
### New tables: 2 (`registration_payments`, `md_system_config`)
### New columns: ~3-4 across existing tables
### New DB objects: 2 triggers, 1 partial unique index

### Future-Proofing Notes
- `platform_admin_verification` table creation deferred to multi-admin phase
- `assigned_admin_id` tracking deferred — current single-admin model uses shared queue
- Schema designed so `registration_payments` can integrate with real gateway later
- `md_system_config` extensible for all future configurable parameters

