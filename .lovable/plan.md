
# Final Result Tab Implementation Plan

## Overview

Implement a comprehensive **Final Result** tab in the Candidate Detail page that provides reviewers with a consolidated view of a Solution Provider's evaluation progress and final certification outcome.

---

## Data Architecture

Based on the existing database schema, the tab will aggregate data from:

| Source Table | Data Retrieved |
|--------------|----------------|
| `provider_industry_enrollments` | lifecycle_status, lifecycle_rank, participation_mode, organization, proof_points_review_status, proof_points_final_score |
| `participation_modes` | requires_org_info (to determine org stage applicability) |
| `proof_points` | Count of proof points submitted |
| `assessment_attempts` | Latest attempt score, is_passed, score_percentage |
| `interview_bookings` | status, interview_score_out_of_10, interview_submitted_at |
| `lifecycle_stages` | Reference for stage definitions (for display names) |

**Note**: No `interview_config` table exists - score weightages will be defined as constants in code (aligned with the spec: Proof Points 30%, Assessment 50%, Interview 20%).

---

## Components to Create

### 1. New Hook: `useFinalResultData.ts`

**Location**: `src/hooks/queries/useFinalResultData.ts`

**Purpose**: Single aggregated query to fetch all data needed for Final Result tab

**Data Returned**:
```typescript
interface FinalResultData {
  // Provider context
  providerName: string;
  enrollmentId: string;
  
  // Lifecycle Stage Statuses
  stages: {
    providerDetails: StageStatus;
    organizationInfo: StageStatus;
    expertiseLevel: StageStatus;
    proofPoints: StageStatus;
    knowledgeAssessment: StageStatus;
    interviewSlot: StageStatus;
    certificationStatus: StageStatus;
  };
  
  // Score Summary
  scores: {
    proofPointsScore: number | null;    // 0-10 scale
    proofPointsMax: number;             // 10
    assessmentScore: number | null;     // actual score
    assessmentMax: number | null;       // total questions
    assessmentPercentage: number | null;
    interviewScore: number | null;      // 0-10 scale
    interviewMax: number;               // 10
  };
  
  // Composite Score (client-calculated)
  compositeScore: number | null;        // 0-100%
  isCompositeComplete: boolean;
  
  // Certification Outcome (derived)
  certificationOutcome: CertificationOutcome | null;
  
  // Flags
  requiresOrgInfo: boolean;
  isInterviewSubmitted: boolean;
}

type StageStatus = 'completed' | 'in_progress' | 'not_started';
type CertificationOutcome = 'not_certified' | 'one_star' | 'two_star' | 'three_star';
```

### 2. New Component: `FinalResultTabContent.tsx`

**Location**: `src/components/reviewer/candidates/FinalResultTabContent.tsx`

**Structure**:
- Header: "Final Result" with subtitle about composite evaluation
- Score Summary Row (4 tiles)
- Composite Score Banner (prominent display)
- Review Checklist (lifecycle stages grid)

### 3. New Component: `ScoreSummaryTile.tsx`

**Location**: `src/components/reviewer/candidates/ScoreSummaryTile.tsx`

**Props**:
```typescript
interface ScoreSummaryTileProps {
  title: string;
  score: number | null;
  maxScore: number;
  percentage?: number | null;
  isPending: boolean;
}
```

### 4. New Component: `CompositeScoreBanner.tsx`

**Location**: `src/components/reviewer/candidates/CompositeScoreBanner.tsx`

**Features**:
- Large percentage display (e.g., "65.2%")
- Certification outcome badge with stars
- Color-coded background based on outcome

### 5. New Component: `LifecycleStageCard.tsx`

**Location**: `src/components/reviewer/candidates/LifecycleStageCard.tsx`

**Props**:
```typescript
interface LifecycleStageCardProps {
  icon: React.ReactNode;
  title: string;
  status: 'completed' | 'in_progress' | 'not_started';
  description: string;
  notApplicable?: boolean;
}
```

**Visual States**:
| Status | Background | Icon | Text Style |
|--------|------------|------|------------|
| Completed | Light Green (`bg-green-50`) | CheckCircle (green) | Normal contrast |
| In Progress | Light Orange (`bg-amber-50`) | Clock (amber) | Normal contrast |
| Not Started | Gray (`bg-muted`) | Circle (gray) | Muted text |

---

## Stage Status Logic

Based on the spec requirements and existing database fields:

### 1. Provider Details
- **Always**: `completed` (informational only, no reviewer action needed)

### 2. Organization Information
- If `!requiresOrgInfo`: `completed` with "(Not Applicable)" label
- Else: `completed` (populated during onboarding)

### 3. Expertise Level
- If `lifecycle_rank >= 50` (expertise_selected): `completed`
- Else: `in_progress`

### 4. Proof Points
- If `proof_points_review_status === 'completed'`: `completed`
- If `proof_points_review_status === 'in_progress'` OR proof points count > 0: `in_progress`
- Else: `not_started`

### 5. Knowledge Assessment
- If latest attempt has `submitted_at` and `is_passed !== null`: `completed`
- If latest attempt exists but `submitted_at` is null: `in_progress`
- Else: `not_started`

### 6. Interview Slot
- If `interview_bookings.status` = 'confirmed' OR `interview_submitted_at` exists: `completed`
- If `status` = 'scheduled': `in_progress` with "Scheduled" label
- If `status` = 'cancelled': `not_started` with "Cancelled" label
- Else: `not_started`

### 7. Certification Status
- If `lifecycle_status` in ['verified', 'certified']: `completed`
- If `lifecycle_status` = 'not_verified': `completed` (with "Not Verified" outcome)
- If `lifecycle_rank >= 130` (panel_completed): `in_progress`
- Else: `not_started`

---

## Composite Score Calculation

Calculated **client-side** (read-only display):

```typescript
// Constants (as per spec)
const SCORE_WEIGHTS = {
  proofPoints: 0.30,    // 30%
  assessment: 0.50,     // 50%
  interview: 0.20,      // 20%
} as const;

// Normalization
const proofPointsPercent = (proofPointsScore / 10) * 100;    // 0-10 → 0-100
const assessmentPercent = assessmentPercentage;               // Already 0-100
const interviewPercent = (interviewScore / 10) * 100;         // 0-10 → 0-100

// Composite Formula
const compositeScore = 
  (proofPointsPercent * SCORE_WEIGHTS.proofPoints) +
  (assessmentPercent * SCORE_WEIGHTS.assessment) +
  (interviewPercent * SCORE_WEIGHTS.interview);

// Rounded to 1 decimal
const displayScore = Math.round(compositeScore * 10) / 10;
```

**Incomplete Handling**: If any score is `null`, show "—" with "Incomplete" label.

---

## Certification Outcome Rules

```typescript
function getCertificationOutcome(compositeScore: number): CertificationOutcome {
  if (compositeScore < 51.0) return 'not_certified';
  if (compositeScore < 66.0) return 'one_star';
  if (compositeScore < 86.0) return 'two_star';
  return 'three_star';
}

// Display mapping
const OUTCOME_DISPLAY = {
  not_certified: { label: 'Not Certified', stars: 0, color: 'red' },
  one_star: { label: 'Certified', stars: 1, color: 'amber' },
  two_star: { label: 'Certified', stars: 2, color: 'blue' },
  three_star: { label: 'Certified', stars: 3, color: 'green' },
};
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/queries/useFinalResultData.ts` | Data fetching hook |
| `src/components/reviewer/candidates/FinalResultTabContent.tsx` | Main tab content |
| `src/components/reviewer/candidates/ScoreSummaryTile.tsx` | Individual score tile |
| `src/components/reviewer/candidates/CompositeScoreBanner.tsx` | Composite score display |
| `src/components/reviewer/candidates/LifecycleStageCard.tsx` | Individual stage card |
| `src/constants/certification.constants.ts` | Score weights and outcome thresholds |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/reviewer/CandidateDetailPage.tsx` | Enable Final Result tab, import component |
| `src/components/reviewer/candidates/index.ts` | Export new components |

---

## UI Layout (Matching Reference Image)

```text
┌─────────────────────────────────────────────────────────────────┐
│ Final Result                                                     │
│ Composite assessment with certification determination             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      ┌──────────────┐ │
│  │ Proof    │  │Assessment│  │ Interview│      │   65.2%      │ │
│  │ Points   │  │  Score   │  │  Score   │      │ Composite    │ │
│  │ 7.25/10  │  │  30/50   │  │ 6.2/10   │      │   Score      │ │
│  │  72.5%   │  │   60%    │  │   62%    │      │              │ │
│  └──────────┘  └──────────┘  └──────────┘      │ ⭐⭐ Certified│ │
│                                                 └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Review Checklist                                                 │
│ Track progress across all provider evaluation stages             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ ✓ Provider      │  │ ✓ Organization  │  │ ✓ Expertise     │  │
│  │   Details       │  │   Info          │  │   Level         │  │
│  │   Completed     │  │   Completed     │  │   Completed     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ ✓ Proof Points  │  │ ✓ Knowledge     │  │ ⏳ Interview    │  │
│  │   4 of 5 rated  │  │   Assessment    │  │   Slot          │  │
│  │   In Progress   │  │   30/50 points  │  │   Scheduled     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
│  ┌─────────────────┐                                             │
│  │ ✓ Certification │                                             │
│  │   Status        │                                             │
│  │   ⭐⭐ Two Star │                                             │
│  └─────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Specifications

### Performance
- Single aggregated query via `useFinalResultData`
- Reuses existing cached data where possible
- Target load time: < 2 seconds

### Security
- Read-only display (no mutations)
- Uses existing RLS policies (reviewer must be assigned to the booking)

### Accessibility
- WCAG AA color contrast compliance
- Icons + text labels (no color-only indicators)
- Keyboard navigation supported via Card focus

### Error Handling
- Provider data load failure: Shows error Alert with "Back to Dashboard" option
- Composite incomplete: Info toast on tab load (non-blocking)

---

## Implementation Order

1. Create `src/constants/certification.constants.ts`
2. Create `src/hooks/queries/useFinalResultData.ts`
3. Create `src/components/reviewer/candidates/LifecycleStageCard.tsx`
4. Create `src/components/reviewer/candidates/ScoreSummaryTile.tsx`
5. Create `src/components/reviewer/candidates/CompositeScoreBanner.tsx`
6. Create `src/components/reviewer/candidates/FinalResultTabContent.tsx`
7. Update `src/components/reviewer/candidates/index.ts`
8. Update `src/pages/reviewer/CandidateDetailPage.tsx` (enable tab, integrate)
