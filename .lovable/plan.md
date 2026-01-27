
# Implementation Plan: Interview Kit Summary Dashboard

## Overview

Based on the screenshot, I need to implement a comprehensive **Interview Kit Summary Dashboard** that displays real-time statistics, rating distribution, scoring logic reference, and recommendation status above the existing interview questions.

---

## UI Components to Create

### 1. New Component: `InterviewKitSummaryDashboard.tsx`

This will be the main new component containing all the dashboard elements shown in the screenshot.

**Location**: `src/components/reviewer/interview-kit/InterviewKitSummaryDashboard.tsx`

**Props**:
```typescript
interface InterviewKitSummaryDashboardProps {
  totalQuestions: number;       // Total question count
  ratedQuestions: number;       // Questions that have been rated
  totalScore: number;           // Earned score
  maxScore: number;             // Maximum possible score
  sectionsCount: number;        // Number of sections
  rightCount: number;           // Questions rated "Right"
  wrongCount: number;           // Questions rated "Wrong"
  notAnsweredCount: number;     // Questions rated "Not Answered"
}
```

---

## Dashboard Layout (Matching Screenshot)

### Section A: Stats Cards Row
A horizontal row of 4 stat cards with light blue background:

| Card | Label | Value | Style |
|------|-------|-------|-------|
| Progress | "Progress" | `{rated}/{total}` | Blue text |
| Total Score | "Total Score" | `{earned}/{max}` with percentage below | Blue text |
| Sections | "Sections" | `{count}` | Blue text |
| Recommendation | "Recommendation" | Auto-derived text | Red/Yellow/Green based on threshold |

### Section B: Rating Distribution (Overall Interview)
Three horizontal segments showing distribution:

| Rating | Calculation | Display |
|--------|-------------|---------|
| Right | `(rightCount / totalQuestions) * 100` | `X.X%` with `(X / Y)` count |
| Wrong | `(wrongCount / totalQuestions) * 100` | `X.X%` with `(X / Y)` count |
| Not Answered | `(notAnsweredCount / totalQuestions) * 100` | `X.X%` with `(X / Y)` count |

### Section C: Scoring Logic (Reference Card)
Informational card showing the scoring rules:

**Rating Values**:
- Right = 5 points (green badge)
- Wrong = 0 points (red badge)
- Not Answered = 0 points (amber badge)

**Panel Recommendation (Auto-derived)**:
- ✅ ≥ 80% = Strong Recommend
- ✅ 60-79% = Recommend with Conditions
- ⚠️ 50-64% = Borderline / Re-interview
- ❌ < 50% = Not Recommended

**Note**: "Comments are mandatory when rating a question as 'Wrong' or 'Not Answered'"

---

## Recommendation Logic

```typescript
function getRecommendation(scorePercentage: number): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
} {
  if (scorePercentage >= 80) {
    return { label: 'Strong Recommend', variant: 'success' };
  } else if (scorePercentage >= 60) {
    return { label: 'Recommend with Conditions', variant: 'info' };
  } else if (scorePercentage >= 50) {
    return { label: 'Borderline / Re-interview', variant: 'warning' };
  } else {
    return { label: 'Not Recommended', variant: 'danger' };
  }
}
```

---

## Files to Modify

### 1. Create: `src/components/reviewer/interview-kit/InterviewKitSummaryDashboard.tsx`

New component with all dashboard elements.

### 2. Modify: `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx`

**Changes**:
- Add computed values for rating distribution (rightCount, wrongCount, notAnsweredCount)
- Add sections count calculation (domain + proof points + competencies)
- Import and render `InterviewKitSummaryDashboard` before the question sections
- Pass all required props

### 3. Modify: `src/components/reviewer/interview-kit/InterviewKitHeader.tsx`

**Changes**:
- Simplify to just show the "Interview Questions" subtitle
- Move the auto-generation description to be more compact
- The main header stats are now in the Summary Dashboard

### 4. Modify: `src/components/reviewer/interview-kit/index.ts`

Export the new component.

---

## Computed Values to Add

In `InterviewKitTabContent.tsx`, add these computed values:

```typescript
// Rating distribution counts
const ratingDistribution = useMemo(() => {
  const activeQuestions = evaluationData?.questions.filter(q => !q.isDeleted) || [];
  const rightCount = activeQuestions.filter(q => q.rating === 'right').length;
  const wrongCount = activeQuestions.filter(q => q.rating === 'wrong').length;
  const notAnsweredCount = activeQuestions.filter(q => q.rating === 'not_answered').length;
  const unratedCount = activeQuestions.filter(q => q.rating === null).length;
  
  return { rightCount, wrongCount, notAnsweredCount, unratedCount };
}, [evaluationData?.questions]);

// Sections count (domain + proof points + each competency)
const sectionsCount = useMemo(() => {
  let count = 0;
  if (domainQuestions.length > 0) count += 1;  // Domain section
  if (allProofPointQuestions.length > 0) count += 1;  // Proof Points section
  count += (competencies?.length || 0);  // Competency sections
  return count;
}, [domainQuestions.length, allProofPointQuestions.length, competencies?.length]);
```

---

## UI Styling Notes

From the screenshot:

1. **Stats Cards**: Light blue background (`bg-blue-50`), rounded corners, border
2. **Progress/Score values**: Blue text (`text-blue-600`)
3. **Recommendation "Not Recommended"**: Red background (`bg-red-100`), red text (`text-red-600`), border
4. **Rating Distribution**: Clean horizontal layout with radio-like indicators
5. **Scoring Logic**: Light gray/white card background with clear hierarchy

---

## Complete Component Structure

```text
InterviewKitTabContent
├── InterviewKitSummaryDashboard (NEW)
│   ├── Stats Cards Row
│   │   ├── Progress Card
│   │   ├── Total Score Card
│   │   ├── Sections Card
│   │   └── Recommendation Card
│   ├── Rating Distribution Section
│   │   ├── Right indicator
│   │   ├── Wrong indicator
│   │   └── Not Answered indicator
│   └── Scoring Logic Section
│       ├── Rating Values
│       ├── Panel Recommendation Thresholds
│       └── Note about mandatory comments
├── InterviewKitHeader (simplified)
├── Question Sections (existing)
│   ├── Domain & Delivery Depth
│   ├── Proof Points Deep-Dive
│   └── Competency Sections (5)
└── InterviewKitFooter (existing)
```

---

## Technical Notes

1. **No database changes needed** - All values are computed from existing `interview_question_responses` data
2. **Real-time updates** - Stats update automatically when ratings change via React Query invalidation
3. **Section count logic** - Counts only sections that have at least 1 question
4. **Percentage calculations** - Handle division by zero when no questions exist
5. **Recommendation is computed** - Not stored in database, calculated on render

---

## Summary of Changes

| Action | File | Description |
|--------|------|-------------|
| CREATE | `InterviewKitSummaryDashboard.tsx` | New dashboard component with stats, distribution, and scoring logic |
| MODIFY | `InterviewKitTabContent.tsx` | Add computed values and render dashboard |
| MODIFY | `InterviewKitHeader.tsx` | Simplify to subtitle only |
| MODIFY | `index.ts` | Export new component |
