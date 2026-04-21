

# Plan — Retire the redundant "Legal Review" surface

## Confirmation of overlap

| Surface | Route | What it does | Data source |
|---|---|---|---|
| **Legal Workspace** (keep) | `/cogni/lc-queue` → `/cogni/challenges/:id/lc-legal` | Upload Creator/Curator/LC source docs → Pass 3 / Organize & Merge → review unified SPA → Approve. **All legal work happens here.** | `challenge_legal_docs` (SOURCE_DOC + UNIFIED_SPA) |
| **Legal Review** (retire) | `/cogni/legal-review` → `/cogni/legal-review/:id` | Per-document approval inbox tied to `legal_review_requests` rows. | `legal_review_requests` table |

The only code path that ever inserted a `legal_review_requests` row is `LegalDocumentAttachmentPage` — the **legacy** template-attach page that the current LC queue no longer routes to (`LcChallengeQueuePage` was redirected to `/lc-legal` in an earlier sprint). Net effect: the inbox is permanently empty. The route is duplicate UX with no live producer.

## What to remove

1. **Sidebar item** — drop `Legal Review` from `CogniSidebarNav.tsx` (line 50). Legal Workspace becomes the single LC entry point.
2. **Routes** — delete `/cogni/legal-review` and `/cogni/legal-review/:challengeId` from `App.tsx`. Drop the lazy imports of `LcReviewQueuePage` and `LcReviewPanel`.
3. **Header label** — drop the entry from `CogniShell.tsx` route-title map.
4. **Pages** — delete `src/pages/cogniblend/LcReviewQueuePage.tsx` and `src/pages/cogniblend/LcReviewPanel.tsx`.
5. **Legacy producer** — delete `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` (it's the only file still importing `useLegalReviewRequest`; the LC queue already bypasses it). Remove its route mount if any remains in `App.tsx`.
6. **Hooks no longer needed by any UI** — delete:
    - `src/hooks/cogniblend/useLegalReviewRequest.ts`
    - `src/hooks/cogniblend/useLcReviewStatus.ts`
7. **Edge function** — delete `supabase/functions/notify-lc-review/` and its registration in `supabase/config.toml`.

## What to keep

- `legal_review_requests` **table** stays in the DB (additive policy — no destructive schema changes). It will simply be unused. Cheap, future-proofs an ad-hoc per-doc review feature if ever needed.
- `useLcLegalData`, `useLcPass3Review`, `useLcPass3Mutations`, `LcLegalWorkspacePage`, `LcUnifiedAgreementCard`, `Pass3*` components — untouched. This is the canonical flow.
- All Curator / Creator / QUICK / CONTROLLED governance behaviour — untouched.

## Files touched

| File | Action |
|---|---|
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | edit (−1 line) |
| `src/components/cogniblend/shell/CogniShell.tsx` | edit (−1 line) |
| `src/App.tsx` | edit (−4 lines: 2 lazy imports + 2 routes; also drop `LegalDocumentAttachmentPage` route if mounted) |
| `src/pages/cogniblend/LcReviewQueuePage.tsx` | delete |
| `src/pages/cogniblend/LcReviewPanel.tsx` | delete |
| `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` | delete |
| `src/hooks/cogniblend/useLegalReviewRequest.ts` | delete |
| `src/hooks/cogniblend/useLcReviewStatus.ts` | delete |
| `supabase/functions/notify-lc-review/*` | delete |
| `supabase/config.toml` | edit (drop function entry) |

**Net:** ~−900 lines, one canonical LC entry point, zero functional regression because the deleted surface had no live producer.

## Verification

1. `grep -rn "legal-review\|LcReviewQueue\|LcReviewPanel\|useLegalReviewRequest\|useLcReviewStatus\|notify-lc-review\|LegalDocumentAttachmentPage" src/ supabase/` returns zero hits.
2. Sidebar shows only **Legal Workspace** for LC users.
3. Navigating to `/cogni/legal-review` 404s into the existing NotFound page (acceptable — link is gone).
4. LC end-to-end flow on `/cogni/challenges/:id/lc-legal` unchanged: upload → Pass 3 / Organize & Merge → Accept → phase advance.
5. STRUCTURED Curator Legal tab unchanged.
6. `npx tsc --noEmit` passes.
7. Memory `mem://cogniblend/legal/architecture-v2-framework` updated: "Single LC entry point — `/cogni/lc-queue` → `/lc-legal`. The `legal_review_requests` table and `/cogni/legal-review` surface have been retired."

## Out of scope

- Dropping the `legal_review_requests` table (kept for future per-doc workflow, no cost while unused).
- Any change to Pass 1 / Pass 2 / governance / submission RPCs.
- QUICK auto-accept path.

