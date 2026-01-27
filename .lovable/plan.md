
# Interview Kit Tab - Competencies & Proof Points Display

## Overview

This plan implements the Interview Kit tab for reviewers, displaying a collapsible section layout showing **Domain & Delivery Depth**, **Proof Points Deep-Dive**, and **5 Universal Competencies** as shown in the reference screenshot.

---

## UI Structure (Based on Screenshot)

| Section | Display Order | Source | Description |
|---------|---------------|--------|-------------|
| Domain & Delivery Depth | 1 | Static header | Placeholder for future domain questions |
| Proof Points Deep-Dive | 2 | `proof_points` table | Shows count based on provider's submitted proof points |
| Solution Design & Architecture Thinking | 3 | `interview_kit_competencies` | Universal competency |
| Execution & Governance | 4 | `interview_kit_competencies` | Universal competency |
| Data/Tech Readiness & Tooling Awareness | 5 | `interview_kit_competencies` | Universal competency |
| Soft Skills for Solution Provider Success | 6 | `interview_kit_competencies` | Universal competency |
| Innovation & Co-creation Ability | 7 | `interview_kit_competencies` | Universal competency |

---

## Technical Architecture

### Data Flow

```text
CandidateDetailPage
    └── InterviewKitTabContent (enrollmentId)
            ├── useInterviewKitCompetencies() → 5 competencies
            ├── useCandidateProofPoints() → proof points for this enrollment
            └── Render collapsible sections
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/reviewer/interview-kit/index.ts` | Barrel export |
| `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx` | Main tab component |
| `src/components/reviewer/interview-kit/InterviewKitSection.tsx` | Collapsible section component |
| `src/components/reviewer/interview-kit/InterviewKitHeader.tsx` | Header with breadcrumb |
| `src/components/reviewer/interview-kit/InterviewKitFooter.tsx` | Footer with export button |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/reviewer/CandidateDetailPage.tsx` | Import and use new `InterviewKitTabContent` |
| `src/components/reviewer/candidates/index.ts` | Add export for Interview Kit components |

---

## Component Specifications

### 1. InterviewKitTabContent.tsx

**Props:**
```typescript
interface InterviewKitTabContentProps {
  enrollmentId: string;
}
```

**Behavior:**
- Fetches competencies using `useInterviewKitCompetencies()`
- Fetches proof points count using `useCandidateProofPoints()`
- Displays loading spinner while fetching
- Renders header, 7 collapsible sections, and footer

**Data Sources:**
- **Domain & Delivery Depth**: Static section (0 questions placeholder - future question_bank integration)
- **Proof Points Deep-Dive**: Count from `useCandidateProofPoints()` 
- **Competencies (5)**: From `useInterviewKitCompetencies()` - static display, no questions yet

### 2. InterviewKitSection.tsx

**Props:**
```typescript
interface InterviewKitSectionProps {
  name: string;
  questionCount: number;
  score: number;
  maxScore: number;
  ratedCount: number;
  totalCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}
```

**UI Elements:**
- Chevron icon (rotates on expand/collapse)
- Section name
- Question count badge (e.g., "5 questions")
- Score display (e.g., "0/25") - right aligned
- Percentage (e.g., "0%") - right aligned
- Rated count (e.g., "0/5 rated") - right aligned
- Collapsible content area for questions

### 3. InterviewKitHeader.tsx

**UI Elements:**
- Title: "Interview Questions"
- Breadcrumb: "Auto-generated from Industry Segment → Expertise Level → Proficiency Areas → Sub-domains → Specialities"
- Styled as muted text below title

### 4. InterviewKitFooter.tsx

**UI Elements:**
- Left: Instruction text "Complete all ratings to export the final scorecard"
- Right: "Export Scorecard PDF" button (disabled state until all rated)
- Fixed at bottom of section

---

## Section Display Configuration

```typescript
const INTERVIEW_KIT_SECTIONS = [
  {
    id: 'domain',
    name: 'Domain & Delivery Depth',
    type: 'domain',
    displayOrder: 1,
  },
  {
    id: 'proof_points',
    name: 'Proof Points Deep-Dive',
    type: 'proof_point',
    displayOrder: 2,
  },
  // Competencies will be merged from database query
];
```

---

## Implementation Steps

### Step 1: Create InterviewKitSection component
- Collapsible section with chevron, name, counts, and score
- Uses Radix Collapsible primitive
- Supports expanded/collapsed state

### Step 2: Create InterviewKitHeader component
- Static header with title and breadcrumb

### Step 3: Create InterviewKitFooter component  
- Export button and instruction text

### Step 4: Create InterviewKitTabContent component
- Fetches data from hooks
- Computes section configurations
- Renders header, sections, footer
- Manages expand/collapse state for each section

### Step 5: Create barrel export
- Export all components from index.ts

### Step 6: Update CandidateDetailPage
- Import `InterviewKitTabContent`
- Replace placeholder with actual component

---

## Scoring Display (Read-Only for Now)

Since this is Phase 1 (display only), all sections will show:
- Score: `0/{maxScore}` (e.g., `0/25` for 5 questions × 5 points)
- Percentage: `0%`
- Rated: `0/{questionCount} rated`

The scoring logic will be implemented in a future phase when questions are generated and reviewers can rate them.

---

## Question Counts (Static for Now)

| Section | Questions | Max Score |
|---------|-----------|-----------|
| Domain & Delivery Depth | 5 | 25 |
| Proof Points Deep-Dive | {dynamic from proof_points} | {count × 5} |
| Each Competency | 3 | 15 |

---

## Expected Result

When a reviewer clicks the "Interview Kit" tab, they will see:

1. **Header**: "Interview Questions" with breadcrumb
2. **7 Collapsible Sections**:
   - Each showing name, question count, score (0/X), percentage (0%), rated count (0/X rated)
   - Chevron to expand (empty content for now)
3. **Footer**: "Complete all ratings..." text and Export PDF button (disabled)

This provides the UI framework for future phases where actual questions will be generated and rating functionality will be added.
