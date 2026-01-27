
# Interview Kit Tab Implementation Plan

## Summary

Implement a comprehensive Interview Kit tab within the Reviewer's Candidate Detail page that enables reviewers to conduct structured interviews with auto-generated questions, mandatory scoring, review notes, and submission validation.

## Current State Analysis

### Database Schema (What Exists)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `interview_bookings` | Interview scheduling | `enrollment_id`, `flag_for_clarification`, `reviewer_notes`, `interview_outcome` |
| `interview_evaluations` | Per-reviewer evaluation | `booking_id`, `reviewer_id`, `overall_score`, `outcome`, `notes` |
| `interview_kit_competencies` | 5 universal competencies | `code`, `name`, `description` |
| `interview_kit_questions` | Questions per competency | `industry_segment_id`, `expertise_level_id`, `competency_id`, `question_text`, `expected_answer` |
| `question_bank` | Domain-specific questions | `speciality_id`, `usage_mode` (includes 'interview'), `question_type` |
| `proof_points` | Provider evidence | `description`, `title`, `category` |
| `provider_specialities` | Provider's selected specialities | `enrollment_id`, `speciality_id` |
| `provider_proficiency_areas` | Provider's selected areas | `enrollment_id`, `proficiency_area_id` |

### Key Schema Observations

1. **Review Notes** already exist in `interview_bookings`:
   - `flag_for_clarification` (boolean)
   - `notes` (for clarification text)
   - `reviewer_notes` (general reviewer notes)

2. **Interview Evaluations** table exists with `overall_score` and `outcome`

3. **Question Sources**:
   - `interview_kit_questions` - Universal competency questions (filtered by industry + expertise level)
   - `question_bank` with `usage_mode = 'interview'` or `'both'` - Domain-specific questions (filtered by provider's specialities)

4. **Missing**: Per-question response storage for interview ratings

## Database Changes Required

### New Table: `interview_question_responses`

Stores per-question ratings during interviews:

```sql
CREATE TABLE public.interview_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES interview_evaluations(id) ON DELETE CASCADE,
  question_source TEXT NOT NULL CHECK (question_source IN ('interview_kit', 'question_bank', 'proof_point')),
  question_id UUID, -- FK to interview_kit_questions OR question_bank (nullable for proof points)
  proof_point_id UUID REFERENCES proof_points(id), -- For proof point deep-dive questions
  question_text TEXT NOT NULL, -- Stored copy for audit trail
  rating TEXT NOT NULL CHECK (rating IN ('right', 'wrong', 'not_answered')),
  comments TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  
  UNIQUE(evaluation_id, question_source, question_id, proof_point_id, display_order)
);

-- RLS Policies
ALTER TABLE interview_question_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewers manage own responses" ON interview_question_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM interview_evaluations ie
      JOIN panel_reviewers pr ON ie.reviewer_id = pr.id
      WHERE ie.id = interview_question_responses.evaluation_id
      AND pr.user_id = auth.uid()
    )
  );
```

## Architecture Design

### Question Generation Strategy

```text
┌─────────────────────────────────────────────────────────────────┐
│                    INTERVIEW QUESTION SOURCES                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SECTION 1: Domain & Delivery Depth                             │
│  ├── Source: question_bank WHERE usage_mode IN ('interview','both')│
│  ├── Filter: Provider's selected specialities                   │
│  └── Limit: Random sample based on available questions          │
│                                                                  │
│  SECTION 2: Proof Points Deep-Dive                              │
│  ├── Source: proof_points for enrollment                        │
│  ├── Generate: 1-2 follow-up questions per proof point          │
│  └── Focus: Validate real-world experience                      │
│                                                                  │
│  SECTIONS 3-7: Universal Competencies (5 sections)              │
│  ├── Source: interview_kit_questions                            │
│  ├── Filter: industry_segment + expertise_level                 │
│  ├── Group by: competency_id                                    │
│  └── Limit: 2-3 questions per competency                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Scoring Logic

| Rating | Points |
|--------|--------|
| Right | 5 |
| Wrong | 0 |
| Not Answered | 0 |

**Recommendation Thresholds** (from screenshot):
- ≥ 80%: Strong Recommend
- 65-79%: Recommend with Conditions
- 50-64%: Borderline / Re-interview
- < 50%: Not Recommended

## Files to Create

### 1. `src/components/reviewer/candidates/InterviewKitTabContent.tsx`

Main container component with:
- Provider context header (read-only)
- Review Notes section (reusing existing fields)
- Interview Questions accordion/collapsible sections
- Scoring summary header
- Submit validation and footer

### 2. `src/components/reviewer/candidates/InterviewKitHeader.tsx`

Displays:
- Progress: X/Y questions rated
- Total Score: X/Max
- Sections count
- Panel Recommendation (auto-derived)
- Rating Distribution breakdown

### 3. `src/components/reviewer/candidates/InterviewKitScoringLogic.tsx`

Visual reference for scoring rules:
- Rating Values (Right=5, Wrong=0, Not Answered=0)
- Panel Recommendation thresholds
- Note about mandatory comments for Wrong/Not Answered

### 4. `src/components/reviewer/candidates/InterviewQuestionSection.tsx`

Collapsible section for each question category:
- Header with section name + score summary
- List of InterviewQuestionCard components
- Progress indicator (X/Y rated)

### 5. `src/components/reviewer/candidates/InterviewQuestionCard.tsx`

Individual question with:
- Question number + text
- Expected answer (collapsible for reviewer reference)
- Rating radio group (Right/Wrong/Not Answered)
- Comments textarea (optional, but mandatory for Wrong/Not Answered)
- Auto-save on change (debounced)

### 6. `src/components/reviewer/candidates/InterviewKitReviewNotes.tsx`

Review notes section showing:
- Flag for Clarification card (with badge)
- Reviewer Notes card
- Add/Edit inline functionality

### 7. `src/components/reviewer/candidates/InterviewKitFooter.tsx`

Footer with:
- Export Scorecard PDF button
- Submit Interview button (disabled until all rated)
- Validation messages

### 8. `src/hooks/queries/useInterviewKitSession.ts`

New hook with:
- `useInterviewKitQuestions(enrollmentId)` - Generate and fetch questions
- `useInterviewEvaluation(bookingId)` - Get/create evaluation record
- `useSaveInterviewResponse` - Save individual question rating
- `useSubmitInterviewKit` - Validate and submit final scores

### 9. `src/services/interviewKitQuestionService.ts`

Service for question generation:
- `generateDomainQuestions(enrollmentId)` - From question_bank
- `generateProofPointQuestions(enrollmentId)` - From proof points
- `generateCompetencyQuestions(industryId, levelId)` - From interview_kit_questions
- Random selection with non-repetition logic

### 10. `src/constants/interview-kit-scoring.constants.ts`

Add to existing constants:
```typescript
export const INTERVIEW_RATING_POINTS = {
  right: 5,
  wrong: 0,
  not_answered: 0,
} as const;

export const RECOMMENDATION_THRESHOLDS = {
  strong_recommend: 80,
  recommend_with_conditions: 65,
  borderline: 50,
  not_recommended: 0,
} as const;
```

## Implementation Steps

### Phase 1: Database Setup

1. Create `interview_question_responses` table with RLS
2. Create indexes for query performance
3. Regenerate Supabase types

### Phase 2: Question Generation Service

1. Create `interviewKitQuestionService.ts`
2. Implement domain question fetching (from question_bank)
3. Implement competency question fetching (from interview_kit_questions)
4. Implement proof point question generation
5. Add randomization with deterministic ordering per session

### Phase 3: Data Hooks

1. Create `useInterviewKitSession.ts` with:
   - Question generation hook
   - Evaluation creation/fetch hook
   - Response save mutation (debounced)
   - Submit mutation with validation

### Phase 4: UI Components

1. Build `InterviewKitHeader.tsx` (score summary)
2. Build `InterviewKitScoringLogic.tsx` (reference panel)
3. Build `InterviewQuestionCard.tsx` (rating + comments)
4. Build `InterviewQuestionSection.tsx` (collapsible group)
5. Build `InterviewKitReviewNotes.tsx` (flag + notes)
6. Build `InterviewKitFooter.tsx` (submit + export)
7. Build `InterviewKitTabContent.tsx` (orchestrator)

### Phase 5: Integration

1. Enable the Interview Kit tab in `CandidateDetailPage.tsx`
2. Add the `InterviewKitTabContent` component
3. Update index exports

### Phase 6: Testing & Polish

1. Test question generation with various enrollments
2. Verify scoring calculations
3. Test submission validation
4. Add loading/error/empty states

## UI Layout (Based on Screenshots)

```text
┌─────────────────────────────────────────────────────────────────┐
│ INTERVIEW KIT HEADER                                            │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│   Progress    │  Total Score  │   Sections    │ Recommendation  │
│    0/24       │    0/120      │      7        │ Not Recommended │
├───────────────┴───────────────┴───────────────┴─────────────────┤
│ Rating Distribution (Overall Interview)                          │
│ ◉ Right   0.0%  │  ○ Wrong  0.0%  │  ○ Not Answered  0.0%       │
├─────────────────────────────────────────────────────────────────┤
│ SCORING LOGIC                                                    │
│ Right = 5 pts  |  Wrong = 0 pts  |  Not Answered = 0 pts       │
│ Panel Recommendation:                                            │
│   ≥80% Strong Recommend | 65-79% Conditions | 50-64% Borderline │
├─────────────────────────────────────────────────────────────────┤
│ INTERVIEW QUESTIONS                                              │
│ Auto-generated from: Industry → Level → Areas → Specialities    │
│                                                                  │
│ ▼ Domain & Delivery Depth (5 questions)            0/25  0/5    │
│ ▼ Proof Points Deep-Dive (4 questions)             0/20  0/4    │
│ ▼ Solution Design & Architecture (3 questions)    0/15  0/3    │
│ ▼ Execution & Governance (3 questions)             0/15  0/3    │
│ ▼ Data/Tech Readiness & Tooling (2 questions)      0/10  0/2    │
│ ▼ Soft Skills for Provider Success (4 questions)  0/20  0/4    │
│ ▼ Innovation & Co-creation Ability (3 questions)  0/15  0/3    │
├─────────────────────────────────────────────────────────────────┤
│ [Complete all ratings to export the final scorecard]            │
│                                          [📥 Export Scorecard PDF]│
└─────────────────────────────────────────────────────────────────┘
```

## Technical Notes

1. **Question Randomization**: Use deterministic seeding based on `booking_id` so refreshing shows same questions
2. **Auto-save**: Debounce rating saves (500ms) to reduce API calls
3. **Comments Validation**: Required when rating is "Wrong" or "Not Answered"
4. **PDF Export**: Use existing html2pdf.js dependency
5. **Optimistic Updates**: Update local state immediately, then sync to server

## Dependencies

- Uses existing: `@tanstack/react-query`, `sonner`, `lucide-react`, `html2pdf.js`
- Patterns: Follows ProofPointsTabContent structure for consistency
- Constants: Extends `interview-kit.constants.ts`

## Acceptance Criteria

1. Interview Kit tab is enabled and clickable
2. Questions auto-generated from 3 sources (domain, proof points, competencies)
3. Each question displays with rating controls and optional comments
4. Ratings save automatically (debounced)
5. Comments required for Wrong/Not Answered ratings
6. Score calculated in real-time
7. Submit blocked until all questions rated
8. Panel recommendation updates based on score percentage
9. Export to PDF available after completion
10. Review notes (flag + general) editable from this tab
