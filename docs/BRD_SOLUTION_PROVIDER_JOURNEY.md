# Business Requirements Document: Solution Provider Journey

**Version:** 1.0  
**Date:** January 2026  
**Status:** Approved  
**Audience:** QA Testers, Developers, Product Managers

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Lifecycle Status Model](#2-lifecycle-status-model)
3. [Wizard Steps & Navigation Rules](#3-wizard-steps--navigation-rules)
4. [Step-by-Step Business Rules](#4-step-by-step-business-rules)
5. [Lock Threshold Matrix](#5-lock-threshold-matrix)
6. [Cascade Reset Rules](#6-cascade-reset-rules)
7. [Enrollment Management Rules](#7-enrollment-management-rules)
8. [Error Messages & Codes](#8-error-messages--codes)
9. [Role-Based Permissions](#9-role-based-permissions)
10. [Audit Trail Requirements](#10-audit-trail-requirements)
11. [Test Scenarios Checklist](#11-test-scenarios-checklist)

---

## 1. Executive Summary

### 1.1 System Overview

The Solution Provider Journey is a multi-step enrollment and verification process that transforms an invited candidate into a verified, certified solution provider. The system manages:

- **Profile completion** through a guided wizard
- **Organization verification** with manager approval workflow
- **Competency assessment** via timed examinations
- **Panel interviews** for final verification

### 1.2 Core Entities

| Entity | Description | Key Table |
|--------|-------------|-----------|
| Solution Provider | Individual seeking certification | `solution_providers` |
| Industry Enrollment | Provider's enrollment in a specific industry | `provider_industry_enrollments` |
| Proof Point | Evidence of expertise/experience | `proof_points` |
| Assessment Attempt | Record of assessment examination | `assessment_attempts` |
| Interview Booking | Scheduled panel interview | `interview_bookings` |
| Organization | Employer verification record | `solution_provider_organizations` |

### 1.3 Document Scope

This document covers:
- All 21 lifecycle statuses and transitions
- 8 wizard steps with complete field specifications
- Business rules coded as BR-XXX for traceability
- CRUD operations and their conditions
- Lock mechanisms and cascade behaviors
- Test scenarios for QA validation

---

## 2. Lifecycle Status Model

### 2.1 Complete Status Progression

| Status | Rank | Trigger | Next Status | Description |
|--------|------|---------|-------------|-------------|
| `invited` | 10 | Admin sends invitation | `registered` | Initial invitation sent |
| `registered` | 15 | User completes auth signup | `enrolled` | User account created |
| `enrolled` | 20 | Primary enrollment created | `mode_selected` | First industry enrollment |
| `mode_selected` | 30 | Participation mode selected | `org_info_pending` or `expertise_selected` | Mode determines org requirement |
| `org_info_pending` | 35 | Org info submitted (if required) | `org_validated` | Awaiting manager approval |
| `org_validated` | 40 | Manager approves | `expertise_selected` | Organization verified |
| `expertise_selected` | 50 | Level + areas selected | `profile_building` | Expertise configuration done |
| `profile_building` | 55 | First proof point created | `proof_points_started` | Building profile |
| `proof_points_started` | 60 | Proof point work begun | `proof_points_min_met` | Actively adding evidence |
| `proof_points_min_met` | 70 | 2+ proof points added | `assessment_pending` | Minimum requirement met |
| `assessment_pending` | 90 | Ready for assessment | `assessment_in_progress` | Eligible to start exam |
| `assessment_in_progress` | 100 | Assessment started | `assessment_completed` | **CONFIGURATION LOCKED** |
| `assessment_completed` | 105 | Assessment submitted | `assessment_passed` or retry | Awaiting results |
| `assessment_passed` | 110 | Score ≥ 70% | `panel_scheduled` | Qualified for interview |
| `panel_scheduled` | 120 | Interview booked | `panel_completed` | Interview confirmed |
| `panel_completed` | 130 | Interview conducted | `verified` or `not_verified` | Awaiting panel decision |
| `verified` | 140 | Panel approves | `active` | **EVERYTHING LOCKED** |
| `active` | 145 | Profile activated | `certified` | Active provider |
| `certified` | 150 | Certification issued | - | Fully certified |
| `not_verified` | 160 | Panel rejects | - | Terminal: rejected |
| `suspended` | 200 | Admin suspension | `active` (if reinstated) | Account suspended |
| `inactive` | 210 | Self-deactivation | `active` (if reactivated) | Inactive account |

### 2.2 Terminal States

States with `rank ≥ 140` are considered terminal or near-terminal:
- `verified` (140) - Successfully verified
- `active` (145) - Active provider
- `certified` (150) - Fully certified
- `not_verified` (160) - Rejected
- `suspended` (200) - Suspended
- `inactive` (210) - Inactive

### 2.3 Status Transition Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| STR-001 | Status can only progress forward (higher rank) during normal flow | Service layer |
| STR-002 | Cascade reset moves status backward when config changes | `cascadeResetService.ts` |
| STR-003 | Admin can override status in special cases | Admin portal only |
| STR-004 | `lifecycle_rank` must always match `lifecycle_status` | Database trigger |

---

## 3. Wizard Steps & Navigation Rules

### 3.1 Step Overview

| Step | Name | Route | Visible | Lock Threshold |
|------|------|-------|---------|----------------|
| 1 | Registration | `/enroll/registration` | Always | rank ≥ 100 |
| 2 | Participation Mode | `/enroll/participation-mode` | Always | rank ≥ 100 |
| 3 | Organization | `/enroll/organization` | If mode requires org | rank ≥ 100 |
| 4 | Expertise Selection | `/enroll/expertise-selection` | Always | rank ≥ 100 |
| 5 | Proof Points | `/enroll/proof-points` | Always | rank ≥ 100 |
| 6 | Assessment | `/enroll/assessment` | Always | rank ≥ 100 |
| 7 | Interview Scheduling | `/enroll/interview` | After assessment pass | rank ≥ 120 |
| 8 | Panel Discussion | `/enroll/panel` | After interview scheduled | View only |

### 3.2 Navigation Mode Rules

| Mode | Condition | Behavior |
|------|-----------|----------|
| `edit` | Step not locked, prerequisites met | Full editing allowed |
| `view` | Step locked but accessible | Read-only display |
| `blocked` | Prerequisites not met | Cannot access |

### 3.3 Step Prerequisites

| Step | Prerequisites |
|------|--------------|
| 1 | User authenticated |
| 2 | Registration complete (rank ≥ 20) |
| 3 | Mode selected AND mode.requires_org_info = true |
| 4 | Mode selected AND (org validated OR mode doesn't require org) |
| 5 | Expertise selected (rank ≥ 50) |
| 6 | Proof points minimum met (rank ≥ 70) |
| 7 | Assessment passed (rank ≥ 110) |
| 8 | Interview scheduled (rank ≥ 120) |

### 3.4 Navigation Behavior

```
Forward Navigation:
- "Continue" button advances to next visible step
- Validates current step before proceeding
- Updates lifecycle_status on successful completion

Backward Navigation:
- "Back" button returns to previous visible step
- No validation required
- Data preserved

Direct Navigation:
- Sidebar allows jumping to completed/in-progress steps
- Cannot jump ahead of current progress
- Locked steps show view-only mode
```

---

## 4. Step-by-Step Business Rules

### 4.1 Step 1: Registration

**Route:** `/enroll/registration`  
**Purpose:** Collect provider's personal information  
**Source Files:** `Registration.tsx`, `registration.ts` (validation)

#### Fields

| Field | Type | Required | Validation | Max Length |
|-------|------|----------|------------|------------|
| `first_name` | string | ✅ | Min 1 char | 50 |
| `last_name` | string | ✅ | Min 1 char | 50 |
| `address` | string | ✅ | Min 1 char | 200 |
| `country_id` | UUID | ✅ | Must exist in countries | - |
| `pin_code` | string | ✅ | Country-specific pattern | 20 |
| `industry_segment_id` | UUID | ✅ | Must exist in industry_segments | - |

#### Pin Code Validation Patterns

| Country | Pattern | Example | Error Message |
|---------|---------|---------|---------------|
| IN (India) | `^[1-9][0-9]{5}$` | 400001 | "Indian pin code must be 6 digits and cannot start with 0" |
| US | `^\d{5}(-\d{4})?$` | 12345 or 12345-6789 | "US zip code must be 5 digits or 5+4 format" |
| GB (UK) | `^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$` | SW1A 1AA | "Please enter a valid UK postcode" |
| DEFAULT | `^[A-Za-z0-9\s-]{3,20}$` | Any | "Please enter a valid postal code" |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-REG-001 | Registration creates primary enrollment if none exists | `enrollmentService.ts` |
| BR-REG-002 | Industry segment selection creates `provider_industry_enrollments` record | Service layer |
| BR-REG-003 | Registration fields locked when `lifecycle_rank ≥ 100` | `canModifyField()` |
| BR-REG-004 | Country change requires pin_code revalidation | Form validation |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | Initial registration | `useUpdateProvider` |
| READ | Always | `useProvider` |
| UPDATE | `lifecycle_rank < 100` | `useUpdateProvider` |
| DELETE | Never (soft delete only) | - |

#### Lifecycle Transition

```
On Complete: enrolled (20) → mode_selected (30)
```

---

### 4.2 Step 2: Participation Mode

**Route:** `/enroll/participation-mode`  
**Purpose:** Select how provider will participate  
**Source Files:** `ParticipationMode.tsx`, `useEnrollmentParticipationMode.ts`

#### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `participation_mode_id` | UUID | ✅ | Must exist in participation_modes |

#### Mode Types

| Mode Code | Name | Requires Org Info | Description |
|-----------|------|-------------------|-------------|
| `individual` | Individual | ❌ | Independent consultant |
| `employed` | Employed | ✅ | Working for organization |
| `student` | Student | ❌ | Academic participant |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-MODE-001 | Mode determines Step 3 (Organization) visibility | `wizardNavigationService.ts` |
| BR-MODE-002 | Mode change after org submission blocked if pending/approved | `BlockedModeChangeDialog.tsx` |
| BR-MODE-003 | Mode locked when `lifecycle_rank ≥ 100` | `canModifyField()` |
| BR-MODE-004 | Changing from org-required mode clears organization data | `useClearProviderMode` |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | First selection | `useSetParticipationMode` |
| READ | Always | `useEnrollmentParticipationMode` |
| UPDATE | `lifecycle_rank < 100` AND org not pending/approved | `useSetParticipationMode` |
| DELETE | Never | - |

#### Lifecycle Transition

```
If mode.requires_org_info:
  mode_selected (30) → org_info_pending (35)
Else:
  mode_selected (30) → expertise_selected (50) [after Step 4]
```

---

### 4.3 Step 3: Organization (Conditional)

**Route:** `/enroll/organization`  
**Purpose:** Verify employment through manager approval  
**Source Files:** `Organization.tsx`, `useManagerApproval.ts`

#### Visibility Condition

```
Visible when: participation_mode.requires_org_info === true
```

#### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `org_name` | string | ✅ | Min 2 chars, max 200 |
| `org_type_id` | UUID | ✅ | Must exist in organization_types |
| `org_website` | string | ❌ | Valid URL format |
| `designation` | string | ✅ | Min 2 chars, max 100 |
| `manager_name` | string | ✅ | Min 2 chars, max 100 |
| `manager_email` | string | ✅ | Valid email, different from provider email |
| `manager_phone` | string | ❌ | Valid phone format |

#### Approval Flow States

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| `pending` | Awaiting manager response | Withdraw, Resend |
| `approved` | Manager approved | None (locked) |
| `declined` | Manager declined | Edit & Resubmit |
| `withdrawn` | Provider withdrew request | Edit & Resubmit |
| `expired` | 15 days passed without response | Edit & Resubmit |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-ORG-001 | Manager email cannot match provider email | Form validation |
| BR-ORG-002 | Approval request sends email to manager | `send-manager-credentials` edge function |
| BR-ORG-003 | Pending approval blocks mode changes | `BlockedModeChangeDialog.tsx` |
| BR-ORG-004 | Declined status allows full re-edit | `Organization.tsx` |
| BR-ORG-005 | Org locked when `lifecycle_rank ≥ 100` | `canModifyField()` |
| BR-ORG-006 | Manager has 15 days to respond before expiry | `credentials_expire_at` field |
| BR-ORG-007 | Reminder emails sent at day 7 and day 12 | `send-manager-reminder` edge function |
| BR-ORG-008 | Auto-decline after 15 days expiry | `auto-decline-expired-approvals` edge function |
| BR-ORG-009 | Expired status allows full re-edit | `Organization.tsx` |

#### Manager Portal

| Action | Endpoint | Effect |
|--------|----------|--------|
| Approve | `/manager/approve/:token` | Sets `approval_status = 'approved'` |
| Decline | `/manager/decline/:token` | Sets `approval_status = 'declined'`, requires reason |
| Login | `/manager/:token` | Validates temp password |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | First submission | `useSubmitOrgApproval` |
| READ | Always | `useManagerApproval` |
| UPDATE | Status = declined/withdrawn AND rank < 100 | `useSubmitOrgApproval` |
| WITHDRAW | Status = pending | `useCancelOrgApproval` |

#### Lifecycle Transition

```
On Approval: org_info_pending (35) → org_validated (40)
On Decline: Stays at org_info_pending (35)
```

---

### 4.4 Step 4: Expertise Selection

**Route:** `/enroll/expertise-selection`  
**Purpose:** Select expertise level, proficiency areas, and specialities  
**Source Files:** `ExpertiseSelection.tsx`, `useEnrollmentExpertise.ts`

#### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `expertise_level_id` | UUID | ✅ | Must exist in expertise_levels |
| `proficiency_areas` | UUID[] | ✅ | At least 1, filtered by industry+level |
| `specialities` | UUID[] | ✅ | At least 1, filtered by level_speciality_map |

#### Expertise Level Structure

| Level | Name | Min Years | Max Years | Description |
|-------|------|-----------|-----------|-------------|
| 1 | Entry Level | 0 | 2 | Just starting career |
| 2 | Mid Level | 2 | 5 | Some experience |
| 3 | Senior Level | 5 | 10 | Significant experience |
| 4 | Expert Level | 10 | null | Deep expertise |

#### Hierarchy Filtering

```
Proficiency Areas filtered by:
  - industry_segment_id (from enrollment)
  - expertise_level_id (selected)

Specialities filtered by:
  - level_speciality_map (expertise_level_id)
  - Available for selected proficiency areas
```

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-EXP-001 | Must select at least 1 proficiency area | Form validation |
| BR-EXP-002 | Must select at least 1 speciality | Form validation |
| BR-EXP-003 | Expertise locked when `lifecycle_rank ≥ 100` | `canModifyField()` |
| BR-EXP-004 | Level change triggers speciality reset | `cascadeResetService.ts` |
| BR-EXP-005 | Industry change triggers full expertise reset | `cascadeResetService.ts` |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | First selection | `useSaveEnrollmentExpertise` |
| READ | Always | `useEnrollmentExpertise` |
| UPDATE | `lifecycle_rank < 100` | `useSaveEnrollmentExpertise` |
| DELETE | Never (cascade only) | - |

#### Lifecycle Transition

```
On Complete: org_validated (40) or mode_selected (30) → expertise_selected (50)
```

---

### 4.5 Step 5: Proof Points

**Route:** `/enroll/proof-points`  
**Purpose:** Document evidence of expertise and experience  
**Source Files:** `ProofPoints.tsx`, `AddProofPoint.tsx`, `useProofPoints.ts`

#### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | ✅ | 5-200 chars |
| `description` | string | ✅ | 20-2000 chars |
| `type` | enum | ✅ | See type values |
| `category` | enum | ✅ | See category values |
| `speciality_id` | UUID | ❌ | If category = 'speciality' |
| `supporting_links` | array | ❌ | Valid URLs |
| `supporting_files` | array | ❌ | Max 5 files, 10MB each |

#### Proof Point Types

| Type | Description |
|------|-------------|
| `project` | Completed project work |
| `certification` | Professional certification |
| `publication` | Published work |
| `patent` | Registered patent |
| `award` | Industry recognition |
| `experience` | Work experience |

#### Proof Point Categories

| Category | Description | Speciality Required |
|----------|-------------|---------------------|
| `general` | General expertise | ❌ |
| `speciality` | Speciality-specific | ✅ |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-PP-001 | Minimum 2 proof points required for assessment eligibility | `assessmentService.canStartAssessment()` |
| BR-PP-002 | Speciality proof points require valid speciality_id | Form validation |
| BR-PP-003 | Proof points locked when `lifecycle_rank ≥ 100` | `canModifyField()` |
| BR-PP-004 | Deleted proof points use soft delete | `is_deleted = true` |
| BR-PP-005 | Files stored in Supabase storage bucket | `proof-point-files` bucket |
| BR-PP-006 | Speciality proof points converted to general on expertise change | `cascadeResetService.ts` |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | `lifecycle_rank < 100` | `useCreateProofPoint` |
| READ | Always | `useProofPoints` |
| UPDATE | `lifecycle_rank < 100` | `useUpdateProofPoint` |
| DELETE | `lifecycle_rank < 100` | `useDeleteProofPoint` (soft) |

#### Lifecycle Transition

```
First proof point: expertise_selected (50) → profile_building (55)
Subsequent: profile_building (55) → proof_points_started (60)
2+ proof points: proof_points_started (60) → proof_points_min_met (70)
```

---

### 4.6 Step 6: Assessment

**Route:** `/enroll/assessment`  
**Purpose:** Evaluate provider knowledge through examination  
**Source Files:** `Assessment.tsx`, `TakeAssessment.tsx`, `assessmentService.ts`

#### Assessment Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Time Limit | 60 minutes | `ASSESSMENT_DEFAULTS.timeLimitMinutes` |
| Passing Score | 70% | `ASSESSMENT_DEFAULTS.passingScorePercentage` |
| Total Questions | 20 | `ASSESSMENT_DEFAULTS.totalQuestions` |
| Questions per Area | Balanced | `questionGenerationService.ts` |

#### Eligibility Requirements

| Requirement | Check | Error if Failed |
|-------------|-------|-----------------|
| Lifecycle status | `rank ≥ 90` | "Complete profile first" |
| Proof points | Count ≥ 2 | "Add at least 2 proof points" |
| No active attempt | `submitted_at IS NULL` | "Assessment already in progress" |
| Within attempt limit | Attempts < 3 | "Maximum attempts reached" |
| Cooling-off period | Last attempt > 90 days ago (if failed 3x) | "Please wait X days" |

#### Retake Policy

| Scenario | Rule |
|----------|------|
| Max attempts per window | 3 |
| Window duration | 90 days |
| Cooling-off after 3 fails | 90 days |
| Attempt counter reset | After cooling-off |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-ASM-001 | Starting assessment locks configuration | Status → `assessment_in_progress` (100) |
| BR-ASM-002 | Timer starts on assessment start | `started_at` timestamp |
| BR-ASM-003 | Auto-submit when time expires | Frontend timer + backend validation |
| BR-ASM-004 | Cannot change answers after submission | `submitted_at` locks attempt |
| BR-ASM-005 | Score calculated from correct answers | `score_percentage = (correct/total) * 100` |
| BR-ASM-006 | Pass/fail determined by threshold | `is_passed = score >= 70` |
| BR-ASM-007 | Questions selected to avoid repeats | `question_exposure_log` checked |

#### Question Generation Rules

| Rule | Description |
|------|-------------|
| Balance by area | Equal questions per proficiency area |
| Difficulty mix | Easy (30%), Medium (50%), Hard (20%) |
| Avoid repeats | Exclude previously exposed questions |
| Active only | `is_active = true` |
| Usage mode | `usage_mode IN ('assessment', 'both')` |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| START | Eligibility met | `useStartAssessment` |
| READ | Always | `useActiveAssessmentAttempt` |
| ANSWER | Attempt active, not submitted | `useSaveAssessmentResponse` |
| SUBMIT | Attempt active | `useSubmitAssessment` |

#### Lifecycle Transition

```
On Start: assessment_pending (90) → assessment_in_progress (100)
On Submit: assessment_in_progress (100) → assessment_completed (105)
On Pass: assessment_completed (105) → assessment_passed (110)
On Fail: assessment_completed (105) → assessment_pending (90) [if retries available]
```

---

### 4.7 Step 7: Interview Scheduling

**Route:** `/enroll/interview`  
**Purpose:** Schedule panel interview with reviewers  
**Source Files:** `InterviewScheduling.tsx`, `useInterviewScheduling.ts`

#### Visibility Condition

```
Visible when: lifecycle_rank >= 110 (assessment_passed)
```

#### Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `composite_slot_id` | UUID | ✅ | Valid available slot |
| `scheduled_at` | timestamp | ✅ | From selected slot |
| `notes` | string | ❌ | Max 500 chars |

#### Slot Requirements

| Requirement | Description |
|-------------|-------------|
| Quorum met | Slot has required number of reviewers |
| Industry match | Slot matches enrollment industry |
| Level match | Slot matches expertise level |
| Future date | At least 24 hours ahead |

#### Reschedule/Cancel Rules

| Parameter | Value | Source |
|-----------|-------|--------|
| Max reschedules | 2 | `RESCHEDULE_CONFIG.maxReschedules` |
| Cancel cutoff | 24 hours | `RESCHEDULE_CONFIG.cutoffHours` |
| System lock check | Required | `rescheduleService.ts` |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-INT-001 | Slot must meet quorum requirements | `useInterviewScheduling.ts` |
| BR-INT-002 | Cannot book if existing active booking | Service validation |
| BR-INT-003 | Reschedule increments counter | `reschedule_count` field |
| BR-INT-004 | Cancel blocked within 24 hours | `canReschedule()` check |
| BR-INT-005 | Reschedule blocked after 2 reschedules | `canReschedule()` check |
| BR-INT-006 | Reviewer notification on booking | `notify-booking-cancelled` edge function |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| CREATE | No active booking, passed assessment | `useBookInterview` |
| READ | Always | `useExistingBooking` |
| RESCHEDULE | Count < 2, > 24h before | `useRescheduleBooking` |
| CANCEL | > 24h before | `useCancelBooking` |

#### Lifecycle Transition

```
On Book: assessment_passed (110) → panel_scheduled (120)
On Cancel: panel_scheduled (120) → assessment_passed (110)
```

---

### 4.8 Step 8: Panel Discussion

**Route:** `/enroll/panel`  
**Purpose:** Display interview status and outcome  
**Source Files:** `PanelDiscussion.tsx`

#### Visibility Condition

```
Visible when: lifecycle_rank >= 120 (panel_scheduled)
```

#### Display States

| State | Display |
|-------|---------|
| `panel_scheduled` | Interview date, time, joining info |
| `panel_completed` | Awaiting decision message |
| `verified` | Congratulations, next steps |
| `not_verified` | Outcome explanation |

#### Business Rules

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-PNL-001 | View-only for providers | No edit actions |
| BR-PNL-002 | Panel decision made by reviewers only | Reviewer portal |
| BR-PNL-003 | Verification updates lifecycle to terminal state | Admin/reviewer action |

#### CRUD Operations

| Operation | Allowed When | API/Hook |
|-----------|--------------|----------|
| READ | Always | `useExistingBooking` |

#### Lifecycle Transition

```
By Reviewer: panel_scheduled (120) → panel_completed (130)
On Verify: panel_completed (130) → verified (140)
On Reject: panel_completed (130) → not_verified (160)
```

---

## 5. Lock Threshold Matrix

### 5.1 Threshold Definitions

| Threshold | Rank | Status | Description |
|-----------|------|--------|-------------|
| CONFIGURATION | 100 | `assessment_in_progress` | Industry, level, specialities locked |
| CONTENT | 100 | `assessment_in_progress` | Registration, mode, org, proof points locked |
| EVERYTHING | 140 | `verified` | All fields frozen |

### 5.2 Field Lock Matrix

| Field Category | Fields | Lock at Rank |
|----------------|--------|--------------|
| Registration | first_name, last_name, address, country_id, pin_code | 100 |
| Configuration | industry_segment_id, expertise_level_id, proficiency_areas, specialities | 100 |
| Content | proof_points (create/update/delete) | 100 |
| Mode | participation_mode_id | 100 |
| Organization | All org fields | 100 |
| Assessment | Cannot retake after pass | 110 |
| Interview | Cannot reschedule after limit | Per booking rules |

### 5.3 Lock Check API

```typescript
// Usage in components
import { canModifyField } from '@/services/lifecycleService';

const result = canModifyField(enrollment.lifecycle_rank, 'content');
// Returns: { allowed: boolean, reason?: string }
```

---

## 6. Cascade Reset Rules

### 6.1 Industry Segment Change

**Trigger:** Changing `industry_segment_id` on enrollment

**Impact:**

| Data | Action |
|------|--------|
| Expertise Level | Reset to null |
| Proficiency Areas | Delete all for enrollment |
| Specialities | Delete all for enrollment |
| Proof Points (speciality) | Convert to general OR delete |
| Assessment Attempts | Delete all for enrollment |

**Lifecycle Reset:** → `enrolled` (20)

### 6.2 Expertise Level Change

**Trigger:** Changing `expertise_level_id` on enrollment

**Impact:**

| Data | Action |
|------|--------|
| Proficiency Areas | Keep (filtered display) |
| Specialities | Delete all for enrollment |
| Proof Points (speciality) | Convert to general |

**Lifecycle Reset:** → `expertise_selected` (50)

### 6.3 Cascade Warning Dialog

When cascade would affect data, show warning:

```
Are you sure you want to change your industry/expertise?

This will reset the following:
- 3 proficiency area selections
- 5 speciality selections  
- 2 speciality-specific proof points (will become general)
- 1 assessment attempt

This action cannot be undone.

[Cancel] [Confirm Change]
```

---

## 7. Enrollment Management Rules

### 7.1 Multi-Industry Enrollment

| Rule | Description |
|------|-------------|
| Primary enrollment | First enrollment is marked `is_primary = true` |
| Additional enrollments | Created via "Add Industry" flow |
| Enrollment switching | Context preserved per enrollment |
| Independent progress | Each enrollment has own lifecycle |

### 7.2 Enrollment Deletion Rules

| Condition | Can Delete |
|-----------|------------|
| Is primary AND only enrollment | ❌ No |
| Has `assessment_in_progress` | ❌ No |
| Has active interview booking | ❌ No |
| Is secondary enrollment | ✅ Yes |

### 7.3 Cascade on Enrollment Delete

| Data | Action |
|------|--------|
| Proof Points | Soft delete (`is_deleted = true`) |
| Proficiency Areas | Hard delete |
| Specialities | Hard delete |
| Assessment Attempts | Hard delete |
| Interview Bookings | Cancel + delete |

---

## 8. Error Messages & Codes

### 8.1 Validation Errors

| Code | Field | Message |
|------|-------|---------|
| VAL-001 | first_name | "First name is required" |
| VAL-002 | first_name | "First name must be 50 characters or less" |
| VAL-003 | pin_code | "Indian pin code must be 6 digits and cannot start with 0" |
| VAL-004 | manager_email | "Manager email cannot be the same as your email" |
| VAL-005 | proof_point.title | "Title must be between 5 and 200 characters" |
| VAL-006 | proof_point.description | "Description must be between 20 and 2000 characters" |

### 8.2 Business Rule Errors

| Code | Rule | Message |
|------|------|---------|
| BRE-001 | Locked field | "This field cannot be modified at your current stage" |
| BRE-002 | Min proof points | "Add at least 2 proof points before starting assessment" |
| BRE-003 | Max attempts | "You have reached the maximum number of assessment attempts" |
| BRE-004 | Cooling off | "Please wait {X} days before retaking the assessment" |
| BRE-005 | Reschedule limit | "You have reached the maximum number of reschedules" |
| BRE-006 | Cancel cutoff | "Cannot cancel within 24 hours of scheduled time" |
| BRE-007 | Org pending | "Cannot change participation mode while organization approval is pending" |
| BRE-008 | No slot | "No interview slots available for your criteria" |

### 8.3 System Errors

| Code | Type | Message |
|------|------|---------|
| SYS-001 | Network | "Connection failed. Please check your internet and try again" |
| SYS-002 | Auth | "Your session has expired. Please log in again" |
| SYS-003 | Permission | "You do not have permission to perform this action" |
| SYS-004 | Not found | "The requested resource could not be found" |

---

## 9. Role-Based Permissions

### 9.1 Solution Provider

| Action | Before Lock (rank < 100) | After Lock (rank ≥ 100) |
|--------|--------------------------|-------------------------|
| Edit registration | ✅ | ❌ |
| Change mode | ✅ (if no pending org) | ❌ |
| Edit organization | ✅ (if declined/withdrawn) | ❌ |
| Select expertise | ✅ | ❌ |
| Add proof points | ✅ | ❌ |
| Take assessment | ✅ (if eligible) | ❌ (already taken) |
| Schedule interview | ✅ (if passed) | Per rules |
| View all steps | ✅ | ✅ |

### 9.2 Admin

| Action | Permission |
|--------|------------|
| View all providers | ✅ |
| Override lifecycle status | ✅ |
| Manage invitations | ✅ |
| Configure master data | ✅ |
| View assessment results | ✅ |
| Cannot take assessment | ❌ |

### 9.3 Panel Reviewer

| Action | Permission |
|--------|------------|
| Set availability | ✅ |
| View assigned interviews | ✅ |
| Record panel decision | ✅ |
| View provider profiles | ✅ (assigned only) |
| Modify provider data | ❌ |

---

## 10. Audit Trail Requirements

### 10.1 Mandatory Audit Fields

| Field | Purpose | Auto-populated |
|-------|---------|----------------|
| `created_at` | Record creation timestamp | ✅ (DB default) |
| `created_by` | User who created | Service layer |
| `updated_at` | Last modification timestamp | ✅ (trigger) |
| `updated_by` | User who last modified | Service layer |

### 10.2 Soft Delete Fields

| Field | Purpose |
|-------|---------|
| `is_deleted` | Deletion flag |
| `deleted_at` | Deletion timestamp |
| `deleted_by` | User who deleted |

### 10.3 Critical Audit Events

| Event | Logged Data |
|-------|-------------|
| Lifecycle transition | Old status, new status, trigger |
| Assessment start | Attempt ID, provider ID, timestamp |
| Assessment submit | Score, pass/fail, duration |
| Interview booking | Slot ID, provider ID, reviewers |
| Organization approval/decline | Manager email, decision, reason |
| Cascade reset | Affected data counts, trigger field |

---

## 11. Test Scenarios Checklist

### 11.1 Happy Path Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-HP-001 | Complete registration with valid data | Status → enrolled |
| TC-HP-002 | Select individual mode (no org required) | Skip to Step 4 |
| TC-HP-003 | Select employed mode → submit org → get approved | Status → org_validated |
| TC-HP-004 | Select expertise level and areas | Status → expertise_selected |
| TC-HP-005 | Add 2 proof points | Status → proof_points_min_met |
| TC-HP-006 | Start and pass assessment (≥70%) | Status → assessment_passed |
| TC-HP-007 | Book interview slot | Status → panel_scheduled |
| TC-HP-008 | Complete journey to verified | Status → verified |

### 11.2 Boundary Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-BND-001 | First name exactly 50 chars | ✅ Accepted |
| TC-BND-002 | First name 51 chars | ❌ Validation error |
| TC-BND-003 | Pin code with leading 0 (India) | ❌ Validation error |
| TC-BND-004 | Proof point title exactly 5 chars | ✅ Accepted |
| TC-BND-005 | Proof point title 4 chars | ❌ Validation error |
| TC-BND-006 | Assessment score exactly 70% | ✅ Pass |
| TC-BND-007 | Assessment score 69% | ❌ Fail |
| TC-BND-008 | Cancel interview at 23:59 before (just under 24h) | ❌ Blocked |
| TC-BND-009 | Cancel interview at 24:01 before (just over 24h) | ✅ Allowed |
| TC-BND-010 | 3rd assessment attempt | ✅ Allowed |
| TC-BND-011 | 4th assessment attempt (same window) | ❌ Blocked |

### 11.3 Lock State Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-LOCK-001 | Edit registration at rank 99 | ✅ Allowed |
| TC-LOCK-002 | Edit registration at rank 100 | ❌ Locked |
| TC-LOCK-003 | Add proof point at rank 99 | ✅ Allowed |
| TC-LOCK-004 | Add proof point at rank 100 | ❌ Locked |
| TC-LOCK-005 | Change industry at rank 100 | ❌ Locked |

### 11.4 Cascade Reset Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-CAS-001 | Change industry with 2 proof points | Proof points converted to general |
| TC-CAS-002 | Change expertise level with specialities | Specialities deleted |
| TC-CAS-003 | Change industry with assessment attempt | Assessment deleted, status reset |

### 11.5 Organization Approval Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-ORG-001 | Submit org info with valid manager email | Status → pending |
| TC-ORG-002 | Manager approves via portal | Status → approved, lifecycle advances |
| TC-ORG-003 | Manager declines via portal | Status → declined, can re-edit |
| TC-ORG-004 | Provider withdraws pending request | Status → withdrawn, can re-edit |
| TC-ORG-005 | Try to change mode while pending | ❌ Blocked dialog shown |

### 11.6 Assessment Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-ASM-001 | Start assessment with 1 proof point | ❌ Blocked |
| TC-ASM-002 | Start assessment with 2 proof points | ✅ Assessment starts |
| TC-ASM-003 | Let timer expire | Auto-submit triggered |
| TC-ASM-004 | Submit before time expires | Manual submit works |
| TC-ASM-005 | Fail assessment, retry | Attempt count = 2 |
| TC-ASM-006 | Fail 3 times, wait 89 days | ❌ Still in cooling-off |
| TC-ASM-007 | Fail 3 times, wait 91 days | ✅ Can retry |
| TC-ASM-008 | Pass assessment | Cannot retake |

### 11.7 Interview Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-INT-001 | Book first available slot | Booking created |
| TC-INT-002 | Reschedule once | reschedule_count = 1, uses useRescheduleBooking mutation |
| TC-INT-003 | Reschedule twice | reschedule_count = 2 |
| TC-INT-004 | Try 3rd reschedule | ❌ Blocked |
| TC-INT-005 | Cancel > 24h before | ✅ Cancelled |
| TC-INT-006 | Cancel < 24h before | ❌ Blocked |

### 11.8 Manager Approval Tests

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| TC-MGR-001 | Submit org approval | Email sent to manager |
| TC-MGR-002 | Manager approves | Status = approved, provider can continue |
| TC-MGR-003 | Manager declines | Status = declined, provider can edit & resubmit |
| TC-MGR-004 | Day 7 reminder | Reminder email sent |
| TC-MGR-005 | Day 12 reminder | Urgent reminder email sent |
| TC-MGR-006 | Day 15+ expiry | Status = expired, provider notified, can resubmit |
| TC-MGR-007 | Withdraw pending request | Status = withdrawn, can edit & resubmit |

---

## Appendix A: Source File Reference

| Area | Key Files |
|------|-----------|
| Lifecycle | `lifecycle.constants.ts`, `lifecycleService.ts` |
| Navigation | `wizardNavigationService.ts`, `OnboardingGuard.tsx` |
| Registration | `Registration.tsx`, `registration.ts` |
| Mode | `ParticipationMode.tsx`, `useEnrollmentParticipationMode.ts` |
| Organization | `Organization.tsx`, `useManagerApproval.ts` |
| Organization Edge Functions | `send-manager-credentials`, `send-manager-reminder`, `auto-decline-expired-approvals` |
| Expertise | `ExpertiseSelection.tsx`, `useEnrollmentExpertise.ts` |
| Proof Points | `ProofPoints.tsx`, `useProofPoints.ts` |
| Assessment | `assessmentService.ts`, `TakeAssessment.tsx` |
| Interview | `InterviewScheduling.tsx`, `rescheduleService.ts`, `useRescheduleBooking` |
| Cascade | `cascadeResetService.ts` |

---

## Appendix B: Database Tables Reference

| Table | Purpose |
|-------|---------|
| `solution_providers` | Core provider profile |
| `provider_industry_enrollments` | Industry-specific enrollment |
| `proof_points` | Evidence of expertise |
| `proof_point_files` | Uploaded evidence files |
| `proof_point_links` | External evidence links |
| `proof_point_speciality_tags` | Speciality associations |
| `assessment_attempts` | Assessment records |
| `assessment_attempt_responses` | Question responses |
| `interview_bookings` | Panel interviews |
| `solution_provider_organizations` | Organization verification |

---

*Document End*
