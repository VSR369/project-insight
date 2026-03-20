

## Current State Assessment

### The Problem
After "Create with AI" → AI Spec Review, both the "Confirm & Submit" (QUICK) and "Approve & Continue" (STRUCTURED) buttons simply `navigate('/cogni/dashboard')` — they do **nothing**. No phase transition, no database update, no routing to the next step. The user lands on the dashboard with no indication of what happened or what to do next.

### Answer 1: Where to Set Up Pricing Tiers, Governance Models, Engagement Models

These are all configured in the **Admin Portal** (not the Org portal):

| Config | Admin Route | Sidebar Location |
|--------|------------|-----------------|
| Subscription Tiers | `/admin/seeker-config/subscription-tiers` | Admin → Seeker Config → Subscription Tiers |
| Engagement Models | `/admin/seeker-config/engagement-models` | Admin → Seeker Config → Engagement Models |
| Governance Rules | `/admin/seeker-config/governance-rules` | Admin → Seeker Config → Governance Rules |
| Challenge Complexity | `/admin/seeker-config/challenge-complexity` | Admin → Seeker Config → Challenge Complexity |
| Pricing Overview | `/admin/seeker-config/pricing-overview` | Admin → Seeker Config → Pricing Overview |

Login as a **Platform Admin** (Supervisor tier) to access these.

### Answer 2: The Intended Flow (Currently Broken Navigation)

The full challenge lifecycle has 13 phases. The expected sequence from creation to Innovation Director:

```text
STEP 1: Create with AI (/cogni/challenges/create)
  → Role: Challenge Requestor (RQ) or Challenge Creator (CR)
  → Fills 6-field intake, AI generates spec

STEP 2: AI Spec Review (/cogni/challenges/:id/spec)
  → Role: CR or RQ
  → Reviews AI output, edits sections
  → "Approve" should save edits + advance to Phase 2

STEP 3: Legal Document Attachment (/cogni/challenges/:id/legal)
  → Role: CR
  → Attaches Tier 1/2 legal documents
  → GATE-02 validates → advances to Phase 3

STEP 4: Curation Queue (/cogni/curation)
  → Role: Curator (CU)
  → 14-point checklist review
  → "Submit to Innovation Director" → Phase 4

STEP 5: Innovation Director Approval (/cogni/curation/:id)
  → Role: Innovation Director (ID)
  → Approve/Return/Reject
  → Approve → Phase 5 → Publication Readiness

STEP 6: Publication (/cogni/challenges/:id/publish)
  → Final checks → Published
```

---

## Plan: Fix Navigation Flow + Add Contextual Instructions

### Change 1: Fix Spec Review Submit Handlers
**File: `src/pages/cogniblend/AISpecReviewPage.tsx`**

- `handleConfirmSubmit` (QUICK) and `handleApproveAndContinue` (STRUCTURED): Instead of just navigating to dashboard, navigate to the **Legal Document Attachment** page: `/cogni/challenges/${challengeId}/legal`
- Show a success toast: "Specification approved. Proceeding to legal document attachment."
- Save any edited section values to the database before navigating (upsert to `challenges` table)

### Change 2: Add Workflow Progress Banner to Each Screen
**New component: `src/components/cogniblend/WorkflowProgressBanner.tsx`**

A small, reusable banner showing:
- Current step name and number (e.g., "Step 2 of 6: Spec Review")
- Next step preview (e.g., "Next: Legal Document Attachment")
- Required role for the next step (e.g., "Role: Curator")
- Visual step indicator (dots or mini progress bar)

### Change 3: Add Banner to Key Pages
Add `WorkflowProgressBanner` to:
- **AISpecReviewPage** — "Step 2: Spec Review → Next: Legal Documents (Role: CR)"
- **LegalDocumentAttachmentPage** — "Step 3: Legal Docs → Next: Curation Queue (Role: Curator)"
- **CurationChecklistPanel** — "Step 4: Curation → Next: ID Approval (Role: Innovation Director)"
- **ChallengeManagePage** — Show current phase status

### Change 4: Add "What's Next" Card to Dashboard
**File: `src/pages/cogniblend/CogniDashboardPage.tsx`**

Add a prominent card/alert at the top when a user has challenges in intermediate phases, showing:
- Challenge title and current phase
- What action is needed and which role should take it
- Direct link to the correct page

### Technical Details

- The `WorkflowProgressBanner` takes `challengeId`, `currentPhase`, and `governanceMode` as props
- It uses a static step map to render labels and role hints
- The spec review save logic will use the existing `supabase.from('challenges').update()` pattern
- Navigation after save: `/cogni/challenges/${challengeId}/legal`

