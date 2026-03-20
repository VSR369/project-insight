

## Plan: Fix Legal Coordinator Workflow + Enhance FC Escrow Details

### Current Issues Identified

1. **Legal Document Ownership is Wrong in Concept**: The current `LegalDocumentAttachmentPage` is used by the Creator (CR) to attach legal docs before submitting to curation. The user's correction: **Legal Coordinator (LC)** should be the one who creates/attaches legal documents — they receive the challenge from CR, AI suggests required documents, LC reviews/modifies/uploads, then submits to Curator.

2. **FC Escrow Page is a Placeholder**: `/cogni/escrow` renders a `CogniPlaceholderPage` with no real functionality. The `EscrowDepositSection` exists only on the Publication Readiness page. FC needs a dedicated page to enter bank details (bank name, branch, address, currency, amount, date/time).

3. **`escrow_records` table is too thin**: It only has `deposit_amount`, `escrow_status`, `remaining_amount` — no bank details, currency, branch, etc.

### Changes

**File 1: DB Migration — Extend `escrow_records` with banking details**

Add columns to `escrow_records`:
- `bank_name` (text, nullable)
- `bank_branch` (text, nullable)  
- `bank_address` (text, nullable)
- `currency` (text, default 'USD')
- `deposit_date` (timestamptz, nullable)
- `deposit_reference` (text, nullable — bank transaction reference)
- `fc_notes` (text, nullable)

**File 2: New Edge Function `suggest-legal-documents`**

An AI function that analyzes the challenge spec (maturity level, IP model, scope, solver eligibility) and suggests:
- Which legal document types are needed and why
- Draft content summaries for each document
- Priority order for the LC to review

Uses the same Lovable AI Gateway pattern as `check-challenge-quality`.

**File 3: New Page `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

Route: `/cogni/challenges/:id/lc-legal` (LC's dedicated workspace)

This replaces the LC's entry point in the AI path. Layout:
- Left panel: Read-only challenge summary (title, problem, scope, IP model, deliverables) — showing what CR created
- Right panel: AI-suggested legal documents list with "Review AI Suggestion" expandable cards
- Each card shows: document type, AI-suggested content preview, Accept/Modify/Upload Custom buttons
- LC can accept AI suggestion (auto-attaches default), modify content, or upload custom document
- Submit button triggers GATE-02 validation and advances to Curation (Phase 3)

**File 4: New Page `src/pages/cogniblend/EscrowManagementPage.tsx`**

Route: `/cogni/escrow` (replaces placeholder)

FC sees challenges assigned to them that require escrow. For each:
- Challenge title, reward structure summary, escrow applicability status
- Form to enter: Bank Name, Branch, Address, Currency (dropdown), Deposited Amount, Deposit Date, Deposit Reference
- "Confirm Escrow Deposit" button saves to `escrow_records` with status `FUNDED`
- Read-only view if already funded

**File 5: Update `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx`**

Add path-awareness:
- If `sessionStorage.getItem('cogni_demo_path') === 'ai'` AND user has LC role: redirect to `/cogni/challenges/:id/lc-legal` (the new AI-assisted legal workspace)
- If manual path or CR role: keep existing behavior (CR attaches docs manually)

**File 6: Update `src/hooks/cogniblend/useEscrowDeposit.ts`**

- Extend `EscrowRecord` interface with new banking fields
- Update `useVerifyEscrow` mutation to save banking details alongside status change

**File 7: Update `src/App.tsx`**

- Add route: `/cogni/challenges/:id/lc-legal` → `LcLegalWorkspacePage`
- Replace `/cogni/escrow` placeholder with `EscrowManagementPage`

**File 8: Update `src/pages/cogniblend/DemoLoginPage.tsx`**

- LC's `aiDestination` changes to `/cogni/challenges/a7962f69-.../lc-legal` (the demo challenge)
- FC's `aiDestination` changes to `/cogni/escrow` (now a real page)

**File 9: Update `src/components/cogniblend/demo/DemoWorkflowSteps.tsx`**

- Step 3 note for AI path: "AI suggests docs, LC reviews" (not "Upload & AI review")

### Workflow Correction Summary

```text
AI Path:
  CR creates with AI → CR reviews spec → LC receives challenge
  → AI suggests legal docs → LC reviews/modifies/uploads → Submit to Curation
  → CU reviews full package (spec + legal) with AI quality check
  → ID approves → FC confirms escrow (parallel) → Publication

Manual Path:
  CR creates via 8-step wizard → CR attaches legal docs
  → LC reviews (if mandatory) → Submit to Curation
  → CU reviews → ID approves → FC confirms escrow → Publication
```

### Technical Details

- The `suggest-legal-documents` edge function queries `md_legal_doc_templates` and the challenge's maturity/IP model to determine required docs, then asks AI to explain relevance and suggest content
- `LcLegalWorkspacePage` uses `useUserChallengeRoles` to verify LC role access
- Escrow applicability is determined by `challenge.reward_structure.payment_mode === 'escrow'` and governance profile (Enterprise only, per existing rules)
- No changes to `complete_phase`, `validate_phase_transition`, or RLS policies

