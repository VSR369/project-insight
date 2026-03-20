

## Plan: Fix LC Legal Workspace — Root Cause Analysis & Complete Rebuild

### Root Causes Identified

**1. Edge function not deployed (CRITICAL)**
The `suggest-legal-documents` edge function returns 404. The file exists but was never successfully deployed. All 15+ network requests fail with "Failed to fetch". The function needs to be redeployed — this may be a `deno.lock` issue or deployment timing problem.

**2. Auto-fire on page load causes infinite retry loop**
`useLegalSuggestions` fires immediately when `challengeId` is truthy. Combined with `fetchWithRetry` (3 retries with exponential backoff), this creates a storm of failed requests. The user wants a manual "Generate Legal Docs" button instead.

**3. Demo challenge has NULL maturity_level**
The challenge `a7962f69...` has `maturity_level: null`. The edge function passes this to the AI, which still works, but the `get_required_legal_docs` RPC would fail. Not blocking for AI path but needs a sensible default.

**4. Page layout contradicts user requirements**
Current: side-by-side split (2-col challenge summary / 3-col AI suggestions).
Required: single full-width page showing challenge details in the same sequential format the Creator sees, then a "Generate Legal Docs" button, then expandable document cards with inline editing + file attachment.

**5. WorkflowProgressBanner shows wrong role for Step 3**
Says "Challenge Creator (CR)" as next role — should be "Legal Coordinator (LC)".

### Changes

**File 1: Redeploy `supabase/functions/suggest-legal-documents/index.ts`**
- Delete and recreate the edge function to force fresh deployment
- No code changes needed — the function logic is correct
- Use `supabase--deploy_edge_functions` or delete+recreate approach

**File 2: Full rewrite of `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

New layout (single column, full width):

```text
┌─────────────────────────────────────────────────┐
│  WorkflowProgressBanner (Step 3)                │
├─────────────────────────────────────────────────┤
│  CHALLENGE DETAILS (read-only, same as Creator) │
│  ├── Title                                      │
│  ├── Problem Statement                          │
│  ├── Scope & Constraints                        │
│  ├── Description                                │
│  ├── Deliverables (numbered list)               │
│  ├── Evaluation Criteria (weighted table)        │
│  ├── IP Model                                   │
│  ├── Governance Profile                         │
│  └── Solver Eligibility                         │
├─────────────────────────────────────────────────┤
│  [✨ Generate Legal Documents]  ← button        │
├─────────────────────────────────────────────────┤
│  AI SUMMARY BANNER (after generation)           │
├─────────────────────────────────────────────────┤
│  DOCUMENT CARDS (collapsible)                   │
│  ├── NDA — Tier 1 — Required                    │
│  │   ├── AI content (inline editable textarea)  │
│  │   ├── Upload file / paste link               │
│  │   └── [Accept & Attach]                      │
│  ├── Challenge Terms — Tier 1 — Required        │
│  │   └── ...                                    │
│  └── IP Assignment — Tier 2 — Recommended       │
│      └── ...                                    │
├─────────────────────────────────────────────────┤
│  SUBMIT TO CURATION                             │
└─────────────────────────────────────────────────┘
```

Key changes:
- Remove auto-trigger of AI suggestions; add explicit "Generate Legal Documents" button
- Show full challenge details in read-only accordion sections (reuse section rendering from CurationReviewPage patterns)
- Each document card has: inline textarea editor for AI content, file upload button, external link input, LC notes
- Include `WorkflowProgressBanner` at top with step=3
- Fetch more challenge fields: `reward_structure, phase_schedule, evaluation_criteria, eligibility, solver_eligibility_types, hook`

**File 3: Update `src/components/cogniblend/WorkflowProgressBanner.tsx`**

Step 3 `nextRole`: Change from `'Challenge Creator (CR)'` to `'Legal Coordinator (LC)'` — wait, checking: Step 3 currently says nextRole is `'Curator (CU)'` and nextLabel is `'Curation Review'`. That's correct. But the step description says "Attach required Tier 1 & Tier 2 legal documents, then submit for curation." — update to clarify LC role: "Legal Coordinator reviews challenge, generates and attaches legal documents, then submits for curation."

**File 4: Update `src/pages/cogniblend/AISpecReviewPage.tsx`**

Lines 1105 and 1142: After spec approval, in AI path, navigate to `/cogni/dashboard` instead of `/cogni/challenges/${challengeId}/legal`, since the LC (not Creator) handles legal docs. Add path detection:
- If AI path: toast "Specification approved. Legal Coordinator will prepare documents." → navigate to dashboard
- If manual path: keep existing navigation to `/cogni/challenges/${challengeId}/legal`

**File 5: Update `src/pages/cogniblend/ChallengeWizardPage.tsx`**

Lines 508-511 and 545-548: Same fix for manual path — Enterprise challenges should still navigate to legal page (Creator attaches docs in manual path). No change needed here since manual path is correct.

**File 6: Fix `ROLE_PRIMARY_ACTION` in `src/types/cogniRoles.ts`**

LC primary action route: Change from `/cogni/legal` (placeholder page) to `/cogni/lc-queue`.

### Technical Details

- The edge function deployment issue is likely caused by a stale `deno.lock` or deployment race condition. Deleting and recreating forces a clean deploy.
- The `suggest-legal-documents` function code is correct — it queries the `challenges` table with service role key, passes data to Gemini via AI Gateway, and returns structured tool call output.
- The `challenge_legal_docs` table schema supports all needed fields (document_type, tier, status, lc_status, lc_reviewed_by, lc_review_notes, version_history).
- The inline editor uses a `Textarea` for AI-generated content that LC can freely modify before accepting.
- File upload goes to the `legal-docs` storage bucket (already configured).

