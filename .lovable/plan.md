

# Legal Architecture V2 — Complete Implementation Plan

## Status Summary

| Prompt | Status | What's Done |
|--------|--------|-------------|
| 1 — Database Migration | **~30% done** | Constraint updates + SPA/SKPA/PWA seed + types. Missing: freeze columns, assembly columns, 3 RPCs, trigger, pgcrypto |
| 2 — Platform Admin UI | Not started | |
| 3 — Org Admin CPA Templates | Not started | |
| 4 — Curator Freeze + Legal Review | Not started | |
| 5 — LC Review Assembled CPA | Not started | |
| 6 — Integrity + Pre-Flight Gate | Not started | |
| 7 — Solver Enrollment + PWA | Not started | |

---

## Implementation Sequence

### Step 1: Complete Prompt 1 — Remaining Database Migration

New migration to add everything that's missing:

- **Part A**: Add `curation_frozen_at`, `curation_frozen_by`, `legal_review_content_hash`, `curation_lock_status` (with CHECK) to `challenges`
- **Part B**: Add `content`, `content_html`, `assembled_from_template_id`, `assembly_variables`, `reviewer_notes`, `is_assembled`, `reviewed_by`, `reviewed_at` to `challenge_legal_docs`
- **Part D**: `freeze_for_legal_review` RPC — validates Phase 2, computes SHA-256 hash, sets FROZEN
- **Part E**: `unfreeze_for_recuration` RPC — resets to OPEN, deletes assembled docs
- **Part F**: `assemble_cpa` RPC — resolves org template by governance mode, substitutes `{{variables}}`, inserts assembled CPA
- **Part G**: `trg_prevent_frozen_content_edit` trigger — blocks content edits when FROZEN
- **Part H**: `CREATE EXTENSION IF NOT EXISTS pgcrypto`

No frontend changes.

---

### Step 2: Prompt 2 — Platform Admin: 3 Document Cards

**Modified**: `src/pages/admin/legal/LegalDocumentListPage.tsx` — add imports for new components

**New files**:
- `src/components/admin/legal/PlatformAgreementsSection.tsx` (~120 lines) — "Platform Agreements (3)" section with description banner, 3 cards for SPA/SKPA/PWA
- `src/components/admin/legal/PlatformAgreementCard.tsx` (~90 lines) — Card showing name, code, status badge, "Content needed" amber badge, "Edit" button linking to existing editor
- `src/components/admin/legal/LegacyDocumentsSection.tsx` (~80 lines) — Collapsed "Legacy Documents (archived)" section, greyed out, read-only

---

### Step 3: Prompt 3 — Org Admin: 3 CPA Template Cards

**Modified**: `src/components/org-settings/OrgLegalTemplatesTab.tsx` — add CPA section at top

**New files**:
- `src/components/org-settings/CpaTemplateSection.tsx` (~100 lines) — "Challenge Participation Agreements" header with 3 cards
- `src/components/org-settings/CpaTemplateCard.tsx` (~130 lines) — Card with governance mode badge (green/blue/purple), word count, "Edit Template" or "Create Template" button
- `src/components/org-settings/CpaVariableReference.tsx` (~80 lines) — Collapsible reference listing all `{{variable}}` placeholders
- `src/constants/cpaDefaults.constants.ts` (~120 lines) — Default template content for QUICK/STRUCTURED/CONTROLLED

**Hook**: `src/hooks/queries/useOrgCpaTemplates.ts` (~80 lines) — CRUD for org CPA templates in `org_legal_document_templates`

---

### Step 4: Prompt 4 — Curator: Freeze + Legal Review

**New files**:
- `src/components/cogniblend/curation/FreezeStatusBanner.tsx` (~70 lines) — OPEN/FROZEN/RETURNED banners
- `src/components/cogniblend/curation/LegalReviewPanel.tsx` (~190 lines) — Assembled CPA editor for STRUCTURED, approve/unlock buttons
- `src/hooks/cogniblend/useFreezeActions.ts` (~80 lines) — Mutations for freeze/unfreeze/assemble RPCs

**Modified**:
- `src/components/cogniblend/curation/CurationActions.tsx` — Change submit button to "Complete Curation & Send to Legal" when OPEN, show mode-specific UI when FROZEN
- `CurationReviewPage.tsx` — Fetch lock status, show banner, disable editing when frozen

---

### Step 5: Prompt 5 — LC: Review Assembled CPA

**New files**:
- `src/components/cogniblend/lc/AssembledCpaSection.tsx` (~190 lines) — CPA editor with variables collapsible, AI review button
- `src/components/cogniblend/lc/LcReturnToCurator.tsx` (~100 lines) — Return dialog with mandatory reason
- `src/components/cogniblend/lc/LcApproveAction.tsx` (~100 lines) — Approve button, sets lc_compliance_complete

**Modified**: `src/pages/cogniblend/LcLegalWorkspacePage.tsx` — Minimal: import and render 3 new components at top

---

### Step 6: Prompt 6 — Integrity + Pre-Flight Gate

**New files**:
- `src/lib/cogniblend/contentHashVerifier.ts` (~55 lines) — Recomputes SHA-256 hash client-side, compares with stored hash

**Modified**: Pre-flight gate component — add "Legal Content Integrity" check row with governance-specific logic (QUICK=auto-green, STRUCTURED=curator_reviewed, CONTROLLED=lc_approved)

---

### Step 7: Prompt 7 — Solver Enrollment + PWA Onboarding

**New files**:
- `src/components/cogniblend/solver/SpaAcceptanceGate.tsx` (~150 lines) — SPA acceptance at registration/login
- `src/components/cogniblend/solver/CpaEnrollmentGate.tsx` (~150 lines) — Challenge-specific CPA at enrollment
- `src/components/cogniblend/workforce/PwaAcceptanceGate.tsx` (~150 lines) — PWA for MP workforce roles

**Modified**:
- Solver registration/onboarding flow — integrate SPA gate
- Challenge enrollment flow — replace old multi-doc with single CPA
- CurationReviewPage, LcLegalWorkspacePage, EscrowManagementPage — integrate PWA gate for MP model

---

## File Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Database | 1 migration | — |
| Admin UI | 3 components | 1 page |
| Org Admin | 4 components + 1 hook + 1 constants | 1 component |
| Curator | 2 components + 1 hook | 2 files |
| LC | 3 components | 1 page |
| Integrity | 1 utility | 1 component |
| Enrollment | 3 components | 3 files |
| **Total** | **~19 new files** | **~9 modified files** |

All component files kept under 200 lines. Each prompt implemented sequentially, verified before moving to the next. Implementation will start with completing the Prompt 1 migration.

