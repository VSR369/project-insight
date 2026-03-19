

# Critical Review: "Create with AI" vs "Advanced Editor" — What the Document Says vs What's Built

## The Core Concept (from your document)

The document is unambiguous:

```text
"Create with AI" = FRONT DOOR (conversational, AI-driven)
"Advanced Editor" = BACK DOOR (full 60-field wizard for power users/curators)
Both read/write the SAME database record.
```

They are NOT two versions of the same form. They are two fundamentally different UX paradigms for the same data.

---

## What's Currently Built (Problems)

| Aspect | Document Says | Current Build | Gap |
|--------|--------------|---------------|-----|
| Intake fields | 6 fields: Problem, Expected Outcomes, Maturity, Prize, Deadline, Files | 3 fields: Problem, Maturity, Template | Missing 3 critical fields |
| After AI generates | AI Spec Review page — formatted document with sparkle badges + pencil edit per section | Auto-dumps into Advanced Editor tab | No review experience |
| QUICK AI behavior | AI fills all, user confirms with **1 click** | Same as Structured | No 1-click confirm |
| STRUCTURED AI behavior | AI fills, user **reviews and edits each section** on a review page | Dumps to wizard | No section-by-section review |
| CONTROLLED AI behavior | AI suggests in **side panel only**, user must manually write each field | Same as others | No side-panel pattern |
| Advanced Editor purpose | Back door for Curators, LC, FC, ID, power users | Primary destination after AI | Overused |

**Root confusion**: Currently "Create with AI" is just a 3-field pre-fill form that immediately switches to the Advanced Editor. There is no distinct AI experience. Both tabs feel like the same thing with different starting points.

---

## How It Should Work (Per Governance Mode)

### Screen Flow: Create with AI

```text
ALL MODES — Step 1: Seeker Intake (identical)
┌─────────────────────────────────────────────┐
│  Template Selector (8 templates)            │
│  Problem Statement (rich text)         [R]  │
│  Expected Outcomes                     [R]  │
│  Solution Type (maturity cards)        [R]  │
│  Prize Amount + Currency               [R]  │
│  Deadline (min 30 days)                [R]  │
│  Supporting Files                      [O]  │
│                                             │
│  [ 🪄 Generate with AI ]                    │
└─────────────────────────────────────────────┘
         │
         ▼ AI generates spec (9 fields)
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
  QUICK    STRUCTURED    CONTROLLED
```

### QUICK Mode — 1-Click Confirm
```text
┌─────────────────────────────────────────────┐
│  AI Spec Review (read-only formatted doc)   │
│                                             │
│  Title: "Predictive Maintenance..."    ✨   │
│  Scope: "In-scope: ... Out-of-scope: ..."  ✨   │
│  Deliverables: [1] [2] [3]            ✨   │
│  Evaluation Criteria: [list]           ✨   │
│  ...                                        │
│                                             │
│  All fields auto-completed by AI + rules.   │
│  Legal auto-configured from maturity level. │
│                                             │
│  [ ✅ Confirm & Submit ]  [✏️ Open Editor]  │
└─────────────────────────────────────────────┘
```
- User sees a clean document, clicks **one button** to submit
- Challenge goes directly to Phase 3 (phases 1-2 auto-completed)
- "Open Editor" is escape hatch only
- Time: 3-5 minutes total

### STRUCTURED Mode — Review & Edit Each Section
```text
┌─────────────────────────────────────────────┐
│  AI Spec Review (editable sections)         │
│                                             │
│  Title: "Predictive..."   ✨ [✏️ Edit]      │
│  Description: "..."       ✨ [✏️ Edit]      │
│  Scope In/Out: "..."      ✨ [✏️ Edit]      │
│  Deliverables: [1][2][3]  ✨ [✏️ Edit]      │
│  Eval Criteria: [list]    ✨ [✏️ Edit]      │
│  Eligibility: "..."       ✨ [✏️ Edit]      │
│  Hook: "..."              ✨ [✏️ Edit]      │
│  IP Model: "Exclusive"    ✨ [✏️ Edit]      │
│                                             │
│  [ ✅ Approve & Continue ]                  │
│  [ ⚙ Open Advanced Editor for full control] │
└─────────────────────────────────────────────┘
```
- Each AI section has inline edit capability (pencil icon)
- User reviews and optionally edits each section
- "Approve & Continue" sends to Curator queue
- "Open Advanced Editor" is for power users who want all 60 fields

### CONTROLLED Mode — AI as Side Panel Advisor
```text
┌──────────────────────────┬──────────────────┐
│  Manual Field Entry      │  AI Suggestions  │
│                          │  (side panel)    │
│  Title: [____________]   │  💡 "Predictive  │
│  Description:            │   Maintenance    │
│  [________________]      │   for..."        │
│  [________________]      │  [Apply] [Skip]  │
│                          │                  │
│  Scope: [____________]   │  💡 "In-scope:   │
│                          │   sensor data..."│
│                          │  [Apply] [Skip]  │
│  ...                     │                  │
│                          │                  │
│  [ Save & Continue → ]   │                  │
└──────────────────────────┴──────────────────┘
```
- AI suggestions appear in a **side panel**, never auto-fill
- User must manually write or explicitly click "Apply" per field
- All fields required (R), no shortcuts
- Full audit trail of what was AI-suggested vs human-written

---

## Advanced Editor — When and Why

The Advanced Editor (current 8-step wizard) is the **back door**. It is used:

| Who | When | Why |
|-----|------|-----|
| Curator (CU) | Step 3 | Taxonomy, complexity, criteria weights, targeting |
| Legal Coordinator (LC) | Step 3 | Legal docs, IP terms, NDA customization |
| Finance Controller (FC) | Step 3 | Escrow, payment mode, rejection fee |
| Innovation Director (ID) | Step 4 | Compliance review, complexity finalization, approve |
| Power user / Seeker | Anytime | Wants full control over all 60 parameters |

The Advanced Editor is NOT the default post-AI destination. It's an escape hatch and a role-specific tool.

---

## Implementation Plan

### Phase 1: Fix Seeker Intake (Step 1)
**File**: `ConversationalIntakePage.tsx`
- Add missing fields: Expected Outcomes, Prize Amount + Currency, Deadline (date picker, min 30 days), Supporting Files (upload)
- Total: 6 required fields + template selector (matching document exactly)

### Phase 2: Build AI Spec Review Page
**New file**: `src/pages/cogniblend/AiSpecReviewPage.tsx`
**Route**: `/cogni/challenges/:id/spec`
- Renders the AI-generated spec as a formatted, readable document
- Each section shows a sparkle badge (✨) indicating AI-drafted
- Governance-mode-aware rendering:
  - **QUICK**: Read-only sections + "Confirm & Submit" button
  - **STRUCTURED**: Inline-editable sections + "Approve & Continue" button
  - **CONTROLLED**: Redirects to side-panel editor (Phase 3)

### Phase 3: Build Controlled Mode Side-Panel Editor
**New file**: `src/components/cogniblend/AiSidePanelEditor.tsx`
- Split-pane layout: manual form fields (left) + AI suggestions panel (right)
- Each suggestion has "Apply" / "Skip" buttons
- Tracks which fields were AI-applied vs human-written (for audit)

### Phase 4: Update Post-Generation Routing
**File**: `challengeNavigation.ts` + `ConversationalIntakePage.tsx`
- After AI generates spec:
  - **QUICK**: Navigate to spec review → 1-click confirm → auto-advance phases
  - **STRUCTURED**: Navigate to spec review → section-by-section edit → submit to curator
  - **CONTROLLED**: Navigate to side-panel editor → manual field entry with AI advisor
- Remove the current "auto-switch to Advanced Editor tab" behavior

### Phase 5: Reposition Advanced Editor
**File**: `ChallengeCreatePage.tsx`
- Keep the tab toggle but change the mental model:
  - "Create with AI" tab = primary path (intake → review → submit)
  - "Advanced Editor" tab = power-user escape hatch (shows full wizard)
- Add contextual link: "Need full control? Open Advanced Editor" at bottom of spec review
- Remove auto-switching to editor after AI generation

## Technical Notes
- The AI Spec Review page and the Advanced Editor both read/write the same `challenges` DB record — no data duplication
- Governance mode drives which review UX renders (using `resolveGovernanceMode`)
- The `GOVERNANCE_FIELD_CONFIG` matrix already defines R/O/H/AI/A per field per mode — reuse it for the spec review rendering
- Side-panel for CONTROLLED mode can use the existing `AiFieldAssist` component pattern, expanded to full-page layout

