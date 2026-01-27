
# Interview Kit Tab - Final Foolproof Implementation Plan

## Overview
This plan implements the complete Interview Kit tab for reviewers on the Candidate Detail page, enabling structured interview scoring with auto-generated questions from three sources, matching the exact UI shown in the reference screenshots.

---

## Design Reference Analysis (From Screenshots)

### Header Statistics Panel
```text
┌───────────────┬───────────────┬───────────────┬─────────────────────┐
│   Progress    │  Total Score  │   Sections    │   Recommendation    │
│     0/24      │    0/120      │       7       │  Not Recommended    │
│               │     0.0%      │               │   (red badge)       │
└───────────────┴───────────────┴───────────────┴─────────────────────┘
```

### Rating Distribution Row
```text
┌─ Right ────────┬─ Wrong ───────┬─ Not Answered ─┐
│  0.0%  (0/24)  │  0.0%  (0/24) │   0.0%  (0/24) │
└────────────────┴───────────────┴────────────────┘
```

### Scoring Logic Panel (Info section)
- Right = 5 points, Wrong = 0 points, Not Answered = 0 points
- ≥80% = Strong Recommend
- 65-79% = Recommend with Conditions
- 50-64% = Borderline / Re-interview
- <50% = Not Recommended
- **Note: Comments are mandatory when rating as "Wrong" or "Not Answered"**

### 7 Collapsible Sections
1. **Domain & Delivery Depth** (5 questions) - 0/25 score, 0/5 rated
2. **Proof Points Deep-Dive** (4 questions) - 0/20 score, 0/4 rated
3. **Solution Design & Architecture Thinking** (2 questions) - 0/10, 0/2 rated
4. **Execution & Governance** (3 questions) - 0/15, 0/3 rated
5. **Data/Tech Readiness & Tooling Awareness** (2 questions) - 0/10, 0/2 rated
6. **Soft Skills for Solution Provider Success** (4 questions) - 0/20, 0/4 rated
7. **Innovation & Co-creation Ability** (3 questions) - 0/15, 0/3 rated

### Footer
- "Complete all ratings to export the final scorecard"
- "Export Scorecard PDF" button

---

## Database Schema Changes

### New Table: `interview_question_responses`

```sql
CREATE TABLE IF NOT EXISTS public.interview_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES interview_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES panel_reviewers(id),
  
  -- Question source tracking
  question_source VARCHAR(30) NOT NULL CHECK (question_source IN (
    'question_bank',    -- Domain & Delivery Depth questions
    'proof_point',      -- Proof Points Deep-Dive questions
    'interview_kit',    -- Universal Competency questions
    'reviewer_custom'   -- Custom questions added by reviewer
  )),
  
  -- Source references (one populated based on question_source)
  question_bank_id UUID REFERENCES question_bank(id),
  proof_point_id UUID REFERENCES proof_points(id),
  interview_kit_question_id UUID REFERENCES interview_kit_questions(id),
  
  -- Section grouping
  section_type VARCHAR(50) NOT NULL, -- 'domain_delivery', 'proof_points', 'competency_<code>'
  section_label VARCHAR(150) NOT NULL,
  
  -- Question content (snapshot for audit trail)
  question_text TEXT NOT NULL,
  expected_answer TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Rating data
  rating VARCHAR(20) CHECK (rating IN ('right', 'wrong', 'not_answered')),
  score INTEGER DEFAULT 0,
  comments TEXT,
  
  -- Soft delete for CRUD
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_interview_responses_booking ON interview_question_responses(booking_id);
CREATE INDEX idx_interview_responses_section ON interview_question_responses(section_type);
CREATE INDEX idx_interview_responses_source ON interview_question_responses(question_source);
CREATE INDEX idx_interview_responses_deleted ON interview_question_responses(booking_id, is_deleted);
```

### Alter `interview_bookings` (Add Interview Score Columns)

```sql
ALTER TABLE public.interview_bookings 
ADD COLUMN IF NOT EXISTS interview_score_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS interview_score_out_of_10 DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS interview_total_questions INTEGER,
ADD COLUMN IF NOT EXISTS interview_correct_count INTEGER,
ADD COLUMN IF NOT EXISTS panel_recommendation VARCHAR(50),
ADD COLUMN IF NOT EXISTS interview_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_submitted_by UUID REFERENCES auth.users(id);
```

### RLS Policies for `interview_question_responses`

```sql
-- Enable RLS
ALTER TABLE interview_question_responses ENABLE ROW LEVEL SECURITY;

-- SELECT: Assigned reviewers can view
CREATE POLICY "Reviewers can view interview responses for their bookings"
ON interview_question_responses FOR SELECT
USING (is_reviewer_assigned_to_booking(booking_id));

-- INSERT: Assigned reviewers with accepted status
CREATE POLICY "Reviewers can create interview responses"
ON interview_question_responses FOR INSERT
WITH CHECK (is_reviewer_assigned_to_booking(booking_id));

-- UPDATE: Assigned reviewers can update non-deleted questions
CREATE POLICY "Reviewers can update interview responses"
ON interview_question_responses FOR UPDATE
USING (is_reviewer_assigned_to_booking(booking_id));

-- DELETE: Soft delete only (handled by UPDATE)
```

---

## Question Generation Logic

### Section 1: Domain & Delivery Depth (Max 10 Questions)

**Source**: `question_bank` table

**Selection Criteria**:
```typescript
// Get provider's selected specialities for this enrollment
const specialityIds = await getProviderSpecialities(enrollmentId);

// Query question_bank
SELECT * FROM question_bank
WHERE speciality_id = ANY(specialityIds)
  AND usage_mode IN ('interview', 'both')
  AND is_active = true
ORDER BY RANDOM()
LIMIT 10;
```

**Fields to Display**:
- `question_text` - The question
- `expected_answer_guidance` - Expected answer guidance

### Section 2: Proof Points Deep-Dive (1-2 Questions Per Proof Point)

**Source**: Auto-generated from proof point descriptions

**Generation Logic**:
```typescript
const PROOF_POINT_QUESTION_TEMPLATES: Record<string, string[]> = {
  project: [
    "Walk us through the key challenges you faced in '{title}' and how you overcame them.",
    "What measurable outcomes did you achieve with '{title}'?"
  ],
  case_study: [
    "Describe the methodology you used for '{title}'.",
    "What lessons learned from '{title}' would you apply to future work?"
  ],
  certification: [
    "How has obtaining '{title}' influenced your professional approach?",
    "Describe a real scenario where you applied knowledge from '{title}'."
  ],
  award: [
    "What specific achievement led to receiving '{title}'?",
  ],
  publication: [
    "Explain the core thesis of '{title}' and its practical applications.",
  ],
  portfolio: [
    "Walk us through a key piece in '{title}' and your creative process.",
  ],
  testimonial: [
    "Tell us more about the work that led to this testimonial for '{title}'.",
  ],
  other: [
    "Describe the significance of '{title}' in your professional journey.",
  ]
};

// Generate 1-2 questions per proof point based on type
// Use description as "expected_answer" guidance
```

**Algorithm**:
1. Fetch all proof points for the enrollment
2. For each proof point:
   - Select 1-2 templates based on `type`
   - Replace `{title}` with actual title
   - Use description as `expected_answer`
3. Limit to max 2 questions per proof point

### Section 3-7: Universal Competencies (1-2 Questions Per Competency)

**Source**: `interview_kit_questions` table

**Selection Criteria**:
```typescript
// For each competency
SELECT * FROM interview_kit_questions
WHERE industry_segment_id = enrollment.industry_segment_id
  AND expertise_level_id = enrollment.expertise_level_id
  AND competency_id = competency.id
  AND is_active = true
ORDER BY RANDOM()
LIMIT 2;
```

**5 Competency Sections**:
1. Solution Design & Architecture Thinking
2. Execution & Governance
3. Data/Tech Readiness & Tooling Awareness
4. Soft Skills for Solution Provider Success
5. Innovation & Co-creation Ability

---

## Scoring System

### Rating Values
```typescript
const RATING_SCORES = {
  right: 5,
  wrong: 0,
  not_answered: 0,
} as const;
```

### Score Calculation
```typescript
const maxMarks = totalQuestions * 5;
const earnedMarks = questions.reduce((sum, q) => 
  sum + (q.rating === 'right' ? 5 : 0), 0);
const scorePercentage = (earnedMarks / maxMarks) * 100;
const scoreOutOf10 = scorePercentage / 10;
```

### Panel Recommendation (Auto-Derived)
```typescript
const RECOMMENDATION_THRESHOLDS = {
  strong_recommend: { min: 80, label: 'Strong Recommend', color: 'green' },
  with_conditions: { min: 65, label: 'Recommend with Conditions', color: 'blue' },
  borderline: { min: 50, label: 'Borderline / Re-interview', color: 'amber' },
  not_recommended: { min: 0, label: 'Not Recommended', color: 'red' },
} as const;

function getRecommendation(percentage: number): string {
  if (percentage >= 80) return 'strong_recommend';
  if (percentage >= 65) return 'with_conditions';
  if (percentage >= 50) return 'borderline';
  return 'not_recommended';
}
```

### Validation Rule: Comments Mandatory for Wrong/Not Answered
```typescript
// When rating === 'wrong' || rating === 'not_answered'
// comments field becomes REQUIRED before submission
const hasValidationError = questions.some(q => 
  (q.rating === 'wrong' || q.rating === 'not_answered') && 
  (!q.comments || q.comments.trim() === '')
);
```

---

## UI Component Architecture

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/reviewer/candidates/InterviewKitTabContent.tsx` | Main tab container |
| `src/components/reviewer/candidates/InterviewKitStatsHeader.tsx` | Progress/Score/Sections/Recommendation cards |
| `src/components/reviewer/candidates/InterviewKitRatingDistribution.tsx` | Right/Wrong/Not Answered distribution |
| `src/components/reviewer/candidates/InterviewKitScoringLogic.tsx` | Collapsible scoring rules panel |
| `src/components/reviewer/candidates/InterviewQuestionSection.tsx` | Collapsible section wrapper with score/rated count |
| `src/components/reviewer/candidates/InterviewQuestionCard.tsx` | Individual question with rating + comments |
| `src/components/reviewer/candidates/InterviewKitFooter.tsx` | Submit + Export PDF footer |
| `src/components/reviewer/candidates/AddInterviewQuestionDialog.tsx` | Dialog for adding custom questions |
| `src/hooks/queries/useInterviewKitSession.ts` | Data fetching and mutations |
| `src/services/interviewQuestionGenerationService.ts` | Question generation logic |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/reviewer/CandidateDetailPage.tsx` | Enable Interview Kit tab, add component |
| `src/components/reviewer/candidates/index.ts` | Export new components |
| `src/constants/interview-kit.constants.ts` | Add scoring/recommendation constants |

---

## Component Details

### InterviewKitStatsHeader
```text
┌─────────────────────────────────────────────────────────────────┐
│  Progress │ Total Score │ Sections │      Recommendation       │
│   0/24    │   0/120     │    7     │  [Badge: Not Recommended] │
│           │    0.0%     │          │       (red variant)       │
└─────────────────────────────────────────────────────────────────┘
```

### InterviewKitRatingDistribution
```text
┌─────────────────────────────────────────────────────────────────┐
│ Rating Distribution (Overall Interview)                         │
│ ○ Right   0.0%  0/24  │  ○ Wrong  0.0%  0/24  │  ○ N/A  0.0%   │
└─────────────────────────────────────────────────────────────────┘
```

### InterviewKitScoringLogic (Collapsible Info Panel)
```text
┌─────────────────────────────────────────────────────────────────┐
│ Scoring Logic                                                   │
│ ─────────────────                                               │
│ Rating Values:                                                  │
│ Right = 5 points  |  Wrong = 0 points  |  Not Answered = 0      │
│                                                                 │
│ Panel Recommendation (Auto-derived):                            │
│ ✓ ≥ 80% = Strong Recommend                                      │
│ ✓ 65-79% = Recommend with Conditions                            │
│ ✓ 50-64% = Borderline / Re-interview                            │
│ ✗ < 50% = Not Recommended                                       │
│                                                                 │
│ Note: Comments are mandatory when rating "Wrong" or "Not        │
│       Answered"                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### InterviewQuestionSection (Collapsible)
```text
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Domain & Delivery Depth                      0/25    0/5     │
│   5 questions                                  score   rated   │
├─────────────────────────────────────────────────────────────────┤
│   [Question Cards...]                                           │
└─────────────────────────────────────────────────────────────────┘
```

### InterviewQuestionCard
```text
┌─────────────────────────────────────────────────────────────────┐
│ Q1. Walk us through the key challenges...           [Edit][Del]│
├─────────────────────────────────────────────────────────────────┤
│ Rating:  ○ Right (5 pts)  ○ Wrong (0 pts)  ○ Not Answered (0)  │
├─────────────────────────────────────────────────────────────────┤
│ Expected Answer:                                                │
│ "The provider should describe specific challenges, their        │
│  approach to resolution, and measurable outcomes..."            │
├─────────────────────────────────────────────────────────────────┤
│ Comments: [textarea - REQUIRED if Wrong/Not Answered]           │
│ ⚠ Comments required when rating as Wrong or Not Answered       │
└─────────────────────────────────────────────────────────────────┘
```

### InterviewKitFooter
```text
┌─────────────────────────────────────────────────────────────────┐
│ Complete all ratings to export the final scorecard             │
│                                    [📥 Export Scorecard PDF]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## CRUD Operations

### Edit Question
- Inline edit for question text (custom questions only)
- Edit expected answer guidance
- Real-time save with debounce

### Delete Question
- Soft delete (is_deleted = true)
- Question removed from view immediately
- Does not count toward totals

### Add Custom Question
- Dialog with:
  - Section selector (which section to add to)
  - Question text (required)
  - Expected answer (optional)
- Creates with `question_source = 'reviewer_custom'`
- Appended to selected section

---

## Data Hook: useInterviewKitSession

```typescript
interface InterviewKitSession {
  // Header stats
  totalQuestions: number;
  ratedCount: number;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  sectionCount: number;
  recommendation: string;
  
  // Distribution
  rightCount: number;
  wrongCount: number;
  notAnsweredCount: number;
  
  // Questions grouped by section
  sections: InterviewSection[];
  
  // Submit state
  isSubmitted: boolean;
  submittedAt: string | null;
  canSubmit: boolean; // all rated + comments valid
  validationErrors: string[];
}

interface InterviewSection {
  id: string;
  type: string;
  label: string;
  questions: InterviewQuestion[];
  sectionScore: number;
  sectionMaxScore: number;
  ratedCount: number;
}

interface InterviewQuestion {
  id: string;
  questionText: string;
  expectedAnswer: string | null;
  source: 'question_bank' | 'proof_point' | 'interview_kit' | 'reviewer_custom';
  rating: 'right' | 'wrong' | 'not_answered' | null;
  score: number;
  comments: string;
  isEditable: boolean; // true for reviewer_custom
  validationError: string | null; // "Comments required" if applicable
}
```

### Mutations
```typescript
// Generate questions on first load
useGenerateInterviewQuestions(bookingId, enrollmentId)

// Save rating (autosave)
useSaveQuestionRating(questionId, rating, comments)

// Add custom question
useAddCustomQuestion(bookingId, sectionType, questionText, expectedAnswer)

// Delete question (soft)
useDeleteInterviewQuestion(questionId)

// Update question text (custom only)
useUpdateInterviewQuestion(questionId, questionText, expectedAnswer)

// Submit interview
useSubmitInterview(bookingId) // validates all rated + comments
```

---

## Implementation Phases

### Phase 1: Database Schema (Migration)
1. Create `interview_question_responses` table
2. Add score columns to `interview_bookings`
3. Add RLS policies
4. Test migration

### Phase 2: Constants & Types
1. Add scoring constants to `interview-kit.constants.ts`
2. Add proof point question templates
3. Add recommendation threshold constants

### Phase 3: Question Generation Service
1. Create `interviewQuestionGenerationService.ts`
2. Implement domain questions from question_bank
3. Implement proof point questions from descriptions
4. Implement competency questions from interview_kit_questions

### Phase 4: Data Hooks
1. Create `useInterviewKitSession.ts`
2. Implement question fetching and grouping
3. Implement rating mutations
4. Implement validation logic

### Phase 5: UI Components
1. `InterviewKitStatsHeader` - stats cards
2. `InterviewKitRatingDistribution` - distribution row
3. `InterviewKitScoringLogic` - collapsible info panel
4. `InterviewQuestionSection` - section wrapper
5. `InterviewQuestionCard` - question with rating
6. `InterviewKitFooter` - submit/export
7. `AddInterviewQuestionDialog` - add custom question
8. `InterviewKitTabContent` - main container

### Phase 6: Integration
1. Enable Interview Kit tab in CandidateDetailPage
2. Wire up tab content
3. Test full flow

### Phase 7: PDF Export
1. Implement scorecard PDF generation
2. Include all sections, scores, recommendations

---

## Validation Rules Summary

| Rule | Condition | Error Message |
|------|-----------|---------------|
| All questions rated | Every question has rating selected | "Please rate all questions before submitting" |
| Comments for Wrong | rating === 'wrong' && !comments | "Comments required for Wrong ratings" |
| Comments for Not Answered | rating === 'not_answered' && !comments | "Comments required for Not Answered ratings" |

---

## Testing Checklist

- [ ] Questions generate correctly for all 3 sources
- [ ] Max 10 questions for Domain & Delivery Depth
- [ ] Max 2 questions per proof point (from description)
- [ ] 1-2 questions per competency from interview_kit_questions
- [ ] Rating selection updates score immediately
- [ ] Comments textarea appears for all ratings
- [ ] Comments REQUIRED for Wrong/Not Answered
- [ ] Validation blocks submit if any rating missing
- [ ] Validation blocks submit if comments missing for Wrong/Not Answered
- [ ] Add custom question works
- [ ] Edit question works (custom only)
- [ ] Delete question works (soft delete)
- [ ] Score calculation is correct
- [ ] Recommendation auto-updates based on percentage
- [ ] Export PDF generates correctly
- [ ] Data persists on page refresh

---

## Files Summary

### Create (11 files)
1. `src/components/reviewer/candidates/InterviewKitTabContent.tsx`
2. `src/components/reviewer/candidates/InterviewKitStatsHeader.tsx`
3. `src/components/reviewer/candidates/InterviewKitRatingDistribution.tsx`
4. `src/components/reviewer/candidates/InterviewKitScoringLogic.tsx`
5. `src/components/reviewer/candidates/InterviewQuestionSection.tsx`
6. `src/components/reviewer/candidates/InterviewQuestionCard.tsx`
7. `src/components/reviewer/candidates/InterviewKitFooter.tsx`
8. `src/components/reviewer/candidates/AddInterviewQuestionDialog.tsx`
9. `src/hooks/queries/useInterviewKitSession.ts`
10. `src/services/interviewQuestionGenerationService.ts`
11. Migration file for database changes

### Modify (3 files)
1. `src/pages/reviewer/CandidateDetailPage.tsx` - Enable tab, add component
2. `src/components/reviewer/candidates/index.ts` - Export new components
3. `src/constants/interview-kit.constants.ts` - Add scoring/recommendation constants

---

## Key Refinements from Previous Plan

1. **Proof Points Section**: Now explicitly generates 1-2 questions per proof point from its description using type-specific templates
2. **Comments Mandatory**: Changed to require comments only for Wrong/Not Answered (not optional)
3. **Header Stats Panel**: Added exact layout matching screenshot (Progress, Total Score, Sections, Recommendation)
4. **Rating Distribution Row**: Added distribution visualization
5. **Scoring Logic Panel**: Added info panel explaining the scoring system
6. **7 Sections**: Correctly structured as Domain + Proof Points + 5 Competencies
7. **Export Scorecard PDF**: Added footer with export functionality
