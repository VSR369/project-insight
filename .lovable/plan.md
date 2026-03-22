

# Plan: Correct AM Role Identity + Model-Adaptive Intake Forms

## Correction

**MP Account Manager (AM) is NOT a Platform Admin.** AM is a representative of the Seeking Organization. In the Marketplace model, the Platform Provider team manages the challenge lifecycle, but the AM is the seeking org's point person who submits the problem brief with mandatory details (budget, timeline, solution expectations).

## Changes

### 1. Update SimpleIntakeForm copy and model-adaptive fields

**File: `src/components/cogniblend/SimpleIntakeForm.tsx`**

**Current header (line 171):** "Submit a Solution Request" / "Describe your business need — a Challenge Architect will build the full specification."

Read `orgContext?.operatingModel` to switch between two variants:

**AGG (RQ) — "Share Your Idea" (3 required fields):**
- Title (max 100 chars) — required
- Problem Idea (textarea, max 300 chars) — required. Prompt: *"What problem or opportunity have you identified? Even a rough idea is fine — a domain expert will expand it."*
- Sector/Domain (dropdown) — required
- Budget, Timeline — **removed** (RQ may not know these)

**MP (AM) — "Submit a Problem Brief" (6 required fields):**
- Title — required
- Problem Summary (textarea, max 500 chars) — required. Keep existing prompt.
- Solution Expectations (new textarea, max 500 chars) — required. Prompt: *"What outcomes do you expect? What does a successful solution look like?"*
- Sector/Domain — required
- Budget Range (min/max + currency) — required
- Timeline — required
- Architect assignment picker (MP-only, already exists)

**Updated subtitle for MP:** "As your organization's representative, provide the problem details. The platform team will manage the challenge lifecycle."

**Updated subtitle for AGG:** "Share your problem or opportunity — a Challenge Architect will define the full specification."

**Schema change:** Make `budget_min`, `budget_max`, `expected_timeline` conditionally required via `.superRefine()` checking an `isMP` flag, or use two separate schemas selected at runtime.

### 2. Add "Expand Challenge" section to ConversationalIntakePage (CR/CA)

**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`**

Add a collapsible section after Expected Outcomes (line ~562) with 6 optional domain-expert fields:

| Field | Max chars | Placeholder guidance |
|-------|-----------|---------------------|
| Context & Background | 2000 | "Provide relevant history, industry context, or organizational background" |
| Root Causes | 1000 | "What are the underlying causes of this problem?" |
| Affected Stakeholders | 1000 | "Who is impacted and how?" |
| Scope Definition | 2000 | "What is in scope and out of scope?" |
| Preferred Approach | 1000 | "Any methodologies or technologies you'd prefer?" |
| Approaches NOT of Interest | 1000 | "What has been tried and failed, or what should solvers avoid?" |

Section header: *"Expand Challenge Details"* with subtext: *"The more context you provide, the better the AI-generated specification will be."*

- Use a `Collapsible` component, open by default
- Add fields to schema as optional strings
- Pass all non-empty fields to `generateSpec.mutateAsync()` payload and `saveStep` fields
- Remove the 3 italic hint prompts (lines 526-531, 559-561) — replaced by these structured fields

### 3. Update ConversationalIntakePage header copy

**Line 449:** Change from "Describe your problem, set your parameters, and let AI draft the full specification." to: **"As a domain expert, provide the context solvers need. AI will draft the full specification from your inputs."**

## Files Modified

| File | Changes |
|------|---------|
| `SimpleIntakeForm.tsx` | Model-adaptive fields (AGG=3 fields, MP=6 fields), corrected copy (AM = seeking org rep), new Solution Expectations field for MP |
| `ConversationalIntakePage.tsx` | Add "Expand Challenge" collapsible with 6 optional fields, update header copy, remove inline hint prompts, pass expanded fields to AI + save |

## What is NOT Changed

- ChallengeCreatePage role-based routing (AM/RQ → SimpleIntakeForm, CR/CA → 2 cards)
- Governance/engagement model handling
- ChallengeWizardPage curator-only field hiding
- CurationChecklistPanel
- AllRolesSummaryWidget / RoleSwitcher changes
- All downstream flows

