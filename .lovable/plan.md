
# Interview Kit Tab - Multi-Phase Implementation Plan

## Overview
This plan implements the Interview Kit tab for reviewers with question generation, scoring, editing capabilities, and submission flow. The implementation follows the updated rules provided and is aligned with the existing codebase patterns.

---

## Data Model Summary (Existing Tables)

| Table | Purpose |
|-------|---------|
| `interview_evaluations` | Stores the overall interview evaluation record per booking per reviewer |
| `interview_question_responses` | Stores individual question ratings with `question_source` field |
| `question_bank` | Domain questions with `usage_mode` filter (`interview`/`both`) |
| `interview_kit_questions` | Universal competency questions by industry/level |
| `interview_kit_competencies` | The 5 universal competency areas |
| `proof_points` | Provider's proof points for question generation |

---

## Question Generation Rules (OVERRIDING Previous Memory)

| Section | Source | Question Count | Selection Logic |
|---------|--------|----------------|-----------------|
| **Domain & Delivery Depth** | `question_bank` (usage_mode = `interview` or `both`) | Max **10 total** | Random selection covering provider's proficiency areas, sub-domains, specialities |
| **Competency Sections** (5 sections) | `interview_kit_questions` per competency | **1-2 per competency** = 5-10 total | Random selection filtered by industry_segment_id + expertise_level_id |
| **Proof Points Deep-Dive** | AI-generated from proof point description | **1-2 per proof point** | Auto-generated follow-up questions based on description |

### Updated Scoring Rules
- **Right** = 5 points
- **Wrong** = 0 points  
- **Not Answered** = 0 points
- **Comments are NOT mandatory** for Wrong or Not Answered (OVERRIDE from previous memory)

### Panel Recommendation (Auto-derived from score percentage)
- ≥80% → "Strong Recommend"
- 65-79% → "Recommend with Conditions"
- 50-64% → "Borderline / Re-interview"
- <50% → "Not Recommended"

---

## Phase 1: Core Data Hooks & Question Generation Service

### Files to Create

**1. `src/hooks/queries/useInterviewKit.ts`**
- Hook to fetch existing interview evaluation and responses for a booking
- Hook to create/update interview evaluation
- Hook to manage interview question responses (create, update, delete)
- Hook to add custom reviewer questions

**2. `src/services/interviewKitGenerationService.ts`**
- `generateDomainQuestions(enrollmentId, industrySegmentId, expertiseLevelId)` → Max 10 random questions from question_bank
- `generateCompetencyQuestions(industrySegmentId, expertiseLevelId)` → 1-2 per competency, 5-10 total
- `generateProofPointQuestions(proofPoints)` → 1-2 AI-style questions per proof point based on description
- `buildFullInterviewKit(enrollmentId)` → Combines all sources, persists to interview_question_responses

**3. `src/constants/interview-kit-reviewer.constants.ts`**
- `DOMAIN_QUESTION_MAX = 10`
- `COMPETENCY_QUESTIONS_PER_SECTION = { min: 1, max: 2 }`
- `PROOF_POINT_QUESTIONS_PER_ITEM = { min: 1, max: 2 }`
- `RATING_VALUES = { right: 5, wrong: 0, not_answered: 0 }`
- `RECOMMENDATION_THRESHOLDS` object

### Database Changes (if needed)
No schema changes required - all needed columns exist in `interview_question_responses`:
- `question_source` (text): `'question_bank'`, `'interview_kit'`, `'proof_point'`, `'reviewer_custom'`
- `section_name` (text): Section display name
- `section_type` (varchar): `'domain'`, `'competency'`, `'proof_point'`, `'custom'`
- `expected_answer` (text): Guidance text
- `rating` (text): `'right'`, `'wrong'`, `'not_answered'`
- `score` (integer): 5, 0, or 0
- `comments` (text): Optional reviewer comments

---

## Phase 2: Interview Kit Tab Component Structure

### Files to Create

**1. `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx`**
- Main container component
- Handles loading/empty/error states
- Triggers question generation if no evaluation exists
- Contains score summary header and sections

**2. `src/components/reviewer/interview-kit/InterviewKitScoreHeader.tsx`**
- Progress indicator: X/Y questions rated
- Total Score: X/MaxPossible
- Sections count
- Rating distribution (Right %, Wrong %, Not Answered %)
- Auto-derived Panel Recommendation badge

**3. `src/components/reviewer/interview-kit/InterviewKitScoringLogic.tsx`**
- Displays scoring rules card
- Rating values legend
- Recommendation thresholds

**4. `src/components/reviewer/interview-kit/InterviewKitSection.tsx`**
- Collapsible section component
- Props: sectionName, sectionLabel, questions, onRate, onEdit, onDelete, onAdd
- Shows section score and rated count

**5. `src/components/reviewer/interview-kit/InterviewQuestionCard.tsx`**
- Individual question display
- Question text with number (Q1, Q2...)
- Metadata: Proficiency > Sub-domain > Speciality path (for domain questions)
- "Strong answer should include..." expandable guidance
- Rating controls: Right (5) | Wrong (0) | Not Answered (0) radio buttons
- Comments textarea (optional, no validation)
- Edit and Delete action buttons

**6. `src/components/reviewer/interview-kit/AddQuestionDialog.tsx`**
- Dialog to add custom question to any section
- Fields: Question text, Expected answer, Section selection
- Creates with `question_source = 'reviewer_custom'`

**7. `src/components/reviewer/interview-kit/EditQuestionDialog.tsx`**
- Edit existing question (question_text, expected_answer)
- Works for all question sources

**8. `src/components/reviewer/interview-kit/DeleteQuestionConfirm.tsx`**
- Confirm deletion dialog
- Soft-deletes via `is_deleted = true`

**9. `src/components/reviewer/interview-kit/InterviewKitSubmitFooter.tsx`**
- Submit button with validation
- Validation: All questions must be rated before submission
- Shows inline errors for unrated questions
- Export Scorecard PDF button (disabled until all rated)

### Barrel Export
**Update `src/components/reviewer/candidates/index.ts`**
- Export new `InterviewKitTabContent`

---

## Phase 3: Integration & Tab Enablement

### Files to Modify

**1. `src/pages/reviewer/CandidateDetailPage.tsx`**
- Enable Interview Kit tab (remove `disabled` prop)
- Import and render `InterviewKitTabContent` with enrollmentId
- Pass bookingId for evaluation linking

**2. `src/components/reviewer/candidates/index.ts`**
- Add export for InterviewKitTabContent

---

## Phase 4: Proof Point Question Generation Logic

### Implementation Details

The Proof Point questions are generated dynamically based on the proof point's description. Since we don't have AI integration, we'll use template-based question generation:

```typescript
function generateProofPointFollowUps(proofPoint: ProofPointForReview): GeneratedQuestion[] {
  const templates = [
    `You claimed "${truncate(proofPoint.description, 50)}". What specific metrics or outcomes resulted?`,
    `What was the biggest challenge in "${proofPoint.title}" and how did you overcome it?`,
    `How would you apply the learnings from "${proofPoint.title}" to a new engagement?`,
  ];
  
  // Select 1-2 randomly
  return shuffle(templates).slice(0, randomBetween(1, 2)).map((text, idx) => ({
    question_text: text,
    expected_answer: 'Specific metrics, measurable outcomes, client impact, sustained results',
    question_source: 'proof_point',
    section_name: proofPoint.title,
    section_type: 'proof_point',
    proof_point_id: proofPoint.id,
  }));
}
```

---

## Phase 5: Score Calculation & Submission

### Score Calculation Logic

```typescript
interface InterviewScoreResult {
  totalQuestions: number;
  ratedCount: number;
  rightCount: number;
  wrongCount: number;
  notAnsweredCount: number;
  totalScore: number;
  maxPossibleScore: number;
  scorePercentage: number;
  recommendation: 'strong_recommend' | 'recommend_with_conditions' | 'borderline' | 'not_recommended';
}

function calculateInterviewScore(responses: InterviewQuestionResponse[]): InterviewScoreResult {
  const rightCount = responses.filter(r => r.rating === 'right').length;
  const wrongCount = responses.filter(r => r.rating === 'wrong').length;
  const notAnsweredCount = responses.filter(r => r.rating === 'not_answered').length;
  
  const totalScore = rightCount * 5; // Only 'right' gives points
  const maxPossibleScore = responses.length * 5;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  
  let recommendation: string;
  if (scorePercentage >= 80) recommendation = 'strong_recommend';
  else if (scorePercentage >= 65) recommendation = 'recommend_with_conditions';
  else if (scorePercentage >= 50) recommendation = 'borderline';
  else recommendation = 'not_recommended';
  
  return { /* ... */ };
}
```

### Submission Flow
1. Validate all questions rated
2. Calculate final score
3. Update `interview_evaluations` with overall_score, outcome, evaluated_at
4. Update `interview_bookings` with interview_score fields
5. Show success message
6. Enable PDF export

---

## Visual Structure (Per Screenshots)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Progress        Total Score      Sections       Recommendation          │
│   0/24            0/120            7           Not Recommended          │
├─────────────────────────────────────────────────────────────────────────┤
│ Rating Distribution (Overall Interview)                                 │
│ ✓ Right 0.0%  ○ Wrong 0.0%  ○ Not Answered 0.0%                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Scoring Logic                                                           │
│ Right = 5 points | Wrong = 0 points | Not Answered = 0 points          │
│ Panel Recommendation thresholds...                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ Interview Questions                                                     │
│ Auto-generated from Industry Segment → Expertise Level → Proficiencies  │
│                                                                         │
│ ▶ Domain & Delivery Depth (5 questions)              0/25  0/5 rated   │
│ ▶ Proof Points Deep-Dive (6 questions)               0/30  0/6 rated   │
│ ▶ Solution Design & Architecture Thinking (3 q)     0/15  0/3 rated   │
│ ▶ Execution & Governance (3 questions)               0/15  0/3 rated   │
│ ▶ Data/Tech Readiness & Tooling Awareness (2 q)     0/10  0/2 rated   │
│ ▶ Soft Skills for Solution Provider Success (4 q)   0/20  0/4 rated   │
│ ▶ Innovation & Co-creation Ability (3 questions)    0/15  0/3 rated   │
│                                                                         │
│ [Complete all ratings to export the final scorecard] [Export PDF]       │
└─────────────────────────────────────────────────────────────────────────┘
```

Expanded Section View:
```text
▼ Domain & Delivery Depth (5 questions)                    0/25  0/5 rated
┌─────────────────────────────────────────────────────────────────────────┐
│ Q1. How do you define Cost-to-Serve for a district...  [Edit] [Delete] │
│ Proficiency: Shaping Strategic Direction & Enterprise Intent           │
│ Sub-domain: SCM Strategy & Value Framework                              │
│ Speciality: Cost-to-Serve Optimization Strategy                        │
│ ▸ Strong answer should include...                                       │
│                                                                         │
│ Rating *                                                                │
│ [ Right (5) ]  [ Wrong (0) ]  [ Not Answered (0) ]                     │
│                                                                         │
│ Comments                                                                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Add your assessment comments here...                               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
│                     [+ Add New Question]                                │
```

---

## Technical Summary by Phase

| Phase | Files Created | Files Modified | Estimated Size |
|-------|--------------|----------------|----------------|
| **Phase 1** | 3 files (hooks, service, constants) | None | ~400 LOC |
| **Phase 2** | 9 component files | 1 index.ts | ~800 LOC |
| **Phase 3** | None | 2 files | ~50 LOC |
| **Phase 4** | Included in Phase 1 service | None | ~100 LOC |
| **Phase 5** | Included in Phase 1 hooks | None | ~150 LOC |

---

## Testing Checklist

### Phase 1 Validation
- [ ] Domain questions fetch correctly (max 10, random, interview/both mode)
- [ ] Competency questions fetch correctly (1-2 per competency)
- [ ] Proof point questions generate from descriptions
- [ ] Evaluation record creates/updates correctly

### Phase 2 Validation
- [ ] Score header shows correct totals
- [ ] Sections expand/collapse correctly
- [ ] Rating controls work (Right/Wrong/Not Answered)
- [ ] Comments are optional (no validation)
- [ ] Edit question works for all sources
- [ ] Delete soft-deletes correctly
- [ ] Add custom question works

### Phase 3 Validation
- [ ] Tab enabled and clickable
- [ ] Questions generate on first visit
- [ ] Existing evaluation loads correctly

### Phase 4 Validation
- [ ] Each proof point gets 1-2 follow-up questions
- [ ] Questions reference proof point title
- [ ] Expected answers provide guidance

### Phase 5 Validation
- [ ] Submit blocked until all questions rated
- [ ] Score calculates correctly (5 per right, 0 others)
- [ ] Recommendation derives from percentage
- [ ] PDF export enabled after submission
