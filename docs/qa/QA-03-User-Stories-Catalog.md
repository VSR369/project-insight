# QA-03: User Stories Catalog

| Document ID | QA-03 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total User Stories | 25+ |

---

## 1. Document Purpose

This document catalogs all user stories extracted from the codebase implementation, organized by module.

---

## 2. User Stories Index

| Module | User Stories | Priority |
|--------|--------------|----------|
| Enrollment & Registration | 6 | Critical |
| Assessment | 3 | Critical |
| Interview Scheduling | 2 | High |
| Certification | 2 | Critical |
| Proof Points | 3 | High |
| Pulse Social | 5 | Medium |
| PulseCards | 4 | Medium |
| **TOTAL** | **25+** | |

---

## 3. Enrollment & Registration User Stories

### US-ENR-001: Provider Registration

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-001 |
| **Priority** | Critical |
| **Module** | MOD-001 |
| **Source Files** | `src/pages/Register.tsx`, `src/hooks/useAuth.ts` |

```text
AS A new user
I WANT TO register as a solution provider
SO THAT I can begin the verification process
```

**Preconditions:**
- User has valid email address
- User is not already registered

**Acceptance Criteria:**
- AC-1: Successful registration creates user account
- AC-2: Profile record created automatically
- AC-3: Solution provider record created
- AC-4: Lifecycle status set to 'registered' (rank 15)
- AC-5: Redirect to enrollment wizard

**UI Elements:**
- First name field (required)
- Last name field (required)
- Email field (required, validated)
- Password field (required, min 8 chars)
- Register button

**API Calls:**
- `supabase.auth.signUp()`
- Trigger: `handle_new_user()` creates profile and provider

**Error Scenarios:**
- Duplicate email: "This email is already registered"
- Invalid email format: "Please enter a valid email"
- Password too short: "Password must be at least 8 characters"

---

### US-ENR-002: Participation Mode Selection

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-002 |
| **Priority** | High |
| **Module** | MOD-003 |
| **Source Files** | `src/hooks/queries/useEnrollmentParticipationMode.ts` |

```text
AS A registered provider
I WANT TO select my participation mode
SO THAT the system knows if I need organization validation
```

**Preconditions:**
- Provider is authenticated
- Enrollment exists with rank >= 20

**Acceptance Criteria:**
- AC-1: Three modes available: Independent, Employee, Freelancer
- AC-2: Selecting Employee requires organization info
- AC-3: Lifecycle advances to 'mode_selected' (rank 30)
- AC-4: Independent/Freelancer skip organization step

**Business Rules Applied:**
- BR-LC-002: Mode selection locked after assessment starts

---

### US-ENR-003: Organization Info Entry

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-003 |
| **Priority** | High |
| **Module** | MOD-004 |
| **Source Files** | `src/hooks/queries/useManagerApproval.ts` |

```text
AS An employee-mode provider
I WANT TO enter my organization details
SO THAT my employment can be verified
```

**Preconditions:**
- Participation mode = 'Employee'
- Enrollment rank >= 30

**Acceptance Criteria:**
- AC-1: Organization name required
- AC-2: Manager email required for approval flow
- AC-3: Lifecycle set to 'org_info_pending' (rank 35)
- AC-4: Manager receives approval request

---

### US-ENR-004: Expertise Level Selection

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-004 |
| **Priority** | Critical |
| **Module** | MOD-005 |
| **Source Files** | `src/hooks/queries/useEnrollmentExpertise.ts` |

```text
AS A provider
I WANT TO select my expertise level and proficiency areas
SO THAT I can be matched with appropriate opportunities
```

**Preconditions:**
- Enrollment rank >= 40 (org validated) or mode != Employee

**Acceptance Criteria:**
- AC-1: Expertise levels shown based on experience years
- AC-2: Proficiency areas filtered by industry + level
- AC-3: Multiple specialities can be selected
- AC-4: Lifecycle advances to 'expertise_selected' (rank 50)

**Business Rules Applied:**
- BR-LC-001: Configuration locked at rank 100
- BR-LC-006: Industry change triggers cascade reset
- BR-LC-007: Expertise change triggers partial reset

---

### US-ENR-005: Proof Points Entry

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-005 |
| **Priority** | High |
| **Module** | MOD-007 |
| **Source Files** | `src/hooks/queries/useProofPoints.ts` |

```text
AS A provider
I WANT TO add proof points demonstrating my expertise
SO THAT reviewers can evaluate my qualifications
```

**Preconditions:**
- Expertise level selected (rank >= 50)

**Acceptance Criteria:**
- AC-1: Can add general and specialty-specific proof points
- AC-2: First proof point advances to rank 60
- AC-3: Minimum proof points advance to rank 70
- AC-4: Links and files can be attached
- AC-5: Specialty tags can be assigned

**Business Rules Applied:**
- BR-PP-001: Minimum 2 proof points required
- BR-PP-002: Lifecycle auto-advances
- BR-PP-003: Content locked after assessment

---

### US-ENR-006: Configuration Lock Enforcement

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ENR-006 |
| **Priority** | Critical |
| **Module** | MOD-012 |
| **Source Files** | `src/services/lifecycleService.ts` |

```text
AS A platform operator
I WANT configuration to be locked during assessment
SO THAT scoring remains consistent
```

**Acceptance Criteria:**
- AC-1: Industry/expertise cannot change after rank 100
- AC-2: Proof points cannot be added after rank 100
- AC-3: All fields frozen after rank 140
- AC-4: Appropriate error messages shown

**Business Rules Applied:**
- BR-LC-001, BR-LC-002, BR-LC-003

---

## 4. Assessment User Stories

### US-ASS-001: Start Assessment

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ASS-001 |
| **Priority** | Critical |
| **Module** | MOD-008 |
| **Source Files** | `src/services/assessmentService.ts` |

```text
AS A provider with minimum proof points
I WANT TO start my competency assessment
SO THAT I can demonstrate my knowledge
```

**Preconditions:**
- Lifecycle rank >= 70 (proof_points_min_met)
- No active assessment in progress

**Acceptance Criteria:**
- AC-1: 20 questions generated from question bank
- AC-2: 60-minute timer starts
- AC-3: Lifecycle advances to 'assessment_in_progress' (rank 100)
- AC-4: Configuration becomes locked

**Business Rules Applied:**
- BR-AS-001 to BR-AS-005

---

### US-ASS-002: Submit Assessment

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ASS-002 |
| **Priority** | Critical |
| **Module** | MOD-008 |
| **Source Files** | `src/services/assessmentService.ts` |

```text
AS A provider taking an assessment
I WANT TO submit my answers
SO THAT my results can be calculated
```

**Acceptance Criteria:**
- AC-1: Score calculated as % correct
- AC-2: >= 70% passes, < 70% fails
- AC-3: Pass advances to rank 110
- AC-4: Fail sets rank to 105

**Business Rules Applied:**
- BR-AS-006, BR-AS-007, BR-AS-008, CALC-001

---

### US-ASS-003: View Assessment Results

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-ASS-003 |
| **Priority** | High |
| **Module** | MOD-008 |
| **Source Files** | `src/hooks/queries/useAssessmentResults.ts` |

```text
AS A provider who completed assessment
I WANT TO see my results
SO THAT I understand my performance
```

**Acceptance Criteria:**
- AC-1: Overall score percentage displayed
- AC-2: Pass/fail status shown
- AC-3: Time taken displayed
- AC-4: Next steps explained

---

## 5. Interview Scheduling User Stories

### US-INT-001: Schedule Interview

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-INT-001 |
| **Priority** | High |
| **Module** | MOD-010 |
| **Source Files** | `src/hooks/queries/useInterviewScheduling.ts` |

```text
AS A provider who passed assessment
I WANT TO schedule my panel interview
SO THAT I can complete verification
```

**Preconditions:**
- Lifecycle rank >= 110 (assessment_passed)

**Acceptance Criteria:**
- AC-1: Available slots shown based on industry/expertise
- AC-2: Booking creates interview_booking record
- AC-3: Reviewers automatically assigned
- AC-4: Lifecycle advances to 'panel_scheduled' (rank 120)

**Business Rules Applied:**
- BR-IS-001 to BR-IS-005

---

### US-INT-002: Conduct Interview (Reviewer)

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-INT-002 |
| **Priority** | High |
| **Module** | MOD-011 |
| **Source Files** | `src/hooks/queries/useInterviewKitEvaluation.ts` |

```text
AS A panel reviewer
I WANT TO evaluate the candidate using the interview kit
SO THAT I can provide fair assessment
```

**Acceptance Criteria:**
- AC-1: Interview kit with questions displayed
- AC-2: Rating system for each question
- AC-3: Comments can be added
- AC-4: Submit evaluation advances candidate

---

## 6. Certification User Stories

### US-CRT-001: View Certification Results

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-CRT-001 |
| **Priority** | Critical |
| **Module** | MOD-012 |
| **Source Files** | `src/hooks/queries/useFinalResultData.ts` |

```text
AS A verified provider
I WANT TO see my certification results
SO THAT I understand my credential level
```

**Acceptance Criteria:**
- AC-1: Composite score displayed
- AC-2: Star rating shown (0-3 stars)
- AC-3: Component breakdown visible
- AC-4: Certificate downloadable

**Business Rules Applied:**
- BR-CT-001 to BR-CT-004, CALC-002, CALC-003

---

## 7. Pulse Social User Stories

### US-PLS-001: Create Pulse Content

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PLS-001 |
| **Priority** | Medium |
| **Module** | MOD-013 |
| **Source Files** | `src/hooks/queries/usePulseContent.ts` |

```text
AS A verified provider
I WANT TO create industry content
SO THAT I can share knowledge and earn XP
```

**Acceptance Criteria:**
- AC-1: Six content types available
- AC-2: Draft saving supported
- AC-3: Publishing awards XP
- AC-4: Rate limits enforced

**Business Rules Applied:**
- BR-PS-001, BR-PS-006, BR-PS-007

---

### US-PLS-002: Engage With Content

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PLS-002 |
| **Priority** | Medium |
| **Module** | MOD-014 |
| **Source Files** | `src/hooks/queries/usePulseEngagements.ts` |

```text
AS A provider
I WANT TO react to content with fire, gold, save, bookmark
SO THAT I can show appreciation
```

**Acceptance Criteria:**
- AC-1: Fire adds 2 XP to creator
- AC-2: Gold adds 15 XP (requires token)
- AC-3: Save adds 5 XP
- AC-4: Bookmark is private

**Business Rules Applied:**
- BR-PS-002

---

### US-PLS-003: View XP and Level

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PLS-003 |
| **Priority** | Medium |
| **Module** | MOD-015 |
| **Source Files** | `src/hooks/queries/usePulseStats.ts` |

```text
AS A provider
I WANT TO see my XP total and level
SO THAT I can track my progress
```

**Business Rules Applied:**
- BR-PS-003, CALC-005, CALC-006

---

### US-PLS-004: Maintain Daily Streak

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PLS-004 |
| **Priority** | Low |
| **Module** | MOD-015 |
| **Source Files** | `src/constants/pulse.constants.ts` |

```text
AS A provider
I WANT TO maintain my activity streak
SO THAT I get bonus rewards
```

**Business Rules Applied:**
- BR-PS-004, CALC-007

---

## 8. PulseCards User Stories

### US-PC-001: Create PulseCard

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PC-001 |
| **Priority** | Medium |
| **Module** | MOD-016 |
| **Source Files** | `src/hooks/queries/usePulseCards.ts` |

```text
AS A contributor-tier provider
I WANT TO create a PulseCard
SO THAT I can share industry insights
```

**Acceptance Criteria:**
- AC-1: Must have 50+ reputation to start cards
- AC-2: 280 character limit
- AC-3: Topic selection required
- AC-4: Creates initial layer

**Business Rules Applied:**
- BR-PC-001, BR-PC-003

---

### US-PC-002: Add Card Layer

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PC-002 |
| **Priority** | Medium |
| **Module** | MOD-016 |
| **Source Files** | `src/hooks/queries/usePulseCardLayers.ts` |

```text
AS A builder-tier provider
I WANT TO add layers to existing cards
SO THAT I can contribute perspectives
```

**Business Rules Applied:**
- BR-PC-001

---

### US-PC-003: Vote on Layers

| Attribute | Value |
|-----------|-------|
| **User Story ID** | US-PC-003 |
| **Priority** | Low |
| **Module** | MOD-016 |
| **Source Files** | `src/hooks/queries/usePulseCardVotes.ts` |

```text
AS A provider
I WANT TO upvote or downvote layers
SO THAT quality content surfaces
```

**Acceptance Criteria:**
- AC-1: One vote per user per layer
- AC-2: Expert tier gets 2x weight
- AC-3: Vote window is 24 hours

**Business Rules Applied:**
- BR-PC-004, CALC-010

---

## 9. Traceability

| User Story | Business Rules | Validation Rules | Test Cases |
|------------|----------------|------------------|------------|
| US-ENR-001 | BR-REG-001, BR-REG-002 | VR-REG-001 to VR-REG-004 | TC-ENR-001 to TC-ENR-010 |
| US-ENR-004 | BR-LC-001, BR-LC-006, BR-LC-007 | VR-EXP-001 to VR-EXP-005 | TC-LC-006, TC-LC-007 |
| US-ENR-005 | BR-PP-001 to BR-PP-005 | VR-PP-001 to VR-PP-010 | TC-PP-001 to TC-PP-010 |
| US-ENR-006 | BR-LC-001 to BR-LC-003 | - | TC-LC-001 to TC-LC-005 |
| US-ASS-001 | BR-AS-001 to BR-AS-004 | VR-AS-001 to VR-AS-005 | TC-AS-001 to TC-AS-005 |
| US-ASS-002 | BR-AS-006 to BR-AS-008 | - | TC-AS-006 to TC-AS-010 |
| US-CRT-001 | BR-CT-001 to BR-CT-004 | - | TC-CT-001 to TC-CT-010 |
| US-PLS-001 | BR-PS-001, BR-PS-006, BR-PS-007 | VR-PLS-001 to VR-PLS-010 | TC-PS-001 to TC-PS-010 |
| US-PC-001 | BR-PC-001 to BR-PC-003 | VR-PC-001 to VR-PC-005 | TC-PC-001 to TC-PC-010 |

---

**Document End - QA-03**
