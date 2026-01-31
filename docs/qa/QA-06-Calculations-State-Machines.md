# QA-06: Calculations & State Machines

| Document ID | QA-06 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Calculations | 10 |
| Total State Machines | 4 |

---

## 1. Document Purpose

This document catalogs all calculation formulas and state machines extracted from the codebase, with source references and worked examples.

---

## 2. Calculations Index

| Calc ID | Name | Module | Source |
|---------|------|--------|--------|
| CALC-001 | Assessment Score | MOD-008 | assessmentService.ts |
| CALC-002 | Composite Certification Score | MOD-012 | certification.constants.ts |
| CALC-003 | Certification Outcome | MOD-012 | certification.constants.ts |
| CALC-004 | Proof Points Score | MOD-007 | proofPointsScoreService.ts |
| CALC-005 | XP Level | MOD-015 | pulse.constants.ts |
| CALC-006 | XP for Level | MOD-015 | pulse.constants.ts |
| CALC-007 | Streak Multiplier | MOD-015 | pulse.constants.ts |
| CALC-008 | Feed Ranking Score | MOD-013 | pulse.constants.ts |
| CALC-009 | Reputation Tier | MOD-016 | pulseCards.constants.ts |
| CALC-010 | Vote Weight | MOD-016 | pulseCards.constants.ts |

---

## 3. Detailed Calculations

### CALC-001: Assessment Score Calculation

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-001 |
| **Purpose** | Calculate percentage score for completed assessment |
| **Trigger** | Assessment submission |
| **Source** | `src/services/assessmentService.ts:316-319` |

**Formula:**
```text
score_percentage = ROUND((correct_answers / total_questions) × 100)
is_passed = score_percentage >= 70
```

**Input Parameters:**
| Parameter | Type | Valid Range |
|-----------|------|-------------|
| correct_answers | Integer | 0 - total_questions |
| total_questions | Integer | 10 - 50 |

**Rounding Rules:**
- Method: ROUND (standard)
- Precision: Integer (whole number)

**Examples:**

| Example | Correct | Total | Calculation | Result |
|---------|---------|-------|-------------|--------|
| Passing | 14 | 20 | (14/20)×100 = 70 | PASSED |
| Failing | 13 | 20 | (13/20)×100 = 65 | FAILED |
| Boundary | 7 | 10 | (7/10)×100 = 70 | PASSED |
| Perfect | 20 | 20 | (20/20)×100 = 100 | PASSED |
| Zero | 0 | 20 | (0/20)×100 = 0 | FAILED |

**Source Code Evidence:**
```typescript
// src/services/assessmentService.ts:316-319
const scorePercentage = attempt.total_questions > 0 
  ? Math.round((correctCount || 0) / attempt.total_questions * 100)
  : 0;
const isPassed = scorePercentage >= PASSING_SCORE_PERCENTAGE;
```

---

### CALC-002: Composite Certification Score

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-002 |
| **Purpose** | Calculate final certification composite score |
| **Trigger** | Panel interview completion |
| **Source** | `src/constants/certification.constants.ts:106-130` |

**Formula:**
```text
Step 1: Normalize to percentages
  proofPointsPercent = (proofPointsScore / 10) × 100
  interviewPercent = (interviewScore / 10) × 100
  assessmentPercent = assessmentPercentage (already 0-100)

Step 2: Apply weights
  compositeScore = (proofPointsPercent × 0.30) +
                   (assessmentPercent × 0.50) +
                   (interviewPercent × 0.20)

Step 3: Round
  roundedScore = ROUND(compositeScore × 10) / 10
```

**Weights:**
| Component | Weight | Input Range | Normalized Range |
|-----------|--------|-------------|------------------|
| Proof Points | 30% | 0.00 - 10.00 | 0 - 100% |
| Assessment | 50% | 0.00 - 100.00 | 0 - 100% |
| Interview | 20% | 0.00 - 10.00 | 0 - 100% |

**Rounding Rules:**
- Method: ROUND_HALF_UP
- Precision: 1 decimal place

**Examples:**

**Example 1: Three-Star Certification**
```text
Input: ProofPoints=9.0, Assessment=90%, Interview=8.5

Calculation:
  PP = (9.0/10)×100 = 90%
  IV = (8.5/10)×100 = 85%
  Composite = (90×0.30) + (90×0.50) + (85×0.20)
           = 27 + 45 + 17 = 89.0%

Result: THREE STAR (≥86%)
```

**Example 2: One-Star Certification**
```text
Input: ProofPoints=5.5, Assessment=72%, Interview=5.0

Calculation:
  PP = (5.5/10)×100 = 55%
  IV = (5.0/10)×100 = 50%
  Composite = (55×0.30) + (72×0.50) + (50×0.20)
           = 16.5 + 36 + 10 = 62.5%

Result: ONE STAR (51-65.9%)
```

**Example 3: Not Certified**
```text
Input: ProofPoints=3.5, Assessment=60%, Interview=4.0

Calculation:
  PP = (3.5/10)×100 = 35%
  IV = (4.0/10)×100 = 40%
  Composite = (35×0.30) + (60×0.50) + (40×0.20)
           = 10.5 + 30 + 8 = 48.5%

Result: NOT CERTIFIED (<51%)
```

**Source Code Evidence:**
```typescript
// src/constants/certification.constants.ts:117-127
const proofPointsPercent = (proofPointsScore / 10) * 100;
const interviewPercent = (interviewScore / 10) * 100;

const compositeScore =
  (proofPointsPercent * SCORE_WEIGHTS.proofPoints) +
  (assessmentPercentage * SCORE_WEIGHTS.assessment) +
  (interviewPercent * SCORE_WEIGHTS.interview);

const roundedScore = Math.round(compositeScore * 10) / 10;
```

---

### CALC-003: Certification Outcome Determination

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-003 |
| **Purpose** | Determine certification outcome based on composite score |
| **Trigger** | After CALC-002 |
| **Source** | `src/constants/certification.constants.ts:96-101` |

**Threshold Mapping:**
```text
IF compositeScore < 51.0  THEN 'not_certified' (0 stars)
IF compositeScore < 66.0  THEN 'one_star' (1 star)
IF compositeScore < 86.0  THEN 'two_star' (2 stars)
IF compositeScore >= 86.0 THEN 'three_star' (3 stars)
```

**Boundary Conditions:**
| Score | Outcome |
|-------|---------|
| 50.9% | Not Certified |
| 51.0% | One Star |
| 65.9% | One Star |
| 66.0% | Two Star |
| 85.9% | Two Star |
| 86.0% | Three Star |

**Source Code Evidence:**
```typescript
// src/constants/certification.constants.ts:96-101
export function getCertificationOutcome(compositeScore: number): CertificationOutcome {
  if (compositeScore < CERTIFICATION_THRESHOLDS.notCertified) return 'not_certified';
  if (compositeScore < CERTIFICATION_THRESHOLDS.oneStar) return 'one_star';
  if (compositeScore < CERTIFICATION_THRESHOLDS.twoStar) return 'two_star';
  return 'three_star';
}
```

---

### CALC-004: Proof Points Score Calculation

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-004 |
| **Purpose** | Calculate weighted proof points score |
| **Trigger** | Reviewer submits proof point ratings |
| **Source** | `src/services/proofPointsScoreService.ts:49-92` |

**Relevance Weights:**
| Rating | Weight |
|--------|--------|
| HIGH | 1.0 |
| MEDIUM | 0.6 |
| LOW | 0.2 |

**Formula:**
```text
Step 1: Calculate weighted sum
  sumWeightedScores = Σ(score_i × relevanceWeight_i)
  sumWeights = Σ(relevanceWeight_i)

Step 2: Calculate quality and density
  weightedQuality = sumWeightedScores / (10 × N)
  relevanceDensity = sumWeights / N

Step 3: Calculate final score
  normalizedScore = weightedQuality × relevanceDensity
  finalScore = ROUND(normalizedScore × 10, 2)
```

**Example:**
```text
Input: 3 proof points
  PP1: Score=8, Relevance=HIGH (1.0)
  PP2: Score=6, Relevance=MEDIUM (0.6)
  PP3: Score=5, Relevance=LOW (0.2)

Calculation:
  sumWeightedScores = (8×1.0) + (6×0.6) + (5×0.2) = 8 + 3.6 + 1 = 12.6
  sumWeights = 1.0 + 0.6 + 0.2 = 1.8
  
  weightedQuality = 12.6 / (10 × 3) = 12.6 / 30 = 0.42
  relevanceDensity = 1.8 / 3 = 0.6
  
  normalizedScore = 0.42 × 0.6 = 0.252
  finalScore = ROUND(0.252 × 10, 2) = 2.52

Result: Final Proof Points Score = 2.52
```

**Source Code Evidence:**
```typescript
// src/services/proofPointsScoreService.ts:68-82
const weightedQuality = sumWeightedScores / (10 * ratedCount);
const relevanceDensity = sumWeights / ratedCount;
const normalizedScore = weightedQuality * relevanceDensity;
const finalScore = Math.round(normalizedScore * 10 * 100) / 100;
```

---

### CALC-005: XP Level Calculation

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-005 |
| **Purpose** | Calculate user level from total XP |
| **Trigger** | Any XP change |
| **Source** | `src/constants/pulse.constants.ts:162-164` |

**Formula:**
```text
level = MAX(1, FLOOR(SQRT(totalXp / 20)) + 1)
```

**Level Progression Table:**
| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 1 | 0 | 0 |
| 2 | 20 | 20 |
| 3 | 80 | 80 |
| 5 | 320 | 320 |
| 10 | 1,620 | 1,620 |
| 25 | 11,520 | 11,520 |
| 50 | 48,020 | 48,020 |

**Examples:**
| Total XP | Calculation | Level |
|----------|-------------|-------|
| 0 | MAX(1, FLOOR(√0)+1) = 1 | 1 |
| 19 | MAX(1, FLOOR(√0.95)+1) = 1 | 1 |
| 20 | MAX(1, FLOOR(√1)+1) = 2 | 2 |
| 80 | MAX(1, FLOOR(√4)+1) = 3 | 3 |
| 500 | MAX(1, FLOOR(√25)+1) = 6 | 6 |

**Source Code Evidence:**
```typescript
// src/constants/pulse.constants.ts:162-164
export function calculateLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 20)) + 1);
}
```

---

### CALC-006: XP Required for Level

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-006 |
| **Purpose** | Calculate XP needed to reach a specific level |
| **Trigger** | Progress display |
| **Source** | `src/constants/pulse.constants.ts:166-168` |

**Formula:**
```text
xpRequired(level) = 20 × (level - 1)²
```

**Examples:**
| Level | Calculation | XP Required |
|-------|-------------|-------------|
| 1 | 20×(1-1)² = 0 | 0 |
| 2 | 20×(2-1)² = 20 | 20 |
| 5 | 20×(5-1)² = 320 | 320 |
| 10 | 20×(10-1)² = 1,620 | 1,620 |

**Source Code Evidence:**
```typescript
// src/constants/pulse.constants.ts:166-168
export function xpForLevel(level: number): number {
  return 20 * Math.pow(level - 1, 2);
}
```

---

### CALC-007: Streak Multiplier

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-007 |
| **Purpose** | Calculate loot box reward multiplier based on streak |
| **Trigger** | Loot box opening |
| **Source** | `src/constants/pulse.constants.ts:145-156` |

**Multiplier Table:**
| Streak Days | Multiplier |
|-------------|------------|
| 365+ | 3.0x |
| 180-364 | 2.5x |
| 90-179 | 2.0x |
| 30-89 | 1.75x |
| 14-29 | 1.5x |
| 7-13 | 1.25x |
| 0-6 | 1.0x |

**Algorithm:**
```text
thresholds = [365, 180, 90, 30, 14, 7, 0] (descending)
FOR each threshold:
  IF streak >= threshold:
    RETURN multiplier[threshold]
RETURN 1.0
```

**Source Code Evidence:**
```typescript
// src/constants/pulse.constants.ts:145-156
export function getStreakMultiplier(streak: number): number {
  const thresholds = Object.keys(PULSE_STREAK_MULTIPLIERS)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const threshold of thresholds) {
    if (streak >= threshold) {
      return PULSE_STREAK_MULTIPLIERS[threshold];
    }
  }
  return 1.0;
}
```

---

### CALC-008: Feed Ranking Score

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-008 |
| **Purpose** | Calculate feed position for content |
| **Trigger** | Feed rendering |
| **Source** | `src/constants/pulse.constants.ts:108-129` |

**Formula:**
```text
Step 1: Base score
  baseScore = (fire_count × 1) + (comment_count × 3) + 
              (gold_count × 10) + (save_count × 5)

Step 2: Recency multiplier
  hours = hours_since_publish
  IF hours <= 6:
    recencyMultiplier = 1.0
  ELSE:
    recencyMultiplier = MAX(0.1, 0.95^(hours - 6))

Step 3: Visibility boost
  IF creator.visibility_boost_active:
    visibilityBoost = 10
  ELSE:
    visibilityBoost = 1

Step 4: Final score
  finalScore = baseScore × recencyMultiplier × visibilityBoost
```

**Weight Constants:**
```typescript
fire: 1
comment: 3
gold: 10
save: 5
```

**Recency Decay:**
- Decay starts: 6 hours after publish
- Decay rate: 5% per hour (0.95 factor)
- Minimum multiplier: 0.1

**Example:**
```text
Input: 50 fires, 10 comments, 2 golds, 5 saves, 12 hours old, no boost

Calculation:
  baseScore = (50×1) + (10×3) + (2×10) + (5×5) = 50 + 30 + 20 + 25 = 125
  recencyMultiplier = 0.95^(12-6) = 0.95^6 ≈ 0.735
  visibilityBoost = 1
  finalScore = 125 × 0.735 × 1 = 91.9

Result: Feed Score = 91.9
```

---

### CALC-009: PulseCards Reputation Tier

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-009 |
| **Purpose** | Determine user's reputation tier |
| **Trigger** | Any reputation change |
| **Source** | `src/constants/pulseCards.constants.ts:140-154` |

**Tier Ranges:**
| Tier | Min Rep | Max Rep |
|------|---------|---------|
| Seedling | 0 | 49 |
| Contributor | 50 | 199 |
| Builder | 200 | 499 |
| Expert | 500 | 999 |
| Trust Council | 1000 | ∞ |

**Algorithm:**
```text
IF totalRep >= 1000: RETURN 'Trust Council'
IF totalRep >= 500:  RETURN 'Expert'
IF totalRep >= 200:  RETURN 'Builder'
IF totalRep >= 50:   RETURN 'Contributor'
RETURN 'Seedling'
```

**Source Code Evidence:**
```typescript
// src/constants/pulseCards.constants.ts:140-154
export function getReputationTier(totalRep: number) {
  if (totalRep >= REPUTATION_TIERS.TRUST_COUNCIL.min) {
    return REPUTATION_TIERS.TRUST_COUNCIL;
  }
  if (totalRep >= REPUTATION_TIERS.EXPERT.min) {
    return REPUTATION_TIERS.EXPERT;
  }
  // ...
}
```

---

### CALC-010: Vote Weight

| Attribute | Value |
|-----------|-------|
| **Calc ID** | CALC-010 |
| **Purpose** | Calculate vote weight based on reputation |
| **Trigger** | Vote cast |
| **Source** | `src/constants/pulseCards.constants.ts:156-162` |

**Weight by Tier:**
| Tier | Vote Weight |
|------|-------------|
| Seedling | 1x |
| Contributor | 1x |
| Builder | 1x |
| Expert | 2x |
| Trust Council | 2x |

**Source Code Evidence:**
```typescript
// src/constants/pulseCards.constants.ts:159-162
export function getVoteWeight(totalRep: number): number {
  const tier = getReputationTier(totalRep);
  return tier.voteWeight;
}
```

---

## 4. State Machines

### SM-001: Provider Lifecycle State Machine

| Attribute | Value |
|-----------|-------|
| **SM ID** | SM-001 |
| **Purpose** | Track provider verification journey |
| **States** | 21 |
| **Source** | `src/constants/lifecycle.constants.ts:19-42` |

**State Diagram:**
```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      LIFECYCLE STATE MACHINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                                                       │
│  │   invited    │ (10)                                                  │
│  └──────┬───────┘                                                       │
│         │ register                                                      │
│         ▼                                                               │
│  ┌──────────────┐                                                       │
│  │  registered  │ (15)                                                  │
│  └──────┬───────┘                                                       │
│         │ enroll                                                        │
│         ▼                                                               │
│  ┌──────────────┐                                                       │
│  │   enrolled   │ (20)                                                  │
│  └──────┬───────┘                                                       │
│         │ select_mode                                                   │
│         ▼                                                               │
│  ┌──────────────┐     ┌──────────────────┐                              │
│  │mode_selected │─────►│ org_info_pending │ (35) [if org required]      │
│  │     (30)     │     └────────┬─────────┘                              │
│  └──────┬───────┘              │ approve                                │
│         │                      ▼                                        │
│         │              ┌──────────────┐                                 │
│         └──────────────►│org_validated │ (40)                           │
│                        └──────┬───────┘                                 │
│                               │ select_expertise                        │
│                               ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  expertise_selected (50)                          │  │
│  └──────────────────────────┬───────────────────────────────────────┘  │
│                             │                                           │
│                             ▼                                           │
│  ┌──────────────┐    ┌──────────────────────┐    ┌─────────────────┐   │
│  │profile_build │───►│proof_points_started  │───►│proof_points_min │   │
│  │    (55)      │    │       (60)           │    │    _met (70)    │   │
│  └──────────────┘    └──────────────────────┘    └───────┬─────────┘   │
│                                                          │              │
│                      ═══════════════════════════════════╪══════════    │
│                      ║ CONFIGURATION LOCK (rank >= 100) ║              │
│                      ═══════════════════════════════════╪══════════    │
│                                                          │              │
│                            ┌─────────────────────────────┘              │
│                            │ start_assessment                           │
│                            ▼                                            │
│  ┌────────────────────┐    ┌────────────────────┐                       │
│  │assessment_pending  │───►│assessment_in_prog  │ (100)                 │
│  │       (90)         │    └─────────┬──────────┘                       │
│  └────────────────────┘              │ submit                           │
│                                      ▼                                  │
│              ┌───────────────────────┴───────────────────────┐          │
│              │                                               │          │
│      [score < 70%]                                   [score >= 70%]     │
│              │                                               │          │
│              ▼                                               ▼          │
│  ┌───────────────────────┐                   ┌───────────────────────┐  │
│  │assessment_completed   │                   │ assessment_passed     │  │
│  │       (105)           │                   │       (110)           │  │
│  └───────────────────────┘                   └───────────┬───────────┘  │
│                                                          │              │
│                                                          │ schedule     │
│                                                          ▼              │
│                                              ┌───────────────────────┐  │
│                                              │  panel_scheduled      │  │
│                                              │       (120)           │  │
│                                              └───────────┬───────────┘  │
│                                                          │ complete     │
│                                                          ▼              │
│                                              ┌───────────────────────┐  │
│                                              │  panel_completed      │  │
│                                              │       (130)           │  │
│                                              └───────────┬───────────┘  │
│                                                          │              │
│                      ════════════════════════════════════╪════════════  │
│                      ║  EVERYTHING LOCK (rank >= 140)   ║              │
│                      ════════════════════════════════════╪════════════  │
│                                                          │              │
│              ┌───────────────────────────────────────────┴───────┐      │
│              │                       │                           │      │
│       [outcome=fail]          [outcome=pass]              [active]      │
│              │                       │                           │      │
│              ▼                       ▼                           ▼      │
│  ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐  │
│  │   not_verified    │   │     verified      │   │      active       │  │
│  │      (160)        │   │      (140)        │   │      (145)        │  │
│  └───────────────────┘   └─────────┬─────────┘   └───────────────────┘  │
│         [TERMINAL]                 │ certify                            │
│                                    ▼                                    │
│                          ┌───────────────────┐                          │
│                          │    certified      │                          │
│                          │      (150)        │                          │
│                          └───────────────────┘                          │
│                                [TERMINAL]                               │
│                                                                         │
│  SPECIAL STATES:                                                        │
│  ┌───────────────────┐   ┌───────────────────┐                          │
│  │    suspended      │   │     inactive      │                          │
│  │      (200)        │   │      (210)        │                          │
│  └───────────────────┘   └───────────────────┘                          │
│     [TERMINAL/HIDDEN]       [TERMINAL/HIDDEN]                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**State Definitions:**
| Status | Rank | Description | Locks |
|--------|------|-------------|-------|
| invited | 10 | Invitation sent | None |
| registered | 15 | Account created | None |
| enrolled | 20 | Basic info submitted | None |
| mode_selected | 30 | Participation mode chosen | None |
| org_info_pending | 35 | Awaiting org approval | None |
| org_validated | 40 | Organization verified | None |
| expertise_selected | 50 | Expertise level chosen | None |
| profile_building | 55 | Adding proof points | None |
| proof_points_started | 60 | First proof point added | None |
| proof_points_min_met | 70 | Minimum achieved | None |
| assessment_pending | 90 | Ready for assessment | None |
| assessment_in_progress | 100 | Assessment active | Config+Content |
| assessment_completed | 105 | Submitted, not passed | Config+Content |
| assessment_passed | 110 | Passed with ≥70% | Config+Content |
| panel_scheduled | 120 | Interview booked | Config+Content |
| panel_completed | 130 | Interview done | Config+Content |
| verified | 140 | Verification complete | Everything |
| active | 145 | Actively engaged | Everything |
| certified | 150 | Final certification | Everything |
| not_verified | 160 | Failed verification | Everything |
| suspended | 200 | Account suspended | Everything+Hidden |
| inactive | 210 | Account deactivated | Everything+Hidden |

---

### SM-002: Assessment Status State Machine

| Attribute | Value |
|-----------|-------|
| **SM ID** | SM-002 |
| **Purpose** | Track assessment attempt lifecycle |
| **States** | 5 |
| **Source** | `src/services/assessmentService.ts` |

**State Diagram:**
```text
┌───────────────────────────────────────────────────────────────┐
│                  ASSESSMENT STATE MACHINE                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                             │
│  │   pending    │ (Can start if rank >= 70, rank < 100)       │
│  └──────┬───────┘                                             │
│         │ start_assessment()                                  │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │ in_progress  │ (rank = 100, submitted_at = NULL)           │
│  └──────┬───────┘                                             │
│         │                                                     │
│    ┌────┴────┐                                                │
│    │         │                                                │
│ [timeout] [submit]                                            │
│    │         │                                                │
│    ▼         ▼                                                │
│  ┌────────────────────────────────────────────────────┐       │
│  │                 submitted                           │       │
│  │              (submitted_at != NULL)                 │       │
│  └────────────────────────┬───────────────────────────┘       │
│                           │                                   │
│              ┌────────────┴────────────┐                      │
│              │                         │                      │
│       [score < 70%]             [score >= 70%]                │
│              │                         │                      │
│              ▼                         ▼                      │
│  ┌───────────────────┐     ┌───────────────────┐              │
│  │      failed       │     │      passed       │              │
│  │   is_passed=false │     │   is_passed=true  │              │
│  │     rank=105      │     │     rank=110      │              │
│  └───────────────────┘     └───────────────────┘              │
│         [TERMINAL]                [TERMINAL]                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### SM-003: Interview Booking State Machine

| Attribute | Value |
|-----------|-------|
| **SM ID** | SM-003 |
| **Purpose** | Track interview booking lifecycle |
| **States** | 5 |
| **Source** | DB Functions |

**State Diagram:**
```text
┌───────────────────────────────────────────────────────────────┐
│                INTERVIEW BOOKING STATE MACHINE                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                             │
│  │  available   │ (Composite slots visible)                   │
│  └──────┬───────┘                                             │
│         │ book_interview_slot()                               │
│         ▼                                                     │
│  ┌──────────────┐                                             │
│  │  scheduled   │ (status='scheduled')                        │
│  └──────┬───────┘                                             │
│         │                                                     │
│    ┌────┼────┬──────────┐                                     │
│    │    │    │          │                                     │
│ [confirm] [cancel] [reschedule] [interview_date]              │
│    │    │    │          │                                     │
│    ▼    │    ▼          ▼                                     │
│ ┌────────────┐ ┌──────────┐ ┌──────────────────┐              │
│ │ confirmed  │ │cancelled │ │    completed     │              │
│ └────────────┘ └──────────┘ └──────────────────┘              │
│                   [TERMINAL]        │                         │
│                                     │ submit_evaluation       │
│                                     ▼                         │
│                            ┌──────────────────┐               │
│                            │    evaluated     │               │
│                            └──────────────────┘               │
│                                  [TERMINAL]                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### SM-004: Pulse Content Status State Machine

| Attribute | Value |
|-----------|-------|
| **SM ID** | SM-004 |
| **Purpose** | Track content moderation lifecycle |
| **States** | 5 |
| **Source** | `src/constants/pulse.constants.ts:66-74` |

**State Diagram:**
```text
┌───────────────────────────────────────────────────────────────┐
│                  PULSE CONTENT STATE MACHINE                   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐                                             │
│  │    draft     │ (content_status='draft')                    │
│  └──────┬───────┘                                             │
│         │                                                     │
│    ┌────┴────┐                                                │
│    │         │                                                │
│ [publish] [submit_review]                                     │
│    │         │                                                │
│    │         ▼                                                │
│    │  ┌────────────────┐                                      │
│    │  │ pending_review │                                      │
│    │  └───────┬────────┘                                      │
│    │          │                                               │
│    │     ┌────┴────┐                                          │
│    │     │         │                                          │
│    │ [approve] [reject]                                       │
│    │     │         │                                          │
│    │     │         ▼                                          │
│    │     │  ┌──────────────┐                                  │
│    │     │  │   rejected   │                                  │
│    │     │  └──────────────┘                                  │
│    │     │      [TERMINAL]                                    │
│    ▼     ▼                                                    │
│  ┌──────────────┐                                             │
│  │  published   │ (XP awarded here)                           │
│  └──────┬───────┘                                             │
│         │                                                     │
│    ┌────┴────┐                                                │
│    │         │                                                │
│ [archive] [delete]                                            │
│    │         │                                                │
│    ▼         ▼                                                │
│ ┌─────────┐ ┌─────────┐                                       │
│ │archived │ │ deleted │ (is_deleted=true)                     │
│ └─────────┘ └─────────┘                                       │
│  [TERMINAL]  [SOFT DEL]                                       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Traceability

| Calculation | Business Rule | Test Cases |
|-------------|---------------|------------|
| CALC-001 | BR-AS-007 | TC-CALC-001 to TC-CALC-010 |
| CALC-002 | BR-CT-001 | TC-CALC-011 to TC-CALC-025 |
| CALC-003 | BR-CT-002 | TC-CALC-026 to TC-CALC-035 |
| CALC-004 | BR-PP-005 | TC-CALC-036 to TC-CALC-045 |
| CALC-005 | BR-PS-003 | TC-CALC-046 to TC-CALC-055 |

| State Machine | Business Rules | Test Cases |
|---------------|----------------|------------|
| SM-001 | BR-LC-001 to BR-LC-008 | TC-SM-001 to TC-SM-050 |
| SM-002 | BR-AS-001 to BR-AS-008 | TC-SM-051 to TC-SM-070 |
| SM-003 | BR-IS-001 to BR-IS-005 | TC-SM-071 to TC-SM-090 |
| SM-004 | BR-PS-001 to BR-PS-007 | TC-SM-091 to TC-SM-110 |

---

**Document End - QA-06**
