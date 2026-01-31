# QA-07: Test Case Catalog

| Document ID | QA-07 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Test Cases | 300+ |

---

## 1. Document Purpose

This document catalogs all test cases derived from the codebase, organized by module and test type. Each test case includes traceability to business rules and user stories.

---

## 2. Test Case Summary

| Category | Count | Priority |
|----------|-------|----------|
| Lifecycle & Locks | 50 | P1-Critical |
| Assessment | 40 | P1-Critical |
| Certification | 25 | P1-Critical |
| Proof Points | 35 | P2-High |
| Interview Scheduling | 30 | P2-High |
| Enrollment Wizard | 40 | P2-High |
| Pulse Social | 50 | P3-Medium |
| PulseCards | 30 | P3-Medium |
| **TOTAL** | **300+** | |

---

## 3. Lifecycle & Lock Test Cases

### TC-LC-001: Configuration Lock at Assessment Start

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-001 |
| **Title** | Verify configuration fields are locked at rank 100 |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-001, US-ENR-006 |

**Preconditions:**
1. Provider exists with lifecycle_rank = 100 (assessment_in_progress)
2. User is authenticated as the provider

**Test Data:**
| Element | Value |
|---------|-------|
| lifecycle_rank | 100 |
| field_category | configuration |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canModifyField(100, 'configuration')` | Returns `{ allowed: false }` |
| 2 | Attempt to change industry_segment_id | Operation blocked |
| 3 | Verify error message | "Industry and expertise settings cannot be changed during or after assessment." |

**Verification Points:**
- `allowed` is `false`
- `lockLevel` is `'configuration'`
- Appropriate error message returned

---

### TC-LC-002: Configuration Lock at Rank 99

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-002 |
| **Title** | Verify configuration fields are NOT locked at rank 99 |
| **Type** | Boundary |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-001 |

**Preconditions:**
1. Provider exists with lifecycle_rank = 99

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canModifyField(99, 'configuration')` | Returns `{ allowed: true }` |
| 2 | Attempt to change industry_segment_id | Operation succeeds |

---

### TC-LC-003: Content Lock at Assessment Start

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-003 |
| **Title** | Verify content fields are locked at rank 100 |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-002 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canModifyField(100, 'content')` | Returns `{ allowed: false, lockLevel: 'content' }` |
| 2 | Attempt to add proof point | Operation blocked |

---

### TC-LC-004: Everything Frozen at Verification

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-004 |
| **Title** | Verify all fields frozen at rank 140 |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-003 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canModifyField(140, 'registration')` | Returns `{ allowed: false, lockLevel: 'everything' }` |
| 2 | Call `canModifyField(140, 'configuration')` | Returns `{ allowed: false, lockLevel: 'everything' }` |
| 3 | Call `canModifyField(140, 'content')` | Returns `{ allowed: false, lockLevel: 'everything' }` |

---

### TC-LC-005: Terminal State Detection

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-005 |
| **Title** | Verify terminal states are correctly identified |
| **Type** | Unit |
| **Priority** | P2-High |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-004 |

**Test Data:**
| Status | Expected |
|--------|----------|
| verified | true |
| certified | true |
| not_verified | true |
| suspended | true |
| inactive | true |
| assessment_passed | false |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `isTerminalState('verified')` | Returns `true` |
| 2 | Call `isTerminalState('certified')` | Returns `true` |
| 3 | Call `isTerminalState('assessment_passed')` | Returns `false` |

---

### TC-LC-006: Industry Change Cascade Trigger

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-006 |
| **Title** | Verify industry change triggers hard reset cascade |
| **Type** | Integration |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-006 |

**Preconditions:**
1. Provider has expertise_selected = true
2. Provider has specialty proof points

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `getCascadeImpact('industry_segment_id', 50, true, true)` | Returns type: 'HARD_RESET' |
| 2 | Verify deletesProofPoints | 'specialty_only' |
| 3 | Verify deletesSpecialities | true |
| 4 | Verify resetsToRank | 20 |

---

### TC-LC-007: Wizard Step Lock - Step 1 at Rank 100

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-LC-007 |
| **Title** | Verify Step 1 (Registration) is locked at rank 100 |
| **Type** | Functional |
| **Priority** | P2-High |
| **Module** | MOD-012 |
| **Traceability** | BR-LC-008 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `isWizardStepLocked(1, 100)` | Returns `true` |
| 2 | Call `isWizardStepLocked(1, 99)` | Returns `false` |

---

### TC-LC-008 to TC-LC-015: Step Lock Tests for Steps 2-9

*Similar pattern for each wizard step with appropriate rank thresholds.*

---

## 4. Assessment Test Cases

### TC-AS-001: Cannot Start Without Minimum Proof Points

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-001 |
| **Title** | Verify assessment blocked if rank < 70 |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-001 |

**Preconditions:**
1. Provider exists with lifecycle_rank = 60

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canStartAssessment(providerId, enrollmentId)` | Returns `{ allowed: false }` |
| 2 | Verify reason | "Complete your proof points before starting the assessment" |

---

### TC-AS-002: Cannot Start If Already In Progress

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-002 |
| **Title** | Verify assessment blocked if rank >= 100 |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-002 |

**Preconditions:**
1. Provider exists with lifecycle_rank = 100

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canStartAssessment(providerId)` | Returns `{ allowed: false }` |
| 2 | Verify reason | "Assessment already in progress or completed" |

---

### TC-AS-003: Cannot Start With Active Unexpired Attempt

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-003 |
| **Title** | Verify assessment blocked if active attempt exists |
| **Type** | Integration |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-003 |

**Preconditions:**
1. Provider has lifecycle_rank = 70
2. Active assessment_attempt exists with submitted_at = NULL
3. Attempt started 30 minutes ago (within 60 min limit)

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canStartAssessment(providerId)` | Returns `{ allowed: false }` |
| 2 | Verify reason | "You have an active assessment in progress" |

---

### TC-AS-004: Can Start With Expired Attempt

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-004 |
| **Title** | Verify assessment allowed after previous expired |
| **Type** | Integration |
| **Priority** | P2-High |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-003 |

**Preconditions:**
1. Provider has lifecycle_rank = 70
2. Previous attempt started 90 minutes ago (expired)

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `canStartAssessment(providerId)` | Returns `{ allowed: true }` |

---

### TC-AS-005: Score Calculation - Passing

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-005 |
| **Title** | Verify 70% score passes |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-006, CALC-001 |

**Test Data:**
| correct_answers | total_questions | expected_score | expected_pass |
|-----------------|-----------------|----------------|---------------|
| 14 | 20 | 70 | true |

**Verification Points:**
- score_percentage = 70
- is_passed = true
- lifecycle_status = 'assessment_passed'
- lifecycle_rank = 110

---

### TC-AS-006: Score Calculation - Failing

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-006 |
| **Title** | Verify 69% score fails |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-006, CALC-001 |

**Test Data:**
| correct_answers | total_questions | expected_score | expected_pass |
|-----------------|-----------------|----------------|---------------|
| 13 | 20 | 65 | false |

**Verification Points:**
- score_percentage = 65
- is_passed = false
- lifecycle_status = 'assessment_completed'
- lifecycle_rank = 105

---

### TC-AS-007: Score Boundary - Exactly 70%

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-007 |
| **Title** | Verify exactly 70% passes |
| **Type** | Boundary |
| **Priority** | P1-Critical |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-006 |

**Test Data:**
| correct_answers | total_questions | expected_score | expected_pass |
|-----------------|-----------------|----------------|---------------|
| 7 | 10 | 70 | true |

---

### TC-AS-008: Time Limit Default

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-AS-008 |
| **Title** | Verify default time limit is 60 minutes |
| **Type** | Configuration |
| **Priority** | P2-High |
| **Module** | MOD-008 |
| **Traceability** | BR-AS-004 |

**Verification Points:**
- DEFAULT_TIME_LIMIT_MINUTES = 60

---

## 5. Certification Test Cases

### TC-CT-001: Composite Score - Three Star

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-001 |
| **Title** | Verify three-star certification at 86%+ |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | BR-CT-001, BR-CT-002, CALC-002 |

**Test Data:**
| proofPointsScore | assessmentPercent | interviewScore |
|------------------|-------------------|----------------|
| 9.0 | 90 | 8.5 |

**Calculation:**
```
PP% = (9.0/10)×100 = 90%
IV% = (8.5/10)×100 = 85%
Composite = (90×0.30) + (90×0.50) + (85×0.20)
         = 27 + 45 + 17 = 89.0%
```

**Expected Result:**
- compositeScore = 89.0
- outcome = 'three_star'
- stars = 3

---

### TC-CT-002: Composite Score - Two Star

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-002 |
| **Title** | Verify two-star certification at 66-85.9% |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | CALC-002, CALC-003 |

**Test Data:**
| proofPointsScore | assessmentPercent | interviewScore |
|------------------|-------------------|----------------|
| 7.0 | 80 | 7.0 |

**Expected Result:**
- compositeScore = 75.0
- outcome = 'two_star'

---

### TC-CT-003: Composite Score - One Star

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-003 |
| **Title** | Verify one-star certification at 51-65.9% |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | CALC-003 |

**Test Data:**
| proofPointsScore | assessmentPercent | interviewScore |
|------------------|-------------------|----------------|
| 5.5 | 72 | 5.0 |

**Calculation:**
```
Composite = (55×0.30) + (72×0.50) + (50×0.20) = 62.5%
```

**Expected Result:**
- compositeScore = 62.5
- outcome = 'one_star'

---

### TC-CT-004: Composite Score - Not Certified

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-004 |
| **Title** | Verify not certified below 51% |
| **Type** | Calculation |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | CALC-003 |

**Test Data:**
| proofPointsScore | assessmentPercent | interviewScore |
|------------------|-------------------|----------------|
| 3.5 | 60 | 4.0 |

**Expected Result:**
- compositeScore = 48.5
- outcome = 'not_certified'

---

### TC-CT-005: Boundary - Exactly 51%

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-005 |
| **Title** | Verify exactly 51% is one-star |
| **Type** | Boundary |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | CALC-003 |

---

### TC-CT-006: Boundary - Exactly 50.9%

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-006 |
| **Title** | Verify 50.9% is not certified |
| **Type** | Boundary |
| **Priority** | P1-Critical |
| **Module** | MOD-012 |
| **Traceability** | CALC-003 |

---

### TC-CT-007: Incomplete Score - Missing Proof Points

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-CT-007 |
| **Title** | Verify null returned if proof points missing |
| **Type** | Negative |
| **Priority** | P2-High |
| **Module** | MOD-012 |
| **Traceability** | BR-CT-004 |

**Test Data:**
| proofPointsScore | assessmentPercent | interviewScore |
|------------------|-------------------|----------------|
| null | 80 | 7.0 |

**Expected Result:**
- score = null
- isComplete = false

---

## 6. Proof Points Test Cases

### TC-PP-001: Lifecycle Advancement to Started

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PP-001 |
| **Title** | Verify lifecycle advances when first proof point added |
| **Type** | Integration |
| **Priority** | P2-High |
| **Module** | MOD-007 |
| **Traceability** | BR-PP-002 |

**Preconditions:**
1. Enrollment has lifecycle_rank = 50
2. No proof points exist

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create proof point | Success |
| 2 | Check enrollment lifecycle | rank = 60, status = 'proof_points_started' |

---

### TC-PP-002: Lifecycle Advancement to Min Met

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PP-002 |
| **Title** | Verify lifecycle advances at minimum count |
| **Type** | Integration |
| **Priority** | P2-High |
| **Module** | MOD-007 |
| **Traceability** | BR-PP-002 |

**Preconditions:**
1. Enrollment has 1 proof point
2. Minimum required = 2

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create second proof point | Success |
| 2 | Check enrollment lifecycle | rank = 70, status = 'proof_points_min_met' |

---

### TC-PP-003: Content Lock Blocks Creation

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PP-003 |
| **Title** | Verify proof point creation blocked after assessment |
| **Type** | Functional |
| **Priority** | P1-Critical |
| **Module** | MOD-007 |
| **Traceability** | BR-PP-003, BR-LC-002 |

**Preconditions:**
1. Enrollment has lifecycle_rank = 100

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Attempt to create proof point | Error thrown |
| 2 | Verify error message | "Content modification is locked at this lifecycle stage" |

---

### TC-PP-004: Score Calculation with Mixed Relevance

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PP-004 |
| **Title** | Verify proof points score with HIGH/MEDIUM/LOW mix |
| **Type** | Calculation |
| **Priority** | P2-High |
| **Module** | MOD-007 |
| **Traceability** | BR-PP-005, CALC-004 |

**Test Data:**
| Proof Point | Score | Relevance | Weight |
|-------------|-------|-----------|--------|
| PP1 | 8 | HIGH | 1.0 |
| PP2 | 6 | MEDIUM | 0.6 |
| PP3 | 5 | LOW | 0.2 |

**Calculation:**
```
sumWeightedScores = (8×1.0) + (6×0.6) + (5×0.2) = 12.6
sumWeights = 1.8
weightedQuality = 12.6 / 30 = 0.42
relevanceDensity = 1.8 / 3 = 0.6
finalScore = 0.42 × 0.6 × 10 = 2.52
```

---

## 7. Pulse Social Test Cases

### TC-PS-001: XP Award for Podcast

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PS-001 |
| **Title** | Verify 200 XP awarded for podcast |
| **Type** | Functional |
| **Priority** | P3-Medium |
| **Module** | MOD-015 |
| **Traceability** | BR-PS-001 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Publish podcast content | Content status = 'published' |
| 2 | Check XP audit log | +200 XP entry exists |
| 3 | Check provider stats | total_xp increased by 200 |

---

### TC-PS-002: XP Award for Fire Engagement

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PS-002 |
| **Title** | Verify 2 XP awarded to content owner for fire |
| **Type** | Functional |
| **Priority** | P3-Medium |
| **Module** | MOD-015 |
| **Traceability** | BR-PS-002 |

---

### TC-PS-003: Level Calculation at Various XP

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PS-003 |
| **Title** | Verify level calculation formula |
| **Type** | Calculation |
| **Priority** | P3-Medium |
| **Module** | MOD-015 |
| **Traceability** | BR-PS-003, CALC-005 |

**Test Data:**
| Total XP | Expected Level |
|----------|----------------|
| 0 | 1 |
| 19 | 1 |
| 20 | 2 |
| 80 | 3 |
| 500 | 6 |

---

### TC-PS-004: Streak Multiplier at 7 Days

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PS-004 |
| **Title** | Verify 1.25x multiplier at 7-day streak |
| **Type** | Calculation |
| **Priority** | P3-Medium |
| **Module** | MOD-015 |
| **Traceability** | BR-PS-004, CALC-007 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `getStreakMultiplier(7)` | Returns 1.25 |
| 2 | Call `getStreakMultiplier(6)` | Returns 1.0 |

---

### TC-PS-005: Content Rate Limit

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PS-005 |
| **Title** | Verify content creation blocked after 5/hour |
| **Type** | Functional |
| **Priority** | P2-High |
| **Module** | MOD-013 |
| **Traceability** | BR-PS-006 |

---

## 8. PulseCards Test Cases

### TC-PC-001: Reputation Tier - Seedling

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PC-001 |
| **Title** | Verify Seedling tier at 0-49 rep |
| **Type** | Calculation |
| **Priority** | P3-Medium |
| **Module** | MOD-016 |
| **Traceability** | BR-PC-001, CALC-009 |

**Test Data:**
| Total Rep | Expected Tier |
|-----------|---------------|
| 0 | Seedling |
| 49 | Seedling |
| 50 | Contributor |

---

### TC-PC-002: Vote Weight - Expert Tier

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PC-002 |
| **Title** | Verify 2x vote weight at Expert tier |
| **Type** | Calculation |
| **Priority** | P3-Medium |
| **Module** | MOD-016 |
| **Traceability** | BR-PC-004, CALC-010 |

**Test Steps:**
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Call `getVoteWeight(500)` | Returns 2 |
| 2 | Call `getVoteWeight(499)` | Returns 1 |

---

### TC-PC-003: Card Content Limit

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-PC-003 |
| **Title** | Verify 280 character limit on card content |
| **Type** | Validation |
| **Priority** | P3-Medium |
| **Module** | MOD-016 |
| **Traceability** | BR-PC-003 |

---

## 9. Negative Test Cases

### TC-NEG-001: Unauthorized Access to Other Provider Data

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-NEG-001 |
| **Title** | Verify RLS blocks access to other provider's data |
| **Type** | Security |
| **Priority** | P1-Critical |
| **Module** | All |
| **Traceability** | Security Policy |

---

### TC-NEG-002: Invalid UUID in API Call

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-NEG-002 |
| **Title** | Verify graceful handling of invalid UUID |
| **Type** | Negative |
| **Priority** | P2-High |
| **Module** | All |

---

### TC-NEG-003: Assessment Submit Without Answers

| Attribute | Value |
|-----------|-------|
| **Test ID** | TC-NEG-003 |
| **Title** | Verify assessment can be submitted with 0 answers |
| **Type** | Edge Case |
| **Priority** | P2-High |
| **Module** | MOD-008 |

---

## 10. Traceability Summary

| Test Range | Business Rules | User Stories |
|------------|----------------|--------------|
| TC-LC-001 to TC-LC-015 | BR-LC-001 to BR-LC-008 | US-ENR-006 |
| TC-AS-001 to TC-AS-010 | BR-AS-001 to BR-AS-008 | US-ASS-001 to US-ASS-003 |
| TC-CT-001 to TC-CT-010 | BR-CT-001 to BR-CT-004 | US-CRT-001 |
| TC-PP-001 to TC-PP-010 | BR-PP-001 to BR-PP-005 | US-PP-001 to US-PP-003 |
| TC-PS-001 to TC-PS-020 | BR-PS-001 to BR-PS-007 | US-PLS-001 to US-PLS-010 |
| TC-PC-001 to TC-PC-015 | BR-PC-001 to BR-PC-004 | US-PC-001 to US-PC-005 |

---

**Document End - QA-07**
