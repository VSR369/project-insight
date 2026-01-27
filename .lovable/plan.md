
# Interview Kit Complete Implementation Plan

## Overview

This plan implements the complete Interview Kit functionality for reviewers with:
1. **Domain & Delivery Depth**: Max 10 questions from question_bank (interview/both usage_mode)
2. **Competency Questions**: 1-2 questions per competency from interview_kit_questions
3. **Proof Points Deep-Dive**: 1-2 questions per proof point based on description
4. **CRUD Operations**: Edit, delete, and add new questions
5. **Rating System**: Right (5 pts), Wrong (0 pts), Not Answered (0 pts)
6. **Expected Response Display**: Collapsible guidance per question

---

## Architecture Overview

```text
CandidateDetailPage
  └── InterviewKitTabContent (enrollmentId)
        ├── useInterviewKitEvaluation() → fetch/create evaluation + questions
        ├── useCandidateExpertise() → get speciality IDs for domain questions
        ├── useCandidateProofPoints() → get proof points for questions
        ├── useInterviewKitCompetencies() → get 5 competencies
        │
        ├── InterviewKitHeader
        ├── InterviewKitSection (Domain & Delivery Depth)
        │     └── InterviewQuestionCard[] (generated from question_bank)
        │     └── AddQuestionButton
        ├── InterviewKitSection (Proof Points Deep-Dive)
        │     └── ProofPointQuestionGroup[] (1-2 questions per proof point)
        │     └── AddQuestionButton
        ├── InterviewKitSection[] (5 Competencies)
        │     └── InterviewQuestionCard[] (from interview_kit_questions)
        │     └── AddQuestionButton
        └── InterviewKitFooter (Export Scorecard)
```

---

## Data Model

### interview_evaluations (Existing)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| booking_id | UUID | Links to interview booking |
| reviewer_id | UUID | Panel reviewer |
| overall_score | numeric | Final computed score |
| outcome | varchar | Pass/Fail |

### interview_question_responses (Existing)
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| evaluation_id | UUID | FK to evaluation |
| question_source | text | 'question_bank', 'interview_kit', 'proof_point', 'custom' |
| question_id | UUID | Source question (optional) |
| proof_point_id | UUID | For proof point questions |
| question_text | text | Actual question |
| expected_answer | text | Guidance for reviewer |
| rating | text | 'right', 'wrong', 'not_answered', null |
| score | integer | 5, 0, 0 |
| comments | text | Optional reviewer comments |
| section_name | text | Display section name |
| section_type | varchar | 'domain', 'proof_point', 'competency' |
| section_label | varchar | Proof point title / competency name |
| display_order | integer | Ordering |
| is_deleted | boolean | Soft delete |

---

## Files to Create

### 1. New Hooks

**`src/hooks/queries/useInterviewKitEvaluation.ts`**
- `useInterviewKitEvaluation(bookingId, enrollmentId)` - Fetch or create evaluation + questions
- `useGenerateInterviewQuestions()` - Generate questions on first load
- `useUpdateQuestionRating()` - Update rating + score
- `useUpdateQuestionText()` - Edit question text
- `useDeleteQuestion()` - Soft delete (is_deleted = true)
- `useAddCustomQuestion()` - Add new question to any section

### 2. New Components

**`src/components/reviewer/interview-kit/InterviewQuestionCard.tsx`**
- Question number + text (editable via Edit button)
- Hierarchy breadcrumb (Proficiency > Sub-domain > Speciality) for domain questions
- "Strong answer should include..." collapsible expected answer
- Rating radio buttons: Right (5), Wrong (0), Not Answered (0)
- Comments textarea (NOT required for wrong/not answered)
- Edit + Delete buttons

**`src/components/reviewer/interview-kit/AddQuestionDialog.tsx`**
- Dialog for adding custom questions
- Fields: Question text, Expected answer (optional), Section selection

**`src/components/reviewer/interview-kit/EditQuestionDialog.tsx`**
- Dialog for editing existing questions
- Fields: Question text, Expected answer

**`src/components/reviewer/interview-kit/DeleteQuestionConfirm.tsx`**
- Confirmation dialog for soft delete

**`src/components/reviewer/interview-kit/ProofPointQuestionGroup.tsx`**
- Wrapper showing proof point title, category badges, description
- "View Details" button
- Child questions (1-2 per proof point)
- "Add New Question" button per proof point

### 3. Service for Question Generation

**`src/services/interviewKitGenerationService.ts`**
- `generateDomainQuestions(specialityIds, limit)` - Random 10 from question_bank
- `generateCompetencyQuestions(competencies, industryId, levelId)` - 1-2 per competency
- `generateProofPointQuestions(proofPoints)` - 1-2 per proof point based on description

---

## Question Generation Logic

### Domain Questions (Max 10)
```typescript
// 1. Get provider's selected speciality IDs from useCandidateExpertise
// 2. Query question_bank with:
//    - speciality_id IN (specialityIds)
//    - usage_mode IN ('interview', 'both')
//    - is_active = true
// 3. Randomly select 10 questions balanced across specialities
// 4. For each question, fetch hierarchy path (Proficiency > Sub-domain > Speciality)
```

### Competency Questions (1-2 per competency = 5-10 total)
```typescript
// 1. For each competency:
//    - Query interview_kit_questions with:
//      - competency_id = competency.id
//      - industry_segment_id = enrollment.industry_segment_id
//      - expertise_level_id = enrollment.expertise_level_id
//      - is_active = true
//    - Randomly select 1-2 questions
// 2. If no questions match for specific industry/level, fallback to any active
```

### Proof Point Questions (1-2 per proof point)
```typescript
// Templates for generating questions based on description:
const TEMPLATES = [
  'In your proof point "{title}", you mentioned {extract}. Can you elaborate on the specific approach you took?',
  'Regarding "{title}": What measurable outcomes did you achieve?',
  'For "{title}", what were the key challenges and how did you overcome them?',
  'Can you walk me through the methodology you used for "{title}"?',
];

// 1. For each proof point:
//    - Extract key phrases from description
//    - Generate 1-2 questions using templates + description context
//    - Set expected_answer to summary of description for reviewer reference
```

---

## UI Component Specifications

### InterviewQuestionCard (Per Screenshot Reference)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Q1. How do you define Cost-to-Serve for a district/company?           ✏️ 🗑️│
│                                                                             │
│ Proficiency: Shaping Strategic Direction & Enterprise Intent               │
│ Sub-domain: SCM Strategy & Value Framework                                  │
│ Speciality: Cost-to-Serve Optimization Strategy                             │
│                                                                             │
│ ▸ Strong answer should include...                                           │
│   [Collapsible: expected_answer_guidance text]                              │
│                                                                             │
│ Rating *                                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐                  │
│ │  ● Right (5) │ │  ○ Wrong (0) │ │  ○ Not Answered (0) │                  │
│ └──────────────┘ └──────────────┘ └─────────────────────┘                  │
│                                                                             │
│ Comments                                                                    │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ Add your assessment comments here...                                    ││
│ └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### ProofPointQuestionGroup (Per Screenshot Reference)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▾ Led cross-functional stakeholder workshops...    [PP 04] [Medium Relevance]│
│                                                                              │
│   Context Outcome: Successfully aligned 10+ stakeholders                     │
│   📍 Enterprise Process Mapping                                              │
│   1 question generated                                                       │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────────┐│
│   │ Q8. In your workshop leadership proof point, what was the hardest     ││
│   │     stakeholder conflict and how did you resolve it?           ✏️ 🗑️ ││
│   │                                                                        ││
│   │ ▸ Strong answer should include...                                      ││
│   │   [Collapsible: Outcomes, methods, challenges]                         ││
│   │                                                                        ││
│   │ Rating * [Right (5)] [Wrong (0)] [Not Answered (0)]                    ││
│   │ Comments: [textarea]                                                   ││
│   └────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│   ⊕ Add New Question                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx` | Complete rewrite with question generation and section rendering |
| `src/components/reviewer/interview-kit/InterviewKitSection.tsx` | Add children prop support for question cards |
| `src/components/reviewer/interview-kit/index.ts` | Export new components |

---

## Implementation Steps

### Phase 1: Hook for Evaluation + Questions
1. Create `useInterviewKitEvaluation.ts` with:
   - Fetch existing evaluation + responses
   - Create evaluation if not exists
   - Generate questions on first load
   - CRUD mutations for questions

### Phase 2: Question Generation Service
2. Create `interviewKitGenerationService.ts`:
   - `generateDomainQuestions()` - query question_bank, random selection
   - `generateCompetencyQuestions()` - query interview_kit_questions
   - `generateProofPointQuestions()` - template-based from description

### Phase 3: UI Components
3. Create `InterviewQuestionCard.tsx`:
   - Display question with hierarchy
   - Collapsible expected answer
   - Rating radio group (Right/Wrong/Not Answered)
   - Optional comments textarea
   - Edit/Delete buttons

4. Create `ProofPointQuestionGroup.tsx`:
   - Proof point header with badges
   - Child question cards
   - Add question button

5. Create `AddQuestionDialog.tsx` + `EditQuestionDialog.tsx`:
   - Form for question text + expected answer
   - Section type selection for add

6. Create `DeleteQuestionConfirm.tsx`:
   - Confirmation before soft delete

### Phase 4: Integration
7. Update `InterviewKitTabContent.tsx`:
   - Fetch all data sources
   - Generate questions on mount (if none exist)
   - Render sections with question cards
   - Handle mutations

8. Update `InterviewKitSection.tsx`:
   - Accept children for question cards
   - Add "Add New Question" button per section

---

## Scoring Rules

| Rating | Score | Comments Required |
|--------|-------|-------------------|
| Right | 5 | No |
| Wrong | 0 | No |
| Not Answered | 0 | No |

- Section score = Sum of all question scores in section
- Max score = questionCount × 5
- Percentage = (score / maxScore) × 100

---

## Technical Decisions

### Question Generation Timing
- Questions generated on first tab visit (if evaluation exists)
- Stored in `interview_question_responses`
- Subsequent visits load from database

### Proof Point Question Templates
```typescript
const PROOF_POINT_TEMPLATES = [
  'Regarding your proof point "{title}": Can you walk me through the specific methodology you used?',
  'In "{title}", what were the measurable outcomes you achieved?',
  'For "{title}", describe the biggest challenge you faced and how you overcame it.',
  'How did you validate the results in "{title}"?',
];
```

### Edit/Delete Logic
- Edit: Update `question_text` and `expected_answer` in `interview_question_responses`
- Delete: Set `is_deleted = true` (soft delete for audit trail)
- Add: Insert new row with `question_source = 'custom'`

---

## Expected Output

After implementation:

| Section | Question Source | Count | Features |
|---------|-----------------|-------|----------|
| Domain & Delivery Depth | question_bank | 10 | Hierarchy path, expected answer, rating, edit/delete |
| Proof Points Deep-Dive | Generated from description | 1-2 per proof point | Proof point header, questions grouped, add custom |
| Solution Design... | interview_kit_questions | 1-2 | Expected answer, rating, edit/delete/add |
| Execution & Governance | interview_kit_questions | 1-2 | Same |
| Data/Tech Readiness... | interview_kit_questions | 1-2 | Same |
| Soft Skills... | interview_kit_questions | 1-2 | Same |
| Innovation & Co-creation | interview_kit_questions | 1-2 | Same |
| **TOTAL** | | ~20-25 questions | Full CRUD, scoring, export |

