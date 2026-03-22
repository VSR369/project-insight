

# Plan: Role-Based Field Ownership Enforcement (Marketplace + Aggregator)

## What's Wrong Today

1. **CurationReviewPage**: Curator can edit ALL sections except `legal_docs` and `escrow_funding`. This means Curator can modify Problem Statement, Scope, Deliverables, Eval Criteria, Hook, Extended Brief — all of which are CA-owned content. Per the corrected spec, Curator should be able to edit everything EXCEPT legal and finance sections.
2. **AISpecReviewPage**: All sections editable in STRUCTURED mode regardless of role. No role gating — CU viewing spec review can edit CA content. Budget/timeline from AM should be shown as read-only reference for CA in Marketplace model.
3. **SimpleIntakeForm (AM)**: Has 7 fields (Title, Problem Summary, Solution Expectations, Sector, Budget, Timeline, Architect picker). Per corrected spec: Solution Expectations should be optional, Architect picker should be removed (auto-assigned), timeline labels should be "urgency" framed.
4. **SimpleIntakeForm (RQ/AGG)**: Missing timeline field. Per corrected spec, RQ must provide timelines even though they may not know budget/reward amounts.

## Corrected Ownership Rules

```text
ROLE              CAN EDIT                              CANNOT EDIT
────────────────────────────────────────────────────────────────────
AM (MP)           Title, Problem Summary, Sector,       Everything else
                  Budget, Timeline, Success (opt)

RQ (AGG)          Template, Problem Idea,               Budget, Reward
                  Beneficiaries, Timeline

CR/CA (MP)        All spec content EXCEPT Budget         Budget, Timeline
                  and Timeline (AM-provided,             (read-only from AM)
                  shown as read-only reference)

CR (AGG)          All spec content including             —
                  Timeline (must provide it)

Curator           Everything EXCEPT legal_docs           legal_docs,
                  and escrow_funding                     escrow_funding

LC                Legal Documents only                   Everything else
FC                Escrow & Funding only                  Everything else
```

## Changes

### 1. CurationReviewPage — Curator edits all except legal/finance

**File: `src/pages/cogniblend/CurationReviewPage.tsx`**

The current `LOCKED_SECTIONS` set (`legal_docs`, `escrow_funding`) is already correct per the user's corrected requirement: "Curator can edit any field except legal and finance." No structural change needed to the lock logic.

**However**, update section attributions to be accurate:
- `reward_structure` attribution: change from `"by Creator"` to `"by Curator"` (line 313)
- `complexity` — no attribution currently, add `"by Curator"`
- `domain_tags` — no attribution, add `"by Curator"`
- `ip_model` attribution: keep `"by Creator"` but Curator CAN edit (already works since it's not in LOCKED_SECTIONS)
- `submission_deadline` attribution: change from `"Org Policy"` to `"by Curator"` (line 528)

Add model-awareness: when `operating_model === 'AGG'`, hide any "Send to Seeking Org for Sign-off" action since the seeking org IS the platform org in Aggregator.

### 2. SimpleIntakeForm (AM/MP) — Refine to 5+1 fields

**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

a) **Solution Expectations** (line 446-461): Make optional — remove `min(1)` from `mpSchema` (line 90). Rename label to "What success looks like commercially" with "(Optional)" tag. Update placeholder.

b) **Remove Architect picker** (lines 542-565): Delete the architect dropdown. Auto-assignment happens server-side.

c) **Rename "Expected Timeline"** (line 521) to "Timeline Urgency". Update `TIMELINE_OPTIONS` labels:
  - `'1-3'` → `"Urgent (1–3 months)"`
  - `'3-6'` → `"Standard (3–6 months)"`
  - `'6-12'` → `"Flexible (6–12 months)"`
  - `'12+'` → `"Extended (12+ months)"`

d) **Add section headers** to visually group:
  - "THE PROBLEM" group: Title, Problem Summary, Sector
  - "COMMERCIAL PARAMETERS" group: Budget, Timeline, Success

e) **Post-submission confirmation**: Update the success toast to say "Your brief has been received. Your Challenge Architect will contact you within 2 business days."

### 3. SimpleIntakeForm (RQ/AGG) — Add Timeline field

**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

a) Add `expected_timeline` to `aggSchema` as required (the RQ must provide timelines per corrected spec):
```tsx
expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
  errorMap: () => ({ message: 'Please select a timeline' }),
}),
```

b) Add a Timeline Urgency dropdown to the RQ form (after Beneficiaries section, before actions).

c) Update the RQ subtitle: "As an internal employee, share your idea — a Challenge Creator from your team will expand it. You don't need to know the budget, but please indicate your timeline."

### 4. AISpecReviewPage — Role-based field gating + AM reference panel

**File: `src/pages/cogniblend/AISpecReviewPage.tsx`**

a) **Read-only AM brief reference** for Marketplace challenges: When `operating_model === 'MP'`, show a collapsed panel at the top titled "Account Manager's Original Brief" with:
  - Problem Summary (read-only)
  - Budget Range (read-only)
  - Timeline Urgency (read-only)
  These are already in the challenge record. Mark them with a "From AM — Read Only" badge.

b) **Budget/Timeline fields read-only for CA in MP**: If challenge settings panel shows budget or timeline fields, make them non-editable when `operating_model === 'MP'` and user role is CR/CA. The CA must not change AM-provided budget and timelines.

c) **Role gating for CU**: If the logged-in user has CU role (from `useUserChallengeRoles`), hide edit buttons on all spec sections — Curator should use CurationReviewPage for their work, not spec review.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Update section attributions; add AGG model awareness for approval gate |
| `src/components/cogniblend/SimpleIntakeForm.tsx` | AM: make Solution Expectations optional, remove Architect picker, rename Timeline, add section headers; RQ: add Timeline field, update subtitle |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Add AM brief reference panel for MP; lock budget/timeline for CA in MP; hide edit for CU role |

