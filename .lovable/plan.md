

# Interview Kit Data Fix - Database Cleanup Required

## Problem Summary

The database still contains 1,824 corrupted question records from a previous implementation. The filtering code has been updated to be backward-compatible, but the underlying data has incorrect `section_type` values which prevents proper display.

---

## Current Data Analysis

| Column | What Database Has | What Code Expects |
|--------|-------------------|-------------------|
| `section_type` | `"Proof Points Deep-Dive"` | `"proof_point"` |
| `section_type` | (no domain questions) | `"domain"` |
| `section_type` | (no competency questions) | `"competency"` |
| `question_source` | All `"proof_point"` | Mix of `"question_bank"`, `"interview_kit"`, `"proof_point"`, `"custom"` |

The existing 1,824 records are **only Proof Point questions** (which now display correctly due to the backward-compatible filter). However, **Domain** and **Competency** questions were never generated because the old implementation didn't include them.

---

## Solution: Database Cleanup + Regenerate

### Step 1: Run SQL Commands in Supabase

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/izwimkvabbvnqcrrubpf/sql/new) and execute:

```sql
-- Clear all existing question responses (corrupted data)
DELETE FROM interview_question_responses;

-- Clear evaluations to trigger fresh generation
DELETE FROM interview_evaluations;
```

### Step 2: Refresh the Interview Kit Tab

After running the SQL commands:
1. Refresh the candidate detail page in your browser
2. Navigate to the Interview Kit tab
3. Questions will auto-regenerate with correct values:
   - **Domain & Delivery Depth**: Max 10 from `question_bank` (filtered by `usage_mode IN ('interview', 'both')`)
   - **Proof Points Deep-Dive**: 1-2 per proof point
   - **Competencies**: 1-2 per competency from `interview_kit_questions`

---

## Code Status

The code changes are **already complete and correct**:

| File | Status | What It Does |
|------|--------|--------------|
| `useInterviewKitEvaluation.ts` | ✅ Updated | Backward-compatible filtering for both enum and display name formats |
| `interviewKitGenerationService.ts` | ✅ Complete | Generates questions from all 3 sources with correct `section_type` enums |
| `InterviewKitTabContent.tsx` | ✅ Complete | Auto-generates on first visit if no questions exist |

---

## Question Generation Logic (Already Implemented)

### 1. Domain & Delivery Depth (Max 10)
```text
Source: question_bank table
Filter: 
  - speciality_id IN (provider's selected specialities)
  - usage_mode IN ('interview', 'both')
  - is_active = true
Selection: Random 10 with hierarchy path
section_type: 'domain'
```

### 2. Proof Points Deep-Dive (1-2 per proof point)
```text
Source: Generated from proof point descriptions
Templates: 6 question patterns based on methodology, outcomes, challenges
section_type: 'proof_point'
```

### 3. Competency Questions (1-2 per competency = 5-10 total)
```text
Source: interview_kit_questions table
Filter:
  - competency_id matches
  - industry_segment_id matches OR fallback to any
  - expertise_level_id matches OR fallback to any
  - is_active = true
Selection: Random 1-2 per competency
section_type: 'competency'
```

---

## Expected Result After Fix

Once the database is cleaned and questions regenerate:

| Section | Count | Source Table | section_type |
|---------|-------|--------------|--------------|
| Domain & Delivery Depth | 10 | `question_bank` | `domain` |
| Proof Points Deep-Dive | ~8-16 | Generated | `proof_point` |
| Solution Design & Architecture Thinking | 1-2 | `interview_kit_questions` | `competency` |
| Execution & Governance | 1-2 | `interview_kit_questions` | `competency` |
| Data/Tech Readiness & Tooling Awareness | 1-2 | `interview_kit_questions` | `competency` |
| Soft Skills for Solution Provider Success | 1-2 | `interview_kit_questions` | `competency` |
| Innovation & Co-creation Ability | 1-2 | `interview_kit_questions` | `competency` |
| **TOTAL** | ~20-30 | | |

---

## Action Required

**Please run the SQL cleanup commands above** to clear the corrupted data. The system will automatically regenerate questions with proper enum values when you next visit the Interview Kit tab.

