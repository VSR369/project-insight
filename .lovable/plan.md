

# Complete Impact Analysis: CogniBlend Final UX Design Document

## Document Summary

The document proposes 5 major changes to the existing CogniBlend system. It explicitly states: **keep all existing code, add a conversational "front door", rename the wizard to "Advanced Editor"**. Zero new DB tables. Zero altered columns.

---

## CHANGE 1: Maturity Label Rename (4 strings)

**What**: Rename user-facing labels only. DB values (blueprint/poc/prototype/pilot) unchanged.
- Blueprint → "An idea or concept"
- PoC → "Proof it can work"
- Prototype → "A working demo"
- Pilot → "A real-world test"

**Ripple Impact (LOW)**:

| File | What Changes |
|------|-------------|
| `StepProblem.tsx` line 85-90 | `MATURITY_OPTIONS` name/description strings |
| `ChallengeSubmitSummaryModal.tsx` line 21-26 | `MATURITY_LABELS` record |
| `CogniSubmitRequestPage.tsx` | Any maturity display labels |
| `PublicChallengeDetailPage.tsx` | Maturity badge display |
| `CurationReviewPage.tsx` | Maturity display in review |
| `ApprovalReviewPage.tsx` line 262 | Maturity badge |

**Risk**: Near zero. Pure string replacement. DB enum untouched. All `z.enum(['blueprint','poc','prototype','pilot'])` stays.

---

## CHANGE 2: Governance Model Rename (LIGHTWEIGHT → QUICK, ENTERPRISE split into STRUCTURED/CONTROLLED)

**What**: The document redefines governance from the current binary (LIGHTWEIGHT / ENTERPRISE) to a 3-mode system (QUICK / STRUCTURED / CONTROLLED). User states: "I will ensure the quick, structured, controlled governance is configured by Supervisor in master data."

**Ripple Impact (HIGH — deepest change)**:

The current system uses `governance_profile` with two values: `LIGHTWEIGHT` and `ENTERPRISE`. The document maps:
- QUICK = current LIGHTWEIGHT behavior (auto-complete, role merging)
- STRUCTURED = current ENTERPRISE with STANDARD compliance
- CONTROLLED = current ENTERPRISE with FULL compliance (adds mandatory escrow, formal modification cycles, all 8 roles distinct)

| Area | Files Affected | What Changes |
|------|---------------|-------------|
| **GovernanceProfileBadge.tsx** | 1 file | Currently only knows LIGHTWEIGHT/ENTERPRISE. Must support QUICK/STRUCTURED/CONTROLLED with 3 colors/labels |
| **challengeFormSchema.ts** | 1 file | `createChallengeFormSchema(isLightweight)` boolean → needs 3-mode param. Min lengths differ per mode |
| **ChallengeWizardPage.tsx** line 90-94 | 1 file | `isLightweight` boolean derived from `governance_profile`. Must become `governanceMode: 'QUICK' | 'STRUCTURED' | 'CONTROLLED'` |
| **LegalDocumentAttachmentPage.tsx** line 456 | 1 file | `isLightweight` check for auto-attach. QUICK = auto-attach, STRUCTURED = LC reviews defaults, CONTROLLED = LC prepares custom |
| **PublicationReadinessPage / usePublicationReadiness.ts** line 158 | 1 file | `isLightweight` check for gate validation. Must differentiate STRUCTURED vs CONTROLLED gates |
| **CurationChecklistPanel.tsx** line 287 | 1 file | Checklist items differ by mode |
| **ScreeningReviewPage.tsx** line 409 | 1 file | `isEnterprise` check for anonymity. STRUCTURED + CONTROLLED = enterprise-like anonymity |
| **ChallengeManagePage.tsx** line 211 | 1 file | LIGHTWEIGHT check for anonymous display |
| **ApprovalPublicationConfigTab.tsx** line 240 | 1 file | `isEnterprise` check for visibility options |
| **ApprovalReviewPage.tsx** | 1 file | Governance badge display |
| **Gate02LegalTransition test** | 1 file | Tests reference `governance_profile: 'ENTERPRISE'` |
| **StepRewards.tsx** | 1 file | Escrow required in CONTROLLED, optional in STRUCTURED, hidden in QUICK |
| **StepProviderEligibility.tsx** | 1 file | Visibility/enrollment fields: QUICK=simple toggle, STRUCTURED=3-tier, CONTROLLED=full |

**DB Consideration**: The `governance_profile` column in `challenges` table currently stores 'LIGHTWEIGHT' or 'ENTERPRISE'. Per the document: "governance_profile in ('QUICK','LIGHTWEIGHT')" maps to QUICK. This means existing LIGHTWEIGHT rows are backward-compatible. New values QUICK/STRUCTURED/CONTROLLED need to be accepted. The document says "NO DB changes" — meaning the column already accepts free text or needs a mapping layer.

**Migration Strategy**: Create a `GOVERNANCE_MODE_MAP` utility:
```text
LIGHTWEIGHT, QUICK → mode QUICK
ENTERPRISE + compliance_level STANDARD → mode STRUCTURED  
ENTERPRISE + compliance_level FULL → mode CONTROLLED
```

**New File**: `src/lib/governanceMode.ts` — centralized resolver function used everywhere instead of scattered `isLightweight` booleans.

---

## CHANGE 3: 8 Challenge Templates (Solve blank-canvas problem)

**What**: 8 pre-built templates that pre-fill problem statement + maturity level + domain tags when user starts a challenge: Product Innovation, Process Improvement, Research Question, Design Challenge, Technical Problem, Social Impact, Data Science, Start from Scratch.

**Ripple Impact (LOW-MEDIUM)**:

| Area | Impact |
|------|--------|
| **New file**: `src/lib/challengeTemplates.ts` | Template data (8 objects with prefilled fields) |
| **New component**: `src/components/cogniblend/TemplateSelector.tsx` | Card grid UI for template selection |
| **CogniSubmitRequestPage.tsx** | Add template selector at top, pre-fill form on selection |
| **ChallengeWizardPage.tsx** | Add template selector before Step 1, pre-fill form |
| **Conversational Intake page** (new, Change 5) | Template selector is the entry point |

**No DB changes**: Templates are client-side constants. No new table needed.

---

## CHANGE 4: Auto-Onboarding (new signup → auto-create org → direct to creation)

**What**: New users without an org get auto-created: QUICK governance, AGG model, BASIC tier. Then redirect straight to challenge creation.

**Ripple Impact (MEDIUM)**:

| Area | Impact |
|------|--------|
| **Auth flow / post-login redirect** | Currently redirects to org registration if no org. Must auto-create instead |
| `OrgContext.tsx` line 56-72 | "No Organization Found" screen — must trigger auto-creation instead of showing error |
| **New RPC or edge function** | `auto_create_org` — creates seeker_org + org_member + sets defaults |
| **Registration flow** | Must not break existing multi-step org registration for users who want it |
| `CogniLoginPage.tsx` | Post-login redirect logic |

**DB Impact**: No schema changes. Uses existing `seeker_organizations` + `organization_members` tables. New RPC function needed.

**Risk**: Medium. Must handle edge cases: user already has org, user from invite, SSO users.

---

## CHANGE 5: AI Integration (2 Edge Functions + 2 New Pages)

**What**:
1. **Conversational Intake Page** (`/challenges/create`) — template selector + text area + maturity cards + "Generate with AI" button
2. **AI Spec Review Page** (`/challenges/:id/spec`) — AI-drafted sections with sparkle badges, user reviews/edits
3. **`generate-challenge-spec` Edge Function** — Claude API call, returns 9 AI-drafted fields as JSON
4. **`check-challenge-quality` Edge Function** — Claude API for curation quality analysis (completeness score, gaps, solver readiness)
5. **AI Curation Quality Panel** — Side panel on CurationReviewPage alongside existing 14-point checklist

**Ripple Impact (MEDIUM-HIGH)**:

| Area | Impact |
|------|--------|
| **New route** `/challenges/create` or `/cogni/challenges/create` | New page, add to App.tsx router |
| **New route** `/cogni/challenges/:id/spec` | New page, add to App.tsx router |
| **New edge function** `generate-challenge-spec` | Claude API integration. Needs ANTHROPIC_API_KEY secret |
| **New edge function** `check-challenge-quality` | Claude API integration. Same secret |
| `CurationReviewPage.tsx` | Add AI quality panel as collapsible side panel (additive) |
| `CurationChecklistPanel.tsx` | Add amber dots on AI-flagged checklist items |
| **Sidebar navigation** | Add "Create Challenge" link pointing to new conversational page |
| **ChallengeWizardPage.tsx** | Add "Back to Simple View" link. Rename sidebar entry to "Advanced Editor" |
| **Dashboard primary action** | "Create Challenge" button → points to conversational page |

**DB Impact**: Zero new tables. AI writes to same `challenges` columns (title, problem_statement, scope, deliverables, evaluation_criteria, description, etc.)

**Secret Required**: `ANTHROPIC_API_KEY` for Claude API calls in edge functions.

---

## CHANGE 6: Solver Legal Timing (BR-LGL-007 adjustment)

**What**: Tier 2 legal docs (Evaluation Consent, AI Policy, Dispute Agreement, Withdrawal Terms) are still CONFIGURED during creation but PRESENTED to solver AFTER shortlisting instead of before abstract submission.

**Ripple Impact (LOW)**:

| Area | Impact |
|------|--------|
| `SolverLegalGateModal.tsx` | Trigger condition changes: Tier 2 docs shown post-shortlist, not pre-abstract |
| `PublicChallengeDetailPage.tsx` | Tier 1 (NDA) still required before viewing. No change |
| **Screening flow** | After shortlisting action, present Tier 2 legal modal |
| `ScreeningReviewPage.tsx` | Shortlist action triggers Tier 2 legal presentation |
| Edge function `record-legal-acceptance` | No change — still records acceptance the same way |

**DB Impact**: Zero. Same tables, same columns. Only the frontend trigger timing changes.

---

## IMPLEMENTATION PRIORITY ORDER (Recommended)

| Priority | Change | Effort | Dependencies |
|----------|--------|--------|-------------|
| **P1** | Maturity Label Rename | 2h | None |
| **P2** | Governance 3-Mode Engine (`governanceMode.ts` + GovernanceProfileBadge + schema refactor) | 2-3d | Supervisor configures master data |
| **P3** | Challenge Templates (8 templates + selector component) | 1d | None |
| **P4** | Conversational Intake Page + AI Spec Review Page | 3-4d | Templates (P3), Governance (P2) |
| **P5** | AI Edge Functions (generate-challenge-spec, check-challenge-quality) | 2d | ANTHROPIC_API_KEY secret |
| **P6** | AI Curation Quality Panel (additive to CurationReviewPage) | 1d | check-challenge-quality edge function |
| **P7** | Auto-Onboarding (auto-create org on signup) | 1d | Governance defaults (P2) |
| **P8** | Solver Legal Timing (Tier 2 post-shortlist) | 0.5d | None |
| **P9** | Wizard → "Advanced Editor" rename + "Back to Simple View" link | 0.5d | Conversational page exists (P4) |

---

## WHAT IS NOT TOUCHED (Confirmed Safe)

Per document Section 1.1, these have zero changes: Supabase schema, all RPC functions, all Edge Functions, RLS policies, role system, legal framework tables, notification system, SLA engine, audit trail, dashboard widgets, Approval Review page, Publication Readiness page, Challenge Management page, seed data.

---

## NEW FILES SUMMARY

| File | Purpose |
|------|---------|
| `src/lib/governanceMode.ts` | Centralized QUICK/STRUCTURED/CONTROLLED resolver |
| `src/lib/challengeTemplates.ts` | 8 template definitions |
| `src/components/cogniblend/TemplateSelector.tsx` | Template card grid UI |
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | New primary creation page |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | AI-drafted spec review page |
| `supabase/functions/generate-challenge-spec/index.ts` | Claude AI spec generation |
| `supabase/functions/check-challenge-quality/index.ts` | Claude AI quality checker |

## MODIFIED FILES SUMMARY (22 files)

| File | Change Type |
|------|------------|
| `GovernanceProfileBadge.tsx` | 3-mode support |
| `challengeFormSchema.ts` | 3-mode validation |
| `ChallengeWizardPage.tsx` | Governance mode + "Advanced Editor" rename |
| `StepProblem.tsx` | Maturity labels |
| `StepRewards.tsx` | Escrow rules per mode |
| `StepProviderEligibility.tsx` | Visibility rules per mode |
| `ChallengeSubmitSummaryModal.tsx` | Maturity labels |
| `CogniSubmitRequestPage.tsx` | Template selector + maturity labels |
| `CurationReviewPage.tsx` | AI quality panel (additive) |
| `CurationChecklistPanel.tsx` | AI amber dots + mode awareness |
| `LegalDocumentAttachmentPage.tsx` | 3-mode auto-attach logic |
| `PublicationReadinessPage / usePublicationReadiness.ts` | 3-mode gate checks |
| `ScreeningReviewPage.tsx` | Mode-aware anonymity + Tier 2 trigger |
| `ChallengeManagePage.tsx` | Mode-aware anonymity |
| `ApprovalPublicationConfigTab.tsx` | Mode-aware visibility |
| `ApprovalReviewPage.tsx` | Badge update |
| `SolverLegalGateModal.tsx` | Tier 2 timing change |
| `PublicChallengeDetailPage.tsx` | Maturity labels |
| `App.tsx` | 2 new routes |
| `CogniSidebarNav.tsx` | Navigation label + link updates |
| `OrgContext.tsx` | Auto-onboarding trigger |
| Dashboard action button components | Point to conversational page |

