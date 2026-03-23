

# Field Mapping Matrix: Role-to-Curator Data Flow

## Analysis Summary

I traced every field from intake (AM/RQ) through specification (CA/CR) to the Curation Review page. Below are the two mapping matrices and the gaps found.

---

## Matrix 1: AGG Flow — Challenge Requestor (RQ) → Challenge Creator (CR) → Curator (CU)

```text
┌──────────────────────────┬────────────┬────────────┬────────────┬──────────────────────┐
│ Field                    │ RQ Creates │ CR Creates │ CU Sees    │ Gap?                 │
├──────────────────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ Title                    │ Auto-derived│ AI/Edit   │ ✅ Header  │ —                    │
│ Problem Statement        │ ✅          │ AI refines│ ✅         │ —                    │
│ Scope (Expected Outcomes)│ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Deliverables             │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Submission Guidelines    │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Maturity Level           │ —          │ ✅         │ ✅         │ —                    │
│ Challenge Hook           │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Evaluation Criteria      │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Reward Structure         │ —          │ ✅ (prize) │ ✅         │ —                    │
│ IP Model                 │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Phase Schedule           │ ✅ timeline │ ✅ deadline│ ✅         │ —                    │
│ Submission Deadline      │ —          │ ✅         │ ✅         │ —                    │
│ Challenge Visibility     │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Domain Tags              │ ✅ template │ ✅         │ ✅         │ —                    │
│ Extended Brief           │ —          │ ✅ opt.    │ ✅         │ —                    │
│ Eligibility              │ ✅ segment  │ ✅ AI gen  │ ✅         │ —                    │
│ Complexity Assessment    │ —          │ —          │ ✅ (CU own)│ —                    │
│ Legal Docs               │ —          │ —          │ ✅ (LC own)│ —                    │
│ Escrow & Funding         │ —          │ —          │ ✅ (FC own)│ —                    │
│ Effort Level             │ —          │ —          │ ✅ (CU own)│ —                    │
├──────────────────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ Challenge Template ID    │ ✅          │ ✅ carried │ ❌ MISSING │ Not shown to Curator │
│ Industry Segment         │ ✅          │ Stored in  │ ❌ MISSING │ Not shown to Curator │
│                          │            │ eligibility│            │                      │
│ Beneficiaries Mapping    │ ✅ optional │ Carried    │ ❌ MISSING │ In extended_brief    │
│                          │            │            │            │ but not rendered     │
│ Solution Expectations    │ ✅ optional │ Carried    │ ❌ MISSING │ In extended_brief    │
│                          │            │            │            │ but not rendered     │
│ AM Approval Required     │ — (AGG)    │ —          │ ❌ N/A     │ — (MP only)          │
│ Currency Code (display)  │ ✅          │ ✅         │ ✅         │ —                    │
└──────────────────────────┴────────────┴────────────┴────────────┴──────────────────────┘
```

---

## Matrix 2: MP Flow — Account Manager (AM) → Challenge Architect (CA) → Curator (CU)

```text
┌──────────────────────────┬────────────┬────────────┬────────────┬──────────────────────┐
│ Field                    │ AM Creates │ CA Creates │ CU Sees    │ Gap?                 │
├──────────────────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ Title                    │ ✅          │ AI refines│ ✅ Header  │ —                    │
│ Problem Statement/Summary│ ✅          │ AI refines│ ✅         │ —                    │
│ Scope (Expected Outcomes)│ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Deliverables             │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Submission Guidelines    │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Maturity Level           │ —          │ ✅         │ ✅         │ —                    │
│ Challenge Hook           │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Evaluation Criteria      │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Reward Structure         │ ✅ budget   │ ✅ (prize) │ ✅         │ —                    │
│ IP Model                 │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Phase Schedule           │ ✅ timeline │ ✅ deadline│ ✅         │ —                    │
│ Submission Deadline      │ —          │ ✅         │ ✅         │ —                    │
│ Challenge Visibility     │ —          │ ✅ AI gen  │ ✅         │ —                    │
│ Domain Tags              │ ✅ template │ ✅         │ ✅         │ —                    │
│ Extended Brief           │ —          │ ✅ opt.    │ ✅         │ —                    │
│ Eligibility              │ ✅ segment  │ ✅ AI gen  │ ✅         │ —                    │
│ Complexity Assessment    │ —          │ —          │ ✅ (CU own)│ —                    │
│ Legal Docs               │ —          │ —          │ ✅ (LC own)│ —                    │
│ Escrow & Funding         │ —          │ —          │ ✅ (FC own)│ —                    │
│ Effort Level             │ —          │ —          │ ✅ (CU own)│ —                    │
├──────────────────────────┼────────────┼────────────┼────────────┼──────────────────────┤
│ Challenge Template ID    │ ✅ optional │ ✅ carried │ ❌ MISSING │ Not shown to Curator │
│ Industry Segment         │ ✅          │ Stored in  │ ❌ MISSING │ Not shown to Curator │
│                          │            │ eligibility│            │                      │
│ Solution Expectations    │ ✅          │ Carried    │ ❌ MISSING │ In extended_brief    │
│                          │            │            │            │ but not rendered     │
│ Beneficiaries Mapping    │ ✅ optional │ Carried    │ ❌ MISSING │ In extended_brief    │
│                          │            │            │            │ but not rendered     │
│ AM Approval Required     │ ✅          │ Carried    │ ❌ MISSING │ In extended_brief    │
│                          │            │            │            │ but not rendered     │
│ Architect ID (assigned)  │ ✅ auto     │ —          │ ❌ MISSING │ Not shown to Curator │
│ Currency Code (display)  │ ✅          │ ✅         │ ✅         │ —                    │
└──────────────────────────┴────────────┴────────────┴────────────┴──────────────────────┘
```

---

## AI Assist: ✅ Fully Available

AI assist is active across both models via edge functions: `generate-challenge-spec`, `review-challenge-sections`, `refine-challenge-section`, `check-challenge-quality`, `ai-field-assist`, `suggest-legal-documents`, `assess-complexity`.

---

## Gaps to Fix (4 items for Curation Review Page)

All gaps are in `CurationReviewPage.tsx` — data exists in DB but is not rendered for the Curator:

### 1. Challenge Template — show in "Original Brief" accordion or as a badge in header
- Read from `extended_brief.challenge_template_id`, look up from `CHALLENGE_TEMPLATES`, display as a read-only badge (emoji + name)

### 2. Industry Segment — show in "Original Brief" or Content group
- Read from `eligibility` JSON (`industry_segment_id`), look up name from `industry_segments` table, display as a label

### 3. Beneficiaries Mapping + Solution Expectations — render in "Original Brief" accordion
- Both are stored in `extended_brief` but the Original Brief accordion only shows problem_statement, budget, and timeline
- Add these as additional read-only fields in the accordion

### 4. AM Approval Required (MP only) — show as indicator badge
- Stored in `extended_brief.am_approval_required`, display as a small badge/flag so curator knows the challenge will route to AM for approval after curation

### 5. Empty optional fields — show "No content added" message
- For any field that CR/CA left empty (even optional ones like `context_background`, `root_causes`, etc.), the curator should see a "No content added" placeholder instead of nothing
- The `extended_brief` section's `render` function currently returns `null` and defers to `ExtendedBriefDisplay` — need to ensure that component shows placeholders for empty keys

## Implementation Plan

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

1. **Expand "Original Brief" accordion** (lines 1262-1302):
   - Add Challenge Template badge (lookup from `CHALLENGE_TEMPLATES`)
   - Add Industry Segment label (query or parse from `eligibility`)
   - Add Solution Expectations field (from `extended_brief.solution_expectations`)
   - Add Beneficiaries Mapping field (from `extended_brief.beneficiaries_mapping`)
   - Add AM Approval Required flag (from `extended_brief.am_approval_required`, MP only)

2. **Add "No content added" placeholders**: For each field in the Extended Brief section, if the value is empty/null, render a muted "No content added" message instead of hiding it entirely

3. **Import** `CHALLENGE_TEMPLATES` from `@/lib/challengeTemplates`

### No other files need changes — all data already flows to the DB correctly.

## Technical Details

- Challenge template lookup: `CHALLENGE_TEMPLATES.find(t => t.id === extBrief?.challenge_template_id)`
- Industry segment: parse `challenge.eligibility` JSON → extract `industry_segment_id` → display (or add a small query)
- All extended_brief fields are already in the `select` query (line 806): `extended_brief` is fetched
- The "Original Brief" accordion is the right location since these are seeding data from AM/RQ

