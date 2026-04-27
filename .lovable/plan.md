## Assessment of the two outstanding items

### TL;DR

- **A2 (Template body authoring)** — **Relevant, but NOT a Lovable code change.** It is an **operational task** for the Platform Admin to perform in the running app (`/admin/legal-documents`). All the infrastructure (editor, versioning, activation trigger, backfill) is already shipped in Phase 9 v4. No new feature is needed. Lovable should only act if you want a small UX enabler (see Optional Enabler below).
- **A1 (IN_REVIEW state)** — **Correctly deferred. Do NOT implement now.** The flag-based gating (`lc_review_required` / `fc_review_required`) chosen in v4b is functionally equivalent for the current consumer set, and adding a new `master_status` value has high blast radius (RLS, dashboards, `complete_phase`, queue filters, status mapping, audit log). It should remain in §11 until a real consumer requirement appears.

---

### A2 — Template body authoring

**What it actually is**
Four `legal_document_templates` rows (`RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`) exist in `DRAFT` and need an authored body. Once a Platform Admin clicks **Publish** in the existing editor, `trg_legal_template_activated_backfill` fires and enqueues pending acceptance rows automatically. This is verified in the migration:

```
supabase/migrations/20260426182932_*.sql
  trg_legal_template_activated  AFTER UPDATE OF version_status
  → trg_legal_template_activated_backfill()
```

**Why this is NOT a Lovable build task**
- No schema change, no service change, no UI change is required.
- Authoring legal text is a **content/legal-counsel responsibility**, not a code change.
- `LegalSystemHealthCard` already surfaces these as missing on `/admin/legal-documents`, with deep links into the editor.
- Doing it as a Lovable change would mean hardcoding draft legal text into a migration, which is the wrong owner for the content and creates a versioning lie (`created_by = system` rather than the actual approver).

**Recommendation**
Treat A2 as an **ops checklist item**, not a code task:

1. Platform Admin / Legal Counsel opens `/admin/legal-documents`.
2. For each of `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`: open the DRAFT, paste/author the approved text, **Save Draft** → review → **Publish**.
3. `LegalSystemHealthCard` should turn fully green; the trigger backfills any pending acceptances.

**Optional dev-side enabler (small, justified)**
If you want to reduce friction for the admin, Lovable can add (~30 min of work):

- A "Missing templates" CTA group on `LegalSystemHealthCard` that opens each missing code straight into the editor with a pre-seeded section skeleton (headings only, no legal text) so the admin can paste content into a structured shell.
- A small confirmation note on the Publish dialog summarising "Publishing will enqueue X pending acceptance rows" by reading from the same view the health card uses.

Both are pure UX polish — say the word and we'll do them. Otherwise, no Lovable work is required for A2.

---

### A1 — IN_REVIEW state

**Why deferral is the right call (per v4b decision A2)**

The current flag-based gate already enforces the same business rule:

```text
curator approves
   └─► challenges.master_status = 'ACTIVE'
       lc_review_required = true   ──┐
       fc_review_required = true     │  downstream actions blocked
                                     │  (publish, escrow, payouts)
       LC signs    → lc_review_required = false
       FC signs    → fc_review_required = false ──┘
```

Adding `IN_REVIEW` as a real `master_status` would touch:

- `master_status` CHECK constraint and any RLS policy that enumerates statuses
- `complete_phase` and `complete_legal_review` SQL functions
- `update_master_status` rollup
- Every dashboard / queue filter that lists "active" challenges (Creator dashboard, LC queue, FC queue, Solver discovery view `v_challenge_match`)
- Status badges, lifecycle indicator, audit log status mapping
- Notification routing keyed on status transitions

For zero behavioural improvement over the flags. This is the textbook case for **deferred until a consumer requirement justifies it**.

**Trigger to revisit (write this into §11 if not already there)**
Promote A1 from deferred to active scope if any of the following occur:

1. A reporting / analytics consumer needs to count "challenges awaiting legal" without joining flag columns.
2. A new role (e.g., external auditor) needs RLS scoped specifically to in-review challenges.
3. A regulatory requirement asks for a distinct named state in the audit trail rather than a flag pair.
4. Cross-tenant Provider model surfaces challenges and requires a clean status enum in the public API contract.

Until then: **no action**.

---

### Alignment with Lovable.dev architecture (project rules check)

| Rule | A2 | A1 |
|---|---|---|
| Multi-tenancy & RLS unchanged | ✓ (no schema touch) | ✓ (no schema touch) |
| No new `master_status` enum value (project rule §2: avoid Postgres ENUMs, use CHECK) | n/a | Avoiding it preserves the principle |
| Audit fields integrity (`created_by` reflects real authoring) | ✓ — admin authors content as themselves | n/a |
| Append-only audit on `legal_acceptance_ledger` | ✓ — trigger inserts only | ✓ — flags don't violate it |
| Edge functions / service-role boundary | n/a | n/a |
| 250-line component / lazy-load policy | n/a | n/a |

Both items are aligned with the architecture as-is.

---

### Final disposition

| Item | Status | Action by Lovable |
|---|---|---|
| A2 — Template authoring | Operational, infra complete | **None** (or optional UX enabler if requested) |
| A1 — IN_REVIEW state | Correctly deferred | **None**, keep in §11 with revisit triggers |

If you want the optional A2 UX enabler (deep-link CTAs + publish-dialog impact summary), approve this plan and I'll implement it. Otherwise, no code changes are needed and Phase 9 v4 / v4b can be considered complete from Lovable's side, pending the legal team authoring the four template bodies in the running app.
