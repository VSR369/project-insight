

## Plan: Two-Tab Demo Login with Explicit AI vs Manual Paths — COMPLETED

### Summary
Implemented two-tab demo login (AI-Assisted vs Manual Editor) with path-aware routing and `sessionStorage` context.

---

## Plan: Fix Legal Coordinator Workflow + Enhance FC Escrow Details — COMPLETED

### What was done

1. **DB Migration**: Extended `escrow_records` with `bank_name`, `bank_branch`, `bank_address`, `currency`, `deposit_date`, `deposit_reference`, `fc_notes`
2. **Edge Function**: Created `suggest-legal-documents` — AI analyzes challenge spec and suggests required legal docs with rationale and content summaries
3. **LcLegalWorkspacePage** (`/cogni/challenges/:id/lc-legal`): LC receives challenge from Creator, AI suggests docs, LC reviews/accepts/attaches, then submits to Curation
4. **EscrowManagementPage** (`/cogni/escrow`): FC sees assigned challenges, enters banking details, confirms escrow deposit
5. **Updated routes**: Added new routes in App.tsx, replaced escrow placeholder
6. **Updated DemoLoginPage**: LC description corrected to reflect document creation role
7. **Updated DemoWorkflowSteps**: Step 3 AI note corrected to "AI suggests docs, LC reviews"
8. **Extended EscrowRecord interface**: Added banking fields to useEscrowDeposit hook

### Workflow (Corrected)
```
AI Path:
  CR creates with AI → CR reviews spec → LC receives challenge
  → AI suggests legal docs → LC reviews/modifies/attaches → Submit to Curation
  → CU reviews full package with AI quality check
  → ID approves → FC confirms escrow (parallel) → Publication

Manual Path:
  CR creates via 8-step wizard → CR attaches legal docs
  → LC reviews (if mandatory) → Submit to Curation
  → CU reviews → ID approves → FC confirms escrow → Publication
```
