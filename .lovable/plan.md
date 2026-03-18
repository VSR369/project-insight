

# LC Review Workflow — Final Corrected Implementation Plan

## Requirements Summary (4 Scenarios)

| Scenario | LC Required? | Gate Behavior |
|----------|-------------|---------------|
| **Admin Activated** | Yes | Hard Gate: GATE-02 fails if `lc_status != 'approved'` for ALL docs |
| **Ad-hoc Request** | No (initially) | Soft-turned-Hard Gate: only docs sent to LC must be `lc_status = 'approved'` before GATE-02 passes |
| **LC Role Missing** | No | No Gate: CR uploads are final immediately, `lc_status` stays NULL |
| **Self-Review** | Yes/No | Auto-Pass: if uploader holds LC role for that challenge, `lc_status` auto-set to `'approved'` |

## Phase A: Database Migrations

### Migration 1 — Schema Additions

```sql
-- 1. Org-level LC toggle
ALTER TABLE seeker_organizations
  ADD COLUMN lc_review_required BOOLEAN DEFAULT false;

-- 2. Challenge-level LC flag (inherited at creation, locked)
ALTER TABLE challenges
  ADD COLUMN lc_review_required BOOLEAN DEFAULT false;

-- 3. LC review columns on challenge_legal_docs
ALTER TABLE challenge_legal_docs
  ADD COLUMN lc_status TEXT DEFAULT NULL,
  ADD COLUMN lc_reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN lc_reviewed_at TIMESTAMPTZ,
  ADD COLUMN lc_review_notes TEXT;

-- 4. Update status validation trigger to allow LC statuses
-- Current trigger allows: ATTACHED, TRIGGERED, SIGNED, EXPIRED
-- lc_status is a SEPARATE column, no trigger change needed

-- 5. Legal review requests table
CREATE TABLE legal_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  document_id UUID REFERENCES challenge_legal_docs(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  lc_user_id UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  is_mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: challenge participants can read; CR can insert; LC can update
```

### Migration 2 — Update `validate_gate_02()`

Add check #5 (mandatory) and #6 (ad-hoc) after existing checks 1-4:

```sql
-- Check 5: Mandatory LC — ALL docs must be approved
IF (SELECT lc_review_required FROM challenges WHERE id = p_challenge_id) THEN
  SELECT COUNT(*) FILTER (WHERE lc_status IS NULL OR lc_status != 'approved')
  INTO v_lc_unapproved
  FROM challenge_legal_docs WHERE challenge_id = p_challenge_id;
  IF v_lc_unapproved > 0 THEN
    v_failures := array_append(v_failures,
      format('%s legal doc(s) pending LC approval', v_lc_unapproved));
  END IF;
END IF;

-- Check 6: Ad-hoc — docs with active review requests must be approved
SELECT COUNT(*) INTO v_adhoc_pending
FROM legal_review_requests lr
JOIN challenge_legal_docs cd ON cd.id = lr.document_id
WHERE lr.challenge_id = p_challenge_id
  AND lr.status = 'pending'
  AND (cd.lc_status IS NULL OR cd.lc_status != 'approved');
IF v_adhoc_pending > 0 THEN
  v_failures := array_append(v_failures,
    format('%s doc(s) awaiting requested LC review', v_adhoc_pending));
END IF;
```

### Migration 3 — Update `initialize_challenge()`

After Step 2 (fetch org), also fetch `lc_review_required` and set it on the challenge:

```sql
-- In Step 2, add to SELECT:
SELECT ..., lc_review_required INTO ..., v_lc_required FROM seeker_organizations WHERE id = p_org_id;

-- In Step 3 INSERT, add column:
lc_review_required = COALESCE(v_lc_required, false)
```

### Migration 4 — `md_system_config` entry

Insert `lc_required_challenge_types` config key (JSONB array, default `[]`) for platform-level scoping.

## Phase B: Hooks & Data Layer

### Self-Approval Logic (Critical)

In the upload/attach mutations within `LegalDocumentAttachmentPage.tsx`, add self-approval check:

```typescript
// After successful upsert, check if user has LC role
const userRoles = await supabase
  .from('user_challenge_roles')
  .select('role_code')
  .eq('user_id', user.id)
  .eq('challenge_id', challengeId)
  .eq('role_code', 'LC')
  .eq('is_active', true);

const hasLcRole = (userRoles.data?.length ?? 0) > 0;
const challenge = /* already fetched */;

if (hasLcRole || !challenge.lc_review_required) {
  // Auto-approve: user IS the LC, or LC not required
  await supabase.from('challenge_legal_docs')
    .update({ lc_status: 'approved', lc_reviewed_by: user.id, lc_reviewed_at: new Date().toISOString() })
    .eq('challenge_id', challengeId)
    .eq('document_type', template.document_type)
    .eq('tier', template.tier);
} else {
  // Set pending — awaits LC
  await supabase.from('challenge_legal_docs')
    .update({ lc_status: 'pending_review' })
    .eq('challenge_id', challengeId)
    .eq('document_type', template.document_type)
    .eq('tier', template.tier);
}
```

### New Hooks

| File | Purpose |
|------|---------|
| `useLegalReviewRequest.ts` | Mutation: CR sends doc(s) to LC. Inserts `legal_review_requests`, sets `lc_status = 'pending_review'` on target docs, invokes `notify-lc-review` edge function |
| `useLcReviewStatus.ts` | Query: fetches `lc_status` for all docs on a challenge + pending `legal_review_requests`. Used by Legal page and GATE-02 UI |

### Modified Hooks

| File | Change |
|------|--------|
| `useCurrentOrg.ts` | Add `lcReviewRequired: boolean` from `seeker_organizations.lc_review_required` |
| `usePublicationReadiness.ts` | Add GATE-11 safeguard check: if `lc_review_required`, verify all docs LC-approved |
| `useRoleReadinessGate.ts` | When `lc_review_required = true`, include LC in mandatory roles list |

## Phase C: LC Review Queue (New Pages)

### `LcReviewQueuePage.tsx` — `/cogni/legal-review`

Dashboard for LC role showing pending review requests with challenge title, requester, date, status. Each row links to the review panel.

### `LcReviewPanel.tsx` — 360-Degree Challenge View

Two-panel layout:
- **Left panel**: Read-only 360-degree view of ALL challenge fields (title, problem, scope, deliverables, evaluation criteria, reward, eligibility, timeline — pulled from all wizard steps)
- **Right panel**: Legal documents list with per-document actions: Approve, Reject (with notes), Upload Replacement, Request Revision

LC actions update `challenge_legal_docs.lc_status` and `legal_review_requests.status`.

### Routing & Sidebar

- Add `/cogni/legal-review` route in `App.tsx`
- Add "Legal Review" sidebar item visible when user has LC role (via `useCogniUserRoles`)

## Phase D: Integration into Existing Pages

### `LegalDocumentAttachmentPage.tsx` — Major Update

- Fetch `lc_review_required` from challenge query (add column to SELECT)
- Fetch user's LC role via `useUserChallengeRoles`
- Per-document: show `lc_status` badge (Approved/Pending/Rejected)
- Conditional button:
  - If user has LC role OR `!lc_review_required` and no ad-hoc request: show "Finalize" button
  - If `lc_review_required` and user lacks LC role: show "Send to Legal Coordinator" button
  - If user wants optional opinion: show "Request LC Opinion" (creates ad-hoc request, which then gates that doc)
- Block "Submit for Curation" when any doc has `lc_status = 'pending_review'` or `'rejected'`

### `StepTemplates.tsx` — Minor

Info banner when `lcReviewRequired`: "Your organization requires Legal Coordinator review. Legal docs will be sent for LC review after saving."

### `CurationChecklistPanel.tsx` — Minor

Add checklist item #15: "Legal Coordinator approval" (when `lc_review_required = true`). Checks all docs have `lc_status = 'approved'`.

### `ApprovalReviewPage.tsx` — Minor

Show LC approval badges in the legal docs section.

## Phase E: Admin Configuration

### Org Settings Page

Add "Require Legal Coordinator Review" toggle:
- AGG model: visible to Seeking Org Admin
- MP model: visible to Platform Admin
- Saves to `seeker_organizations.lc_review_required`

### Platform Admin Config

Add `lc_required_challenge_types` config entry in `md_system_config` for challenge-type-level scoping. When set, `initialize_challenge()` checks this config and overrides the org-level setting for matching challenge types.

## Phase F: Notifications

### Edge Function: `notify-lc-review`

Triggered when `legal_review_requests` is inserted. Sends notification to assigned LC user via `cogni_notifications` table.

## Files Summary

| Category | Files | Count |
|----------|-------|-------|
| Database migrations | 4 migration files | 4 |
| New hooks | `useLegalReviewRequest.ts`, `useLcReviewStatus.ts` | 2 |
| Modified hooks | `useCurrentOrg.ts`, `usePublicationReadiness.ts`, `useRoleReadinessGate.ts` | 3 |
| New pages | `LcReviewQueuePage.tsx`, `LcReviewPanel.tsx` | 2 |
| Modified pages | `LegalDocumentAttachmentPage.tsx`, `StepTemplates.tsx`, `CurationChecklistPanel.tsx`, `ApprovalReviewPage.tsx` | 4 |
| Admin config | Org Settings page, Platform Admin config | 2 |
| Edge function | `notify-lc-review` | 1 |
| Routing | `App.tsx`, sidebar config | 2 |
| **Total** | | **~20** |

## Implementation Order

Phase A (migrations) first, then B (hooks + self-approval logic), then C (LC queue/panel), then D (integrate into existing pages), then E (admin config), then F (notifications).

