

# Remove Submission Deadline Curation Section — Derive from Phase Schedule

## About the AI Models

The AI review system uses **Lovable AI** (a gateway to Google Gemini and OpenAI models). The issue is not the model — it's the **prompt instruction**: the date format prompt says "estimate based on complexity (simple=60d, moderate=90d...)" but **never injects today's date** into the context. The LLM has no reliable knowledge of the current date, so it hallucinates a date (often in the past). This is a prompt engineering bug, not an LLM quality issue.

## Why Remove Instead of Fix

You're right to question this section's existence:

1. **Phase Schedule already defines all phase end dates** — the submission deadline is just the end date of the last phase
2. **Redundancy creates conflicts** — if curator edits phase schedule but forgets to update submission_deadline, they disagree
3. **AI can't reliably produce dates** — LLMs don't know "today" unless explicitly told, so the AI review always risks past dates
4. **The downstream `submission_deadline` column is still needed** — solver-facing pages, extend-deadline workflow, and publication readiness all read it. We'll auto-derive it from phase_schedule instead.

## Changes

### 1. Remove from Curation Section Config
**File:** `src/lib/cogniblend/curationSectionFormats.ts`
- Delete the `submission_deadline` entry from `SECTION_FORMAT_CONFIG`
- Remove `'submission_deadline'` from `aiUsesContext` in any other section

### 2. Remove from CurationReviewPage
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Delete `submission_deadline` from the type interface
- Delete the section config object (key, label, render, isFilled)
- Remove from the "Publication & Logistics" group `sectionKeys` array
- Remove `case "submission_deadline"` from `getSectionValue` switch
- Remove from `.select()` query columns
- Remove from `fieldToSection` map
- Remove from `ALL_SECTIONS` array
- Remove the `DateSectionRenderer` case block (~lines 2804-2822)

### 3. Remove from AI Review Edge Functions
**File:** `supabase/functions/triage-challenge-sections/index.ts`
- Remove `"submission_deadline"` from `ALL_SECTIONS`
- Remove from `buildChallengeContext()` and `.select()` column list

**File:** `supabase/functions/review-challenge-sections/index.ts`
- Remove the `submission_deadline` section descriptor from the sections array
- Remove `effort_level` leftover (line 45) while we're here

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`
- Remove `submission_deadline: 'date'` from `SECTION_FORMAT_MAP`
- Remove the `date` format instruction (no longer used by any section)

**File:** `src/lib/aiReviewPromptTemplate.ts`
- Same removals: `submission_deadline` from format map, `date` from format instructions

### 4. Remove from Store Sync
**File:** `src/hooks/useCurationStoreSync.ts`
- Remove `submission_deadline: 'submission_deadline'` from `SECTION_DB_FIELD_MAP`

**File:** `src/hooks/useCurationStoreHydration.ts`
- Remove `submission_deadline` from type, hydration map, and select query

### 5. Auto-Derive submission_deadline from Phase Schedule
**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (phase_schedule save handler)
- After saving phase_schedule, compute the max `end_date` from all phases and write it to `challenges.submission_deadline` automatically
- This keeps the downstream column populated for solver pages, extend-deadline, and publication readiness

**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx`
- In the save payload builder, derive `submission_deadline` from `phase_schedule` phases' end dates instead of reading from form field

### 6. Remove from Wizard Form
**File:** `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts`
- Remove `submission_deadline` from schema (it's now auto-derived)

**File:** `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx`
- Remove submission deadline from the review summary display

**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx`
- Remove from step 4 field list
- Remove from form default values hydration

### 7. Clean Up DateSectionRenderer Import
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Remove `DateSectionRenderer` import (no longer used in this file)

## Files Changed (12 files)

| File | Change |
|------|--------|
| `src/lib/cogniblend/curationSectionFormats.ts` | Delete `submission_deadline` entry |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Remove section, renderer, query field; auto-derive from phase_schedule |
| `src/hooks/useCurationStoreSync.ts` | Remove from DB field map |
| `src/hooks/useCurationStoreHydration.ts` | Remove from type, map, select |
| `src/lib/aiReviewPromptTemplate.ts` | Remove from format map and date instruction |
| `supabase/functions/triage-challenge-sections/index.ts` | Remove from sections and context |
| `supabase/functions/review-challenge-sections/index.ts` | Remove section descriptor |
| `supabase/functions/review-challenge-sections/promptTemplate.ts` | Remove from format map |
| `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Remove from schema |
| `src/components/cogniblend/challenge-wizard/StepReviewSubmit.tsx` | Remove from summary |
| `src/pages/cogniblend/ChallengeWizardPage.tsx` | Auto-derive from phase_schedule, remove from form |
| `src/components/cogniblend/curation/renderers/DateSectionRenderer.tsx` | Keep file (may be reused), just unused |

## Key Behavior After Change

- **Submission deadline is auto-computed** = last phase's `end_date` from phase_schedule
- **Downstream features unaffected** — solver countdown, extend-deadline hook, publication readiness all continue reading `challenges.submission_deadline`
- **No AI review for dates** — eliminated source of hallucinated past dates
- **If ACM/CR sets dates in wizard**, those flow into phase_schedule, and the max end_date becomes the deadline automatically

