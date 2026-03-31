

# BRD Compliance Audit — Gap Status Report

## Summary

Of the 15 original gaps, **14 are CLOSED** and **1 remains OPEN**. Additionally, 3 downstream references to the removed `cogni_demo_path` sessionStorage key remain in non-Creator pages.

---

## Category A: Creator Page — 3/4 CLOSED

| Gap | Status | Evidence |
|-----|--------|----------|
| **A1** Page rewrite | CLOSED | `ChallengeCreatePage.tsx` is 310 lines. TrackCard, ActiveView, wizard, AI intake all removed. GovernanceEngagementSelector + ChallengeCreatorForm only. |
| **A2** Governance-aware schema | CLOSED | `buildCreatorSchema()` builds dynamic Zod per mode — QUICK (5 required), STRUCTURED (8), CONTROLLED (13). |
| **A3** `governance_mode_override` stored | CLOSED | `useSubmitSolutionRequest.ts` line 88: `governance_mode_override: payload.governanceModeOverride ?? null` |
| **A4** File Upload + URL input on Tab 2 | **OPEN** | `AdditionalContextTab.tsx` has no file upload component or URL input field. Only rich text fields + timeline select. |

---

## Category B: Role & Assignment — 3/3 CLOSED

| Gap | Status | Evidence |
|-----|--------|----------|
| **B1** LC/FC source TODO | CLOSED | `useAutoAssignChallengeRoles.ts` has TODO comment (deferred, non-blocking). |
| **B2** ID auto-assign removed | CLOSED | Search for `roleCode.*ID` in AISpecReviewPage returns 0 matches. |
| **B3** Cancel permission fixed | CLOSED | Search for `includes('ID')` in useCancelChallenge returns 0 matches (changed to CU). |

---

## Category C: Legal & Escrow — 3/3 CLOSED

| Gap | Status | Evidence |
|-----|--------|----------|
| **C1** QUICK auto-attach Tier 1 defaults | CLOSED | `useSubmitSolutionRequest.ts` lines 120-137: inserts from `legal_document_templates` with `status: 'auto_accepted'`. |
| **C2** STRUCTURED "Accept All" button | CLOSED | `LegalDocsSectionRenderer.tsx` has "Accept All Defaults" button when `governanceMode === 'STRUCTURED'`. |
| **C3** STRUCTURED escrow toggle | CLOSED | `StructuredFieldsSectionRenderer.tsx` has `Switch` component with `onEscrowToggle` callback for STRUCTURED mode. |

---

## Category D: Dashboard & Navigation — 2/2 CLOSED

| Gap | Status | Evidence |
|-----|--------|----------|
| **D1** Unified dashboard (no role filter) | CLOSED | `MyActionItemsSection.tsx` line 151 comment: "no activeRole filter". Role badges added per item. |
| **D2** MP Creator nav restriction | CLOSED | `useCogniPermissions` already restricts nav visibility by role codes — CR cannot see curation/legal/review items. |

---

## Category E: Demo & Cleanup — 2/3 CLOSED (1 partial)

| Gap | Status | Evidence |
|-----|--------|----------|
| **E1** DemoLoginPage AI/Manual split removed | CLOSED | `DemoLoginPage.tsx` uses unified `DemoUser` interface with single `destination` field. No tab split. |
| **E2** Tab params removed from destinations | CLOSED | All Creator destinations point to `/cogni/challenges/create` (no `?tab=` params). `cogni_demo_path` removed from DemoLoginPage. |
| **E3** Tier-gate engagement model | CLOSED | `GovernanceEngagementSelector` uses `getAvailableGovernanceModes(tierCode)` to restrict modes by tier. |

---

## Remaining Work

### 1. Gap A4 — File Upload + URL Input (MEDIUM)

**AdditionalContextTab** needs two additions:
- A file upload component (max 5 files, stored in Supabase Storage under `{tenant_id}/challenges/{challenge_id}/`)
- A URL input field for reference links

**Implementation plan:**
- Add a `reference_urls` field (array of strings) to the form schema
- Add a URL input with "Add" button that appends to the array
- Add a file upload dropzone using Supabase Storage (`challenges` bucket)
- Store file references in `challenge_attachments` table or in `extended_brief.attachments` JSONB
- This requires a new storage bucket + RLS policy, or a new `challenge_attachments` table

### 2. Stale `cogni_demo_path` References (LOW)

Three files still read `cogni_demo_path` from sessionStorage even though DemoLoginPage no longer sets it:
- `AISpecReviewPage.tsx` (lines ~1347, ~1449)
- `LcLegalWorkspacePage.tsx` (line ~769)
- `LcChallengeQueuePage.tsx` (lines ~17-21)

These are dead code paths (the value will always be null). They should be cleaned up but are non-blocking.

---

## Verdict

**14 of 15 gaps CLOSED.** One medium-priority gap (A4: file upload + URL input) remains unimplemented. Three stale `cogni_demo_path` reads are dead code that should be cleaned up.

