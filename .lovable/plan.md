

# Revised Plan — E2E Smoke Test (with 3 confirmed defects to fix first)

## What you reported, confirmed via DB + code

You're on `/cogni/challenges/25ca71a0…/legal` (an **MP × CONTROLLED, Phase 2** challenge). Three real defects:

### Defect D1 — Wrong LC route mounted
- `/cogni/challenges/:id/legal` → `LegalDocumentAttachmentPage` (legacy template-attach view, **no Pass-3, no AI suggestions**)
- `/cogni/challenges/:id/lc-legal` → `LcLegalWorkspacePage` (the real workspace with `LcPass3ReviewPanel` + `LcAttachedDocsCard` + AI suggestions)
- `LcChallengeQueuePage` navigates LC users to the **legacy** path. **That is why you don't see Pass-3.**

### Defect D2 — Curator-uploaded legal docs absent for this challenge
- `challenge_legal_docs` for `25ca71a0…` returns **0 rows**.
- Creator's `LegalDocUploadSection` only attaches Tier-1 customs; default platform templates are never **persisted as rows** into `challenge_legal_docs` until an LC/Curator accepts them. So the LC opens to "No docs" because nothing was seeded by the Creator nor pre-attached by the Curator.

### Defect D3 — STRUCTURED Curator missing the same Pass-3 capability
- `CuratorComplianceTab.tsx` already mounts `LcPass3ReviewPanel` ✅ and `LcAttachedDocsCard` ✅ — but the **"Add Document" form** and the **AI-suggestions section** (both available to LC) are NOT rendered for the Curator. So in STRUCTURED, the Curator can review Pass-3 but cannot add a new document or accept AI-suggested templates inline.

---

## Fixes (apply BEFORE smoke test)

### F1 — Repoint LC queue to the real workspace
- `src/pages/cogniblend/LcChallengeQueuePage.tsx` → change `navigate(\`/cogni/challenges/\${id}/legal\`)` to `navigate(\`/cogni/challenges/\${id}/lc-legal\`)`.
- Same for any `Open` / `Review Documents` button click handlers in that page.
- Optionally redirect the legacy `/legal` route to `/lc-legal` for any lingering deep-links.

### F2 — Auto-seed default legal-doc rows when Creator submits to Phase 2 (or earliest Phase the LC sees them)
- Add a one-shot RPC `seed_default_legal_docs(p_challenge_id)` that inserts the standard platform templates as `status='ai_suggested'` rows (so they appear in the LC's `LcAiSuggestionsSection` ready to Accept). Resolve templates via existing `useLegalTemplatePreview` logic (engagement_model + org_id branching for AGG vs MP).
- Trigger it from `complete_phase` when transitioning Phase 1 → Phase 2 (or call it idempotently from `send_to_legal_review` for CONTROLLED, and from `CuratorComplianceTab` mount for STRUCTURED).

### F3 — Add the same Add-Doc form + AI-suggestions panel to `CuratorComplianceTab`
- Mount `LcAddDocumentForm` and `LcAiSuggestionsSection` inside the **Legal** tab of `CuratorComplianceTab.tsx`, wired through the same `useAttachedLegalDocs` / `usePersistedSuggestions` hooks already in scope.
- Reuse the mutation handlers from `LcLegalWorkspacePage` by extracting them to a shared hook `useLcLegalActions(challengeId, userId)` (DRY — avoids duplicating ~150 lines).

---

## Revised Smoke Test (after F1-F3)

### Layer 1 — Backend (DB + RPC) — ~2 min
1. Schema sanity: `cu_compliance_mode`, `pending_curator_review` CHECK, all 6 RPCs, force-MP-approval trigger.
2. Seeding probe: call `seed_default_legal_docs` on a fresh test challenge → assert ≥3 platform-default rows inserted as `status='ai_suggested'`.
3. **Path 1 (MP × STRUCTURED)** — Creator submits → Curator opens compliance tab → defaults visible as suggestions → Curator accepts all → Pass-3 runs → `complete_curator_compliance` → Creator approval requested.
4. **Path 2 (MP × CONTROLLED)** — `send_to_legal_review` → defaults seeded + LC/FC assigned → LC sees suggestions + Pass-3 at `/lc-legal` → both submit → status flips to `pending_curator_review` → `curator_forward_pack_to_creator` → Creator approval.
5. **Path 3 (AGG × STRUCTURED, opt-out)** — Curator-only, defaults seeded, accept-all + Pass-3 → auto-publish to Phase 4.
6. **Path 4 (AGG × CONTROLLED, opt-in)** — full LC/FC chain → Curator → Creator approval → Phase 4.
7. Cleanup: soft-delete the 4 test challenges.

### Layer 2 — UI guards (browser) — ~3 min
- U1: MP challenge → "Require creator approval" disabled-and-on with helper text.
- U2: LC user → `/cogni/lc-queue` excludes STRUCTURED; deep-link to STRUCTURED `/lc-legal` shows "Not applicable" empty state.
- F1: LC user clicks queue row → lands on `/lc-legal` (NOT `/legal`); Pass-3 panel + Attached Docs card both visible.
- F3: STRUCTURED Curator → CurationReviewPage → Compliance Tab shows Pass-3 + Attached Docs + Add-Document form + AI Suggestions, all functional.

### Layer 3 — UI flow (browser) — ~5 min
End-to-end MP × CONTROLLED happy path on **this** challenge `25ca71a0…`:
1. As Curator (`5c67ff44…`) → CurationReviewPage → Send to Legal → toast confirms LC + FC assigned and defaults seeded.
2. As LC (`ce8709b2…` or `03e09698…`) → `/cogni/lc-queue` → click row → `/lc-legal` opens → confirm seeded suggestions visible → Accept all → Run Pass 3 → Accept Pass 3 → Submit to Curation.
3. As FC (`2ab04229…`) → `/cogni/fc-queue` → submit escrow.
4. As Curator → see `CuratorPackReviewPanel` → Forward Pack to Creator.
5. As Creator (`376d7eb8…`) → see approval card → approve → Phase 4.

### Deliverable
`/mnt/documents/s9r_smoke_report.md` with ✅/❌ per scenario, SQL evidence, browser screenshots at each checkpoint, and a final GO/NO-GO.

---

## Switch-out-of-plan-mode requirements
- `supabase--read_query` for evidence
- A migration (write) for: (a) `seed_default_legal_docs` RPC, (b) hook into `complete_phase` / `send_to_legal_review`
- File edits for F1 (queue navigation), F3 (Curator Compliance Tab), and a new `useLcLegalActions` shared hook
- `browser-*` tools for Layers 2 & 3
- `code--exec` to write the report

## Out of scope
AI Pass 1/2 quality, solver flows (Phase 4+), notification email delivery, performance tests, RLS policy changes.

