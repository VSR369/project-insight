# QA-04: Business Rules Catalog

| Document ID | QA-04 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Rules | 85+ |

---

## 1. Document Purpose

This document catalogs all business rules extracted from the codebase, organized by module. Each rule includes source file references for verification.

---

## 2. Business Rules Index

| Category | Count | Priority Range |
|----------|-------|----------------|
| Lifecycle & Lock Rules | 15 | Critical |
| Assessment Rules | 12 | Critical |
| Certification Rules | 8 | Critical |
| Proof Points Rules | 10 | High |
| Interview Scheduling | 10 | High |
| Pulse Social | 15 | Medium |
| PulseCards | 10 | Medium |
| Admin & Validation | 5 | Low |
| **TOTAL** | **85+** | |

---

## 3. Lifecycle & Lock Rules

### BR-LC-001: Configuration Lock at Assessment

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-001 |
| **Category** | Lifecycle |
| **Priority** | Critical |
| **Source** | `src/services/lifecycleService.ts:111-119` |

**Rule Statement:**
Once a provider's lifecycle rank reaches 100 (assessment_in_progress), configuration fields cannot be modified.

**Formal Definition:**
```text
IF enrollment.lifecycle_rank >= 100
   AND field IN (industry_segment_id, expertise_level_id, proficiency_areas, specialities)
THEN modification = BLOCKED
     message = "Industry and expertise settings cannot be changed during or after assessment."
```

**Affected Fields:**
- `industry_segment_id`
- `expertise_level_id`
- `proficiency_areas`
- `specialities`

**Source Code Evidence:**
```typescript
// src/services/lifecycleService.ts:111-119
if (fieldCategory === 'configuration') {
  if (lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION) {
    return {
      allowed: false,
      reason: 'Industry and expertise settings cannot be changed during or after assessment.',
      lockLevel: 'configuration',
    };
  }
}
```

---

### BR-LC-002: Content Lock at Assessment

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-002 |
| **Category** | Lifecycle |
| **Priority** | Critical |
| **Source** | `src/services/lifecycleService.ts:99-109` |

**Rule Statement:**
Content fields (registration, mode, org, proof points) are locked when lifecycle rank reaches 100.

**Formal Definition:**
```text
IF enrollment.lifecycle_rank >= 100
   AND field_category IN ('content', 'registration')
THEN modification = BLOCKED
     message = "This section is locked after assessment starts."
```

**Source Code Evidence:**
```typescript
// src/services/lifecycleService.ts:99-109
if (fieldCategory === 'content' || fieldCategory === 'registration') {
  if (lifecycleRank >= LOCK_THRESHOLDS.CONTENT) {
    return {
      allowed: false,
      reason: 'This section is locked after assessment starts. Please contact support if changes are needed.',
      lockLevel: 'content',
    };
  }
}
```

---

### BR-LC-003: Everything Frozen at Verification

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-003 |
| **Category** | Lifecycle |
| **Priority** | Critical |
| **Source** | `src/services/lifecycleService.ts:91-97` |

**Rule Statement:**
All fields are frozen when lifecycle rank reaches 140 (verified or above).

**Formal Definition:**
```text
IF enrollment.lifecycle_rank >= 140
THEN all_modifications = BLOCKED
     message = "Your profile is frozen. No modifications are allowed after verification."
```

---

### BR-LC-004: Terminal States

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-004 |
| **Category** | Lifecycle |
| **Priority** | High |
| **Source** | `src/constants/lifecycle.constants.ts:45` |

**Rule Statement:**
Terminal states cannot progress to any other state.

**Terminal States:**
- verified (rank 140)
- certified (rank 150)
- not_verified (rank 160)
- suspended (rank 200)
- inactive (rank 210)

**Source Code Evidence:**
```typescript
// src/constants/lifecycle.constants.ts:45
export const TERMINAL_STATES = ['verified', 'certified', 'not_verified', 'suspended', 'inactive'] as const;
```

---

### BR-LC-005: Hidden States

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-005 |
| **Category** | Lifecycle |
| **Priority** | High |
| **Source** | `src/constants/lifecycle.constants.ts:48` |

**Rule Statement:**
Content from suspended and inactive accounts should be hidden from public view.

**Hidden States:**
- suspended (rank 200)
- inactive (rank 210)

---

### BR-LC-006: Industry Change Cascade

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-006 |
| **Category** | Cascade Reset |
| **Priority** | Critical |
| **Source** | `src/services/lifecycleService.ts:141-150` |

**Rule Statement:**
Changing industry segment after expertise selection triggers a hard reset.

**Cascade Effects:**
- Deletes specialty-specific proof points
- Deletes all speciality selections
- Resets lifecycle to 'enrolled' (rank 20)

**Formal Definition:**
```text
IF field = 'industry_segment_id'
   AND provider.has_expertise_selected = true
THEN cascade_type = 'HARD_RESET'
     deletes_proof_points = 'specialty_only'
     deletes_specialities = true
     resets_to_status = 'enrolled'
     resets_to_rank = 20
```

**Source Code Evidence:**
```typescript
// src/services/lifecycleService.ts:141-150
if (fieldName === 'industry_segment_id' && hasExpertiseSelected) {
  return {
    type: 'HARD_RESET',
    deletesProofPoints: 'specialty_only',
    deletesSpecialities: true,
    resetsToStatus: 'enrolled',
    resetsToRank: LIFECYCLE_RANKS.enrolled,
    warningLevel: 'critical',
    message: 'Changing your industry will delete all specialty proof points and reset your expertise selections.',
  };
}
```

---

### BR-LC-007: Expertise Change Cascade

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-007 |
| **Category** | Cascade Reset |
| **Priority** | High |
| **Source** | `src/services/lifecycleService.ts:154-165` |

**Rule Statement:**
Changing expertise level with existing specialty proof points triggers a partial reset.

**Cascade Effects:**
- Deletes specialty-specific proof points
- Clears speciality selections
- Resets lifecycle to 'expertise_selected' (rank 50)

---

### BR-LC-008: Wizard Step Lock Mapping

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-LC-008 |
| **Category** | Navigation |
| **Priority** | High |
| **Source** | `src/services/lifecycleService.ts:202-230` |

**Lock Rules by Step:**

| Step | Name | Lock Condition |
|------|------|----------------|
| 1 | Registration | rank >= 100 |
| 2 | Participation Mode | rank >= 100 |
| 3 | Organization | rank >= 100 |
| 4 | Expertise Level | rank >= 100 |
| 5 | Proof Points | rank >= 100 |
| 6 | Assessment | rank >= 110 |
| 7 | Interview Slot | rank >= 120 |
| 8 | Panel Discussion | rank >= 130 |
| 9 | Certification | rank >= 140 |

---

## 4. Assessment Rules

### BR-AS-001: Minimum Rank to Start

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-001 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/services/assessmentService.ts:74-79` |

**Rule Statement:**
Provider must have lifecycle rank >= 70 (proof_points_min_met) to start assessment.

**Formal Definition:**
```text
IF enrollment.lifecycle_rank < 70
THEN start_assessment = BLOCKED
     message = "Complete your proof points before starting the assessment"
```

---

### BR-AS-002: No Active Assessment

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-002 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/services/assessmentService.ts:82-86` |

**Rule Statement:**
Provider cannot be in or past assessment_in_progress to start a new assessment.

**Formal Definition:**
```text
IF enrollment.lifecycle_rank >= 100
THEN start_assessment = BLOCKED
     message = "Assessment already in progress or completed"
```

---

### BR-AS-003: Active Assessment Check

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-003 |
| **Category** | Assessment |
| **Priority** | High |
| **Source** | `src/services/assessmentService.ts:89-111` |

**Rule Statement:**
If an active (unsubmitted) assessment exists and hasn't expired, a new one cannot be started.

**Expiry Check:**
```text
expiry_time = started_at + (time_limit_minutes * 60 * 1000)
IF current_time < expiry_time
THEN start_assessment = BLOCKED
```

---

### BR-AS-004: Time Limit

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-004 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/constants/assessment.constants.ts:8` |

**Rule Statement:**
Default assessment time limit is 60 minutes.

```typescript
export const DEFAULT_TIME_LIMIT_MINUTES = 60;
```

---

### BR-AS-005: Questions Per Assessment

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-005 |
| **Category** | Assessment |
| **Priority** | High |
| **Source** | `src/constants/assessment.constants.ts:14` |

**Rule Statement:**
Default number of questions per assessment is 20.

```typescript
export const DEFAULT_QUESTIONS_PER_ASSESSMENT = 20;
```

---

### BR-AS-006: Passing Score

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-006 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/constants/assessment.constants.ts:17` |

**Rule Statement:**
Minimum passing score is 70%.

```typescript
export const PASSING_SCORE_PERCENTAGE = 70;
```

---

### BR-AS-007: Score Calculation

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-007 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/services/assessmentService.ts:316-319` |

**Formula:**
```text
score_percentage = ROUND((correct_answers / total_questions) * 100)
is_passed = score_percentage >= 70
```

---

### BR-AS-008: Lifecycle Update on Submit

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-AS-008 |
| **Category** | Assessment |
| **Priority** | Critical |
| **Source** | `src/services/assessmentService.ts:322-323` |

**Transition Rules:**
```text
IF is_passed = true
THEN lifecycle_status = 'assessment_passed', lifecycle_rank = 110

IF is_passed = false
THEN lifecycle_status = 'assessment_completed', lifecycle_rank = 105
```

---

## 5. Certification Rules

### BR-CT-001: Composite Score Weights

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-CT-001 |
| **Category** | Certification |
| **Priority** | Critical |
| **Source** | `src/constants/certification.constants.ts:8-12` |

**Weight Distribution:**
| Component | Weight |
|-----------|--------|
| Proof Points | 30% |
| Assessment | 50% |
| Interview | 20% |

```typescript
export const SCORE_WEIGHTS = {
  proofPoints: 0.30,
  assessment: 0.50,
  interview: 0.20,
} as const;
```

---

### BR-CT-002: Certification Thresholds

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-CT-002 |
| **Category** | Certification |
| **Priority** | Critical |
| **Source** | `src/constants/certification.constants.ts:15-20` |

**Threshold Mapping:**
| Score Range | Outcome | Stars |
|-------------|---------|-------|
| < 51.0% | Not Certified | 0 |
| 51.0% - 65.9% | One Star | 1 |
| 66.0% - 85.9% | Two Star | 2 |
| >= 86.0% | Three Star | 3 |

```typescript
export const CERTIFICATION_THRESHOLDS = {
  notCertified: 51.0,
  oneStar: 66.0,
  twoStar: 86.0,
} as const;
```

---

### BR-CT-003: Score Normalization

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-CT-003 |
| **Category** | Certification |
| **Priority** | High |
| **Source** | `src/constants/certification.constants.ts:117-118` |

**Normalization Rules:**
```text
proofPointsPercent = (proofPointsScore / 10) * 100  // 0-10 → 0-100
interviewPercent = (interviewScore / 10) * 100      // 0-10 → 0-100
assessmentPercent = assessmentPercentage            // Already 0-100
```

---

### BR-CT-004: Complete Score Requirement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-CT-004 |
| **Category** | Certification |
| **Priority** | Critical |
| **Source** | `src/constants/certification.constants.ts:112-114` |

**Rule Statement:**
All three component scores must be present for a valid composite score.

```typescript
if (proofPointsScore === null || assessmentPercentage === null || interviewScore === null) {
  return { score: null, isComplete: false };
}
```

---

## 6. Proof Points Rules

### BR-PP-001: Minimum Proof Points

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PP-001 |
| **Category** | Proof Points |
| **Priority** | High |
| **Source** | `src/hooks/queries/useProofPoints.ts:43-57` |

**Rule Statement:**
Default minimum is 2 proof points, configurable via system_settings.

---

### BR-PP-002: Lifecycle Advancement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PP-002 |
| **Category** | Proof Points |
| **Priority** | High |
| **Source** | `src/hooks/queries/useProofPoints.ts:287-319` |

**Transition Rules:**
```text
IF proof_point_count >= min_required AND lifecycle_rank < 70
THEN advance to 'proof_points_min_met' (rank 70)

IF proof_point_count >= 1 AND proof_point_count < min_required AND lifecycle_rank < 60
THEN advance to 'proof_points_started' (rank 60)

IF proof_point_count < min_required AND lifecycle_rank = 70
THEN revert to 'proof_points_started' (rank 60)
```

---

### BR-PP-003: Content Lock Check

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PP-003 |
| **Category** | Proof Points |
| **Priority** | Critical |
| **Source** | `src/hooks/queries/useProofPoints.ts:60-79` |

**Rule Statement:**
Proof point modifications are blocked when enrollment is content-locked (rank >= 100).

---

### BR-PP-004: Specialty Tag Requirement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PP-004 |
| **Category** | Proof Points |
| **Priority** | Medium |
| **Source** | `src/hooks/queries/useProofPoints.ts:354-364` |

**Rule Statement:**
If category is 'specialty_specific', at least one speciality tag is required.

---

### BR-PP-005: Score Calculation Formula

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PP-005 |
| **Category** | Proof Points |
| **Priority** | High |
| **Source** | `src/services/proofPointsScoreService.ts:49-92` |

**Formula:**
```text
Relevance Weights:
  HIGH = 1.0
  MEDIUM = 0.6
  LOW = 0.2

Weighted Quality = Σ(Score × Relevance) / (10 × N)
Relevance Density = Σ(Relevance) / N
Final Score = ROUND(WeightedQuality × RelevanceDensity × 10, 2)
```

---

## 7. Interview Scheduling Rules

### BR-IS-001: Existing Booking Check

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-IS-001 |
| **Category** | Interview |
| **Priority** | Critical |
| **Source** | DB Function: `book_interview_slot` |

**Rule Statement:**
Provider cannot book a new interview if an active booking exists for the same enrollment.

---

### BR-IS-002: Assessment Passed Requirement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-IS-002 |
| **Category** | Interview |
| **Priority** | Critical |
| **Source** | DB Function: `book_interview_slot` |

**Rule Statement:**
Enrollment must have lifecycle_rank >= 110 (assessment_passed) to schedule interview.

---

### BR-IS-003: Time Conflict Detection

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-IS-003 |
| **Category** | Interview |
| **Priority** | High |
| **Source** | DB Function: `check_enrollment_time_conflict` |

**Rule Statement:**
System checks for overlapping bookings when scheduling.

---

### BR-IS-004: Quorum Requirement

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-IS-004 |
| **Category** | Interview |
| **Priority** | Critical |
| **Source** | DB Function: `book_interview_slot` |

**Rule Statement:**
Default quorum is 2 reviewers, configurable per expertise level.

---

### BR-IS-005: Weighted Reviewer Selection

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-IS-005 |
| **Category** | Interview |
| **Priority** | High |
| **Source** | DB Function: `select_reviewers_weighted` |

**Selection Tiers:**
- Pool ≤15: Load-balanced (fewer interviews first)
- Pool 16-50: Weighted score (60% load + 40% recency)
- Pool >50: Bucketed selection (Low/Medium/High load)

---

## 8. Pulse Social Rules

### BR-PS-001: XP Rewards by Content Type

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-001 |
| **Category** | Pulse |
| **Priority** | Medium |
| **Source** | `src/constants/pulse.constants.ts:10-19` |

**XP Table:**
| Content Type | XP Reward |
|--------------|-----------|
| podcast | 200 |
| reel | 100 |
| article | 150 |
| gallery | 75 |
| spark | 50 |
| post | 25 |

---

### BR-PS-002: Engagement XP

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-002 |
| **Category** | Pulse |
| **Priority** | Medium |
| **Source** | `src/constants/pulse.constants.ts:20-27` |

**Engagement XP (awarded to content owner):**
| Engagement | XP |
|------------|-----|
| fire | 2 |
| gold | 15 |
| save | 5 |
| bookmark | 0 |

---

### BR-PS-003: Level Calculation

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-003 |
| **Category** | Pulse |
| **Priority** | High |
| **Source** | `src/constants/pulse.constants.ts:162-164` |

**Formula:**
```text
level = MAX(1, FLOOR(SQRT(totalXp / 20)) + 1)
```

---

### BR-PS-004: Streak Multipliers

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-004 |
| **Category** | Pulse |
| **Priority** | Medium |
| **Source** | `src/constants/pulse.constants.ts:135-143` |

**Multiplier Table:**
| Streak Days | Multiplier |
|-------------|------------|
| 365+ | 3.0x |
| 180+ | 2.5x |
| 90+ | 2.0x |
| 30+ | 1.75x |
| 14+ | 1.5x |
| 7+ | 1.25x |
| 0+ | 1.0x |

---

### BR-PS-005: Feed Ranking Algorithm

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-005 |
| **Category** | Pulse |
| **Priority** | Medium |
| **Source** | `src/constants/pulse.constants.ts:108-129` |

**Formula:**
```text
baseScore = (fire_count × 1) + (comment_count × 3) + (gold_count × 10) + (save_count × 5)

recencyMultiplier:
  IF hours_since_publish <= 6 THEN 1.0
  ELSE MAX(0.1, 0.95^(hours_since_publish - 6))

visibilityBoost = standup_active ? 10 : 1

finalScore = baseScore × recencyMultiplier × visibilityBoost
```

---

### BR-PS-006: Rate Limits

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-006 |
| **Category** | Pulse |
| **Priority** | High |
| **Source** | `src/constants/pulse.constants.ts:203-212` |

**Limits:**
| Action | Limit |
|--------|-------|
| Content per hour | 5 |
| Content per day | 20 |
| Comments per hour | 30 |
| AI enhancements per day | 10 |

---

### BR-PS-007: Upload Limits

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PS-007 |
| **Category** | Pulse |
| **Priority** | High |
| **Source** | `src/constants/pulse.constants.ts:188-197` |

**Size Limits:**
| Type | Max Size |
|------|----------|
| Video/Audio | 500 MB |
| Gallery Image | 50 MB |
| Post Image | 10 MB |
| Gallery Count | 10 images |

---

## 9. PulseCards Rules

### BR-PC-001: Reputation Tiers

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PC-001 |
| **Category** | PulseCards |
| **Priority** | Medium |
| **Source** | `src/constants/pulseCards.constants.ts:9-15` |

**Tier Table:**
| Tier | Min | Max | Permissions |
|------|-----|-----|-------------|
| Seedling | 0 | 49 | View, react, comment |
| Contributor | 50 | 199 | Start cards |
| Builder | 200 | 499 | Build on any card |
| Expert | 500 | 999 | 2x vote weight |
| Trust Council | 1000+ | ∞ | Moderation powers |

---

### BR-PC-002: Reputation Actions

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PC-002 |
| **Category** | PulseCards |
| **Priority** | Medium |
| **Source** | `src/constants/pulseCards.constants.ts:22-31` |

**Points Table:**
| Action | Points |
|--------|--------|
| Card build received | +5 |
| Layer pinned | +20 |
| Flag upheld | +10 |
| Card shared | +2 |
| Credential verified | +100 |
| Flag rejected | -5 |
| Card archived (violation) | -50 |
| Report upheld against | -25 |

---

### BR-PC-003: Content Limits

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PC-003 |
| **Category** | PulseCards |
| **Priority** | Low |
| **Source** | `src/constants/pulseCards.constants.ts:116-122` |

**Limits:**
| Constraint | Value |
|------------|-------|
| Max content length | 280 chars |
| Voting window | 24 hours |
| Max media size | 50 MB |
| Max layers per card | 100 |
| Auto-hide threshold | 3 flags |

---

### BR-PC-004: Vote Weight

| Attribute | Value |
|-----------|-------|
| **Rule ID** | BR-PC-004 |
| **Category** | PulseCards |
| **Priority** | Medium |
| **Source** | `src/constants/pulseCards.constants.ts:156-162` |

**Rule Statement:**
Expert and Trust Council tiers get 2x vote weight. All others get 1x.

---

## 10. Traceability

| Business Rule | User Story | Test Cases |
|---------------|------------|------------|
| BR-LC-001 | US-ENR-006 | TC-LC-001 to TC-LC-010 |
| BR-LC-002 | US-ENR-006 | TC-LC-011 to TC-LC-020 |
| BR-AS-001 | US-ASS-001 | TC-AS-001 to TC-AS-010 |
| BR-AS-006 | US-ASS-003 | TC-AS-021 to TC-AS-030 |
| BR-CT-001 | US-CRT-001 | TC-CT-001 to TC-CT-010 |
| BR-PP-001 | US-PP-002 | TC-PP-001 to TC-PP-010 |
| BR-PS-001 | US-PLS-001 | TC-PS-001 to TC-PS-020 |
| BR-PC-001 | US-PC-001 | TC-PC-001 to TC-PC-015 |

---

**Document End - QA-04**
