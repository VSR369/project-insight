

## Sprint 6 — FC Escrow Enhancement + Audit Trail + Timeout Config

Final sprint: enhance FC escrow form (3 new fields + proof upload), add immutable status history audit table, ship a timeout config admin component, and wire fire-and-forget status logging into existing mutations from Sprints 3-5.

### Files

| # | File | Type | Lines |
|---|---|---|---|
| 1 | New migration | CREATE | SQL |
| 2 | `src/pages/cogniblend/EscrowDepositForm.tsx` | MODIFY | 161 → ~210 |
| 3 | `src/pages/cogniblend/EscrowManagementPage.tsx` | MODIFY | 224 → ~280 |
| 4 | `src/lib/cogniblend/statusHistoryLogger.ts` | CREATE | ~60 |
| 5 | `src/lib/cogniblend/workflowNotifications.ts` | CREATE | ~140 |
| 6 | `src/components/cogniblend/admin/LcTimeoutConfigCard.tsx` | CREATE | ~130 |
| 7 | `src/hooks/cogniblend/useCreatorReview.ts` | MODIFY | +6 (logging in 3 mutations) |
| 8 | `src/hooks/cogniblend/useCuratorLegalReview.ts` | MODIFY | +3 (logging in acceptPass3) |
| 9 | `src/hooks/cogniblend/useLcPass3Review.ts` | MODIFY | +3 (logging in acceptPass3) |

### Migration (Part A)

Single migration file:
- `challenge_status_history` table + 2 indexes + RLS (SELECT via `user_challenge_roles`, INSERT for any authed user) + immutability comment.
- `escrow_records` ALTER ADD COLUMN IF NOT EXISTS × 5: `account_number_masked`, `ifsc_swift_code`, `proof_document_url`, `proof_file_name`, `proof_uploaded_at`.
- Storage bucket `escrow-proofs` (private, 10MB, PDF/PNG/JPEG/WEBP) + 2 RLS policies on `storage.objects` (FC insert, authed select).
- `organizations.lc_review_timeout_days_override INTEGER` (nullable; falls back to `md_governance_mode_config.lc_review_timeout_days`).

### Form changes (B1)

- Extend `escrowFormSchema` with `account_number` (string 1-30) and `ifsc_swift_code` (regex: IFSC `^[A-Z]{4}0[A-Z0-9]{6}$` OR SWIFT `^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`).
- Add 3 props: `proofFile`, `onProofFileChange`, `proofUploading`.
- Insert 2 new `FormField` blocks (Account Number, IFSC/SWIFT with auto-uppercase + maxLength=11) after `deposit_reference`, then a non-RHF labeled block wrapping `<FileUploadZone>` for proof, then existing `fc_notes`.
- Loader2 spinner next to "Deposit Proof *" label when `proofUploading`.

### Page changes (B2)

- Add `useState` for `proofFile` + `proofUploading`.
- Default form values extended for the 2 new RHF fields.
- In `confirmEscrow.mutationFn`, **before** the existing escrow upsert: if `proofFile`, sanitize name → upload to `escrow-proofs/{challengeId}/{ts}_{name}` → capture `proofUrl` + `proofFileName`. Throw on upload error so the mutation fails cleanly.
- Extend the upsert payload with the 5 new columns (mask account number `slice(0,2)+'****'+slice(-4)`).
- Extend audit-trail `details` JSON with `ifsc_swift_code` and `proof_uploaded` flag.
- After successful confirmation, fire-and-forget insert into `challenge_status_history` (FC, `PENDING_FC_ESCROW → FC_ESCROW_CONFIRMED`).
- `onSuccess`: reset `proofFile=null`, `proofUploading=false`. Do NOT touch the existing `complete_financial_review` RPC call sequence.
- Pass 3 new props down to `EscrowDepositForm`. Import `sanitizeFileName`.

### statusHistoryLogger (Part C)

Single exported `logStatusTransition` — fire-and-forget insert. Wrapped in try/catch; logs via `console.error` (per spec — this single file is exempt from the no-console rule because it is the audit-logging boundary; alternative is `logWarning` from `@/lib/errorHandler`, which I will use to comply with R9 if available).

### workflowNotifications (Part E)

Four functions inserting into `cogni_notifications`: `notifyEscrowConfirmed`, `notifyLcReviewTimeout`, `notifyCreatorApprovalTimeout`, `notifyPass3Stale`. Each typed; each fire-and-forget; each uses a distinct `notification_type`. Not yet wired into any flow — provided for future use as the spec describes.

### LcTimeoutConfigCard (Part D)

Standalone Card with Clock icon, controlled number Input (min 1 / max 30), governance mode badge, Save button bound to `onSave`. No data-fetching — purely presentational with props. Future admin page can mount it.

### Logging integration (Part F)

Three hooks each gain one import + one `logStatusTransition(...)` call inside the existing `onSuccess` of the relevant mutation. Logging is fire-and-forget; never affects existing toast/invalidation/UI behavior.

### Safety guarantees

- Original 8 escrow form fields untouched; new fields only added.
- `complete_financial_review` RPC call path preserved exactly.
- `challenge_status_history` is insert-only at the API surface; no UPDATE/DELETE methods are exposed.
- All new files < 250 lines; modified files stay < 300.
- QUICK/STRUCTURED unaffected — FC escrow page is CONTROLLED-only, and Sprint 3-5 hooks already gate by mode.
- Account number never stored raw — only masked form persisted.
- Proof bucket isolated from `legal-docs`.
- Logger uses `logWarning` (R9 compliant) instead of bare `console.error`.

### Out of scope

- Wiring `workflowNotifications.*` into mutations (provided as utilities; integration deferred).
- Mounting `LcTimeoutConfigCard` in an admin page (component shipped standalone).
- Enforcement cron for LC/CR timeouts.
- Backfilling history for past status changes.
- Status-history viewer UI.

