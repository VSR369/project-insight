
# Business Requirements Document: Solution Provider Lifecycle

## Document Information
| Attribute | Value |
|-----------|-------|
| **Document ID** | BRD-SP-LIFECYCLE-2026 |
| **Version** | 1.0.0 |
| **Date** | February 3, 2026 |
| **Status** | Final |
| **Classification** | Internal - Policy Reference |

---

# SECTION 1: ENROLLMENT TO CERTIFICATION

## 1.1 Overview

The Solution Provider lifecycle encompasses a 9-step wizard-based enrollment process, progressing from initial registration through knowledge assessment, panel interview, and final certification. Each stage is governed by lifecycle ranks (10–210) that determine allowed actions and data modification constraints.

---

## 1.2 Lifecycle Status Reference

| Status | Rank | Description | Wizard Step |
|--------|------|-------------|-------------|
| invited | 10 | Invitation sent, not yet registered | Pre-enrollment |
| registered | 15 | Account created, awaiting profile | Step 1 |
| enrolled | 20 | Basic info submitted | Step 1 |
| mode_selected | 30 | Participation mode chosen | Step 2 |
| org_info_pending | 35 | Organization info submitted | Step 3 |
| org_validated | 40 | Organization verified | Step 3 |
| expertise_selected | 50 | Expertise level chosen | Step 4 |
| profile_building | 55 | Adding proof points | Step 5 |
| proof_points_started | 60 | First proof point added | Step 5 |
| proof_points_min_met | 70 | Minimum proof points achieved | Step 5 |
| assessment_pending | 90 | Ready to start assessment | Step 6 |
| assessment_in_progress | 100 | Assessment in progress | Step 6 |
| assessment_completed | 105 | Assessment submitted (not passed) | Step 6 |
| assessment_passed | 110 | Passed with ≥70% | Step 6 |
| panel_scheduled | 120 | Interview booked | Step 7 |
| panel_completed | 130 | Interview completed | Step 8 |
| active | 135 | Actively engaged | Post-Step 8 |
| certified | 140 | Certification achieved | Step 9 |
| interview_unsuccessful | 150 | Composite score <51% | Step 9 |
| suspended | 200 | Account suspended | Administrative |
| inactive | 210 | Account deactivated | Administrative |

---

## 1.3 Registration & Enrollment Entry Points

### 1.3.1 Registration Modes

| Mode | Description | Initial Status |
|------|-------------|----------------|
| self_registered | Provider registers independently via public portal | registered (rank 15) |
| invitation | Provider invited via email/token | invited (rank 10), then registered upon acceptance |

### 1.3.2 Invitation Types (for invitation mode)

| Type | Description | Verification Bypass |
|------|-------------|---------------------|
| standard | Normal invitation with full verification required | No |
| vip_expert | Pre-vetted expert invitation | Yes (verification_status = NULL) |

### 1.3.3 Registration Requirements

**Mandatory Fields:**
- first_name (1-50 characters)
- last_name (1-50 characters)
- email (unique, valid format)
- password (minimum 8 characters)

**Upon Successful Registration:**
- User account created in authentication system
- solution_provider record created
- lifecycle_status set to 'registered' (rank 15)
- Provider redirected to Step 1 (Registration Details)

---

## 1.4 Enrollment Wizard Steps (1-9)

### Step 1: Registration Details (rank 15 → 20)

**Purpose:** Collect personal and location information

**Required Fields:**
| Field | Type | Validation |
|-------|------|------------|
| first_name | string | Required, 1-50 chars |
| last_name | string | Required, 1-50 chars |
| address | string | Required, 1-200 chars |
| pin_code | string | Country-specific pattern |
| country_id | UUID | Required, valid reference |
| industry_segment_id | UUID | Required, valid reference |

**Lock Condition:** Rank ≥ 100 (assessment start)

---

### Step 2: Participation Mode (rank 30)

**Purpose:** Define how provider will participate

**Options:**
- Individual Professional
- Firm/Company Representative
- Student/Academic

**Lock Condition:** Rank ≥ 100

---

### Step 3: Organization (rank 35 → 40)

**Purpose:** Collect and validate organization information

**States:**
- org_info_pending (rank 35): Information submitted, awaiting validation
- org_validated (rank 40): Organization verified

**Lock Condition:** Rank ≥ 100

---

### Step 4: Expertise Selection (rank 50)

**Purpose:** Select expertise level and proficiency areas

**Components:**
1. **Expertise Level:** User selects from available levels (e.g., Associate, Professional, Expert)
2. **Proficiency Areas:** User selects areas relevant to their industry and level

**Auto-Derivation:**
- Specialities are auto-derived from the selected expertise level and proficiency areas via `level_speciality_map`
- No manual speciality selection required

**Lock Condition:** Rank ≥ 100

---

### Step 5: Proof Points (rank 55 → 70)

**Purpose:** Submit evidence of claimed expertise

**Minimum Requirement:** 2 proof points (configurable via system_settings)

**Lifecycle Transitions:**
| Condition | Status | Rank |
|-----------|--------|------|
| First proof point added | proof_points_started | 60 |
| Minimum met | proof_points_min_met | 70 |
| Below minimum (regression) | proof_points_started | 60 |

**Proof Point Categories:**
- General (applies to overall expertise)
- Specialty-specific (linked to specific specialities via tags)

**Lock Condition:** Rank ≥ 100

---

### Step 6: Assessment (rank 90 → 110)

**Purpose:** Knowledge assessment to validate expertise claims

**Prerequisites:**
- Minimum proof points met (rank ≥ 70)
- No active assessment in progress
- Rank < 100

**Assessment Configuration:**
| Parameter | Value |
|-----------|-------|
| Time Limit | 60 minutes |
| Questions | 20 |
| Passing Score | 70% |
| Question Source | Question bank filtered by industry, level, and proficiency areas |

**Question Generation Rules:**
- Questions filtered by provider's explicit proficiency area selections
- Area-First balancing algorithm distributes quota evenly across selected areas
- System must fail with error if any area lacks sufficient unexposed questions

**Lifecycle on Start:**
- Status: assessment_in_progress (rank 100)
- **CRITICAL:** Rank 100 triggers configuration and content locks

**Lifecycle on Submit:**
| Result | Status | Rank |
|--------|--------|------|
| Score ≥ 70% | assessment_passed | 110 |
| Score < 70% | assessment_completed | 105 |

**Lock Condition:** Rank ≥ 110 (assessment passed)

---

### Step 7: Interview Scheduling (rank 120)

**Purpose:** Schedule panel interview with reviewers

**Prerequisites:**
- Assessment passed (rank ≥ 110)
- No existing active booking

**Quorum Requirement:** 2 reviewers (configurable per expertise level)

**Reviewer Selection:**
- Pool ≤15: Load-balanced (fewer interviews first)
- Pool 16-50: Weighted score (60% load + 40% recency)
- Pool >50: Bucketed selection (Low/Medium/High load)

**Lock Condition:** Rank ≥ 130 (panel completed)

---

### Step 8: Panel Discussion (rank 130)

**Purpose:** Conduct interview and reviewer evaluation

**Evaluation Components:**
- Proof point review and scoring (0-10 scale)
- Interview scoring (0-10 scale)
- Submission locks further modifications

**Lock Condition:** Rank ≥ 140

---

### Step 9: Certification (rank 140+)

**Purpose:** Final certification outcome determination

**Composite Score Calculation:**
```text
Composite = (ProofPointsPercent × 30%) + (AssessmentPercent × 50%) + (InterviewPercent × 20%)

Where:
  ProofPointsPercent = (proofPointsScore / 10) × 100
  InterviewPercent = (interviewScore / 10) × 100
  AssessmentPercent = as-is (already 0-100)
```

**Certification Outcomes:**
| Score Range | Outcome | Stars | Level |
|-------------|---------|-------|-------|
| < 51.0% | Interview Unsuccessful | 0 | None |
| 51.0% - 65.9% | Certified | 1 | Basic |
| 66.0% - 85.9% | Certified | 2 | Competent |
| ≥ 86.0% | Certified | 3 | Expert |

---

## 1.5 Lock Rules & Constraints During Enrollment

### 1.5.1 Lock Thresholds

| Lock Level | Rank Threshold | Affected Fields |
|------------|----------------|-----------------|
| CONFIGURATION | ≥ 100 | industry_segment_id, expertise_level_id, proficiency_areas, specialities |
| CONTENT | ≥ 100 | first_name, last_name, address, country_id, pin_code, proof_points |
| EVERYTHING | ≥ 140 | All fields frozen |

### 1.5.2 Allowed Actions by Stage (During Enrollment)

| Stage | Add/Edit Registration | Change Industry | Change Expertise | Add Proof Points | Start Assessment | Schedule Interview |
|-------|----------------------|-----------------|------------------|-----------------|-----------------|-------------------|
| registered (15) | ✅ | ✅ | N/A | N/A | ❌ | ❌ |
| enrolled (20) | ✅ | ✅ | N/A | N/A | ❌ | ❌ |
| mode_selected (30) | ✅ | ✅ | ✅ | N/A | ❌ | ❌ |
| expertise_selected (50) | ✅ | ✅* | ✅* | ✅ | ❌ | ❌ |
| proof_points_min_met (70) | ✅ | ✅* | ✅* | ✅ | ✅ | ❌ |
| assessment_in_progress (100) | ❌ | ❌ | ❌ | ❌ | In progress | ❌ |
| assessment_passed (110) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| panel_scheduled (120) | ❌ | ❌ | ❌ | ❌ | ❌ | View only |
| panel_completed (130) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Denotes cascade impact (see 1.6)

### 1.5.3 Wizard Step Lock Summary

| Step | Name | Lock Condition |
|------|------|----------------|
| 1 | Registration | Rank ≥ 100 |
| 2 | Participation Mode | Rank ≥ 100 |
| 3 | Organization | Rank ≥ 100 |
| 4 | Expertise Level | Rank ≥ 100 |
| 5 | Proof Points | Rank ≥ 100 |
| 6 | Assessment | Rank ≥ 110 |
| 7 | Interview Slot | Rank ≥ 120 |
| 8 | Panel Discussion | Rank ≥ 130 |
| 9 | Certification | Rank ≥ 140 |

---

## 1.6 Cascade Impact Rules (Before Assessment Lock)

When providers modify key fields before assessment lock (rank < 100), cascade effects may apply:

### 1.6.1 Industry Segment Change

| Trigger | Impact | Reset To |
|---------|--------|----------|
| Change industry_segment_id when expertise selected | HARD RESET | enrolled (rank 20) |

**Effects:**
- Deletes specialty-specific proof points
- Deletes all speciality selections
- Clears proficiency area selections
- Resets lifecycle to 'enrolled'

**Warning Level:** Critical

---

### 1.6.2 Expertise Level Change

| Trigger | Impact | Reset To |
|---------|--------|----------|
| Change expertise_level_id with specialty proof points | PARTIAL RESET | expertise_selected (rank 50) |
| Change expertise_level_id without specialty proof points | PARTIAL RESET | expertise_selected (rank 50) |

**Effects:**
- Deletes specialty-specific proof points (if present)
- Clears speciality selections
- Clears proficiency area selections
- General proof points retained
- Resets lifecycle to 'expertise_selected'

**Warning Level:** Warning

---

## 1.7 Multi-Industry Enrollment Support

### 1.7.1 Enrollment-Centric Architecture

- A single Solution Provider can have multiple independent enrollments across different industry segments
- Each enrollment progresses independently through the lifecycle
- Lifecycle governance uses the active enrollment's `lifecycle_rank` as source of truth

### 1.7.2 Enrollment Constraints

| Rule | Description |
|------|-------------|
| Industry Lock | Industry segment cannot be changed once assessment starts (rank ≥ 100) |
| Primary Enrollment | Primary enrollment cannot be deleted |
| Cross-Enrollment | Proof points are enrollment-scoped |

---

# SECTION 2: POST-CERTIFICATION SCENARIOS

## 2.1 Overview

Post-certification scenarios address two distinct pathways:
1. **Successful Certification (rank 140):** Provider achieved composite score ≥ 51%
2. **Interview Unsuccessful (rank 150):** Provider achieved composite score < 51%

Each pathway has specific allowed actions, constraints, and re-attempt options.

---

## 2.2 Successful Certification (Status: certified, Rank: 140)

### 2.2.1 Terminal State Characteristics

| Characteristic | Value |
|----------------|-------|
| Profile Frozen | Yes - all modifications blocked |
| Data Visibility | Full visibility to platform |
| Industry Pulse Access | Full access granted |
| Re-enrollment | Can create new enrollment for different industry |

### 2.2.2 Allowed Actions for Certified Providers

| Action | Allowed | Notes |
|--------|---------|-------|
| View enrollment data | ✅ | Read-only access |
| Edit registration info | ❌ | Frozen at rank 140 |
| Change industry segment | ❌ | Never allowed for existing enrollment |
| Change expertise level | ✅* | Via Expertise Upgrade pathway |
| Add proof points | ❌ | Frozen at rank 140 |
| Access Industry Pulse | ✅ | Full social platform access |
| Create new enrollment | ✅ | For different industry segment |

*Requires initiating Expertise Upgrade process

---

### 2.2.3 Post-Certification Expertise Upgrade Pathway

**Purpose:** Allow certified providers to voluntarily upgrade or change their expertise level and undergo re-certification.

**Eligibility:** Provider must be in 'certified' status (rank 140)

**Trigger:** Provider initiates upgrade via dashboard "Upgrade Expertise" action

**Key Policy Attributes:**
| Attribute | Value |
|-----------|-------|
| Cooling-Off Period | NOT required (voluntary change) |
| Industry Change | NOT allowed |
| Expertise Level Change | ALLOWED |
| Proficiency Areas | CLEARED (must re-select) |
| Specialities | AUTO-DERIVED (no action needed) |
| Proof Points | RETAINED (amending optional) |
| Proof Point Tags | RETAINED with proof points |
| Assessment | MANDATORY (must re-take) |
| Interview | MANDATORY (must re-schedule) |

**Lifecycle Reset:**
- Status resets to: expertise_selected (rank 50)
- Previous certification data archived for audit:
  - `previous_expertise_level_id`
  - `last_certified_at`
  - `upgrade_attempt_count` incremented

**Post-Reset Workflow:**
1. Select new expertise level (Step 4)
2. Select proficiency areas for new level (Step 4b)
3. System auto-derives specialities
4. Review/amend proof points (optional - Step 5)
5. Re-take assessment (mandatory - Step 6)
6. Schedule new interview (mandatory - Step 7)
7. Complete panel discussion (Step 8)
8. Receive new certification outcome (Step 9)

**Upgrade History Tracking:**
| Field | Purpose |
|-------|---------|
| upgrade_attempt_count | Tracks number of voluntary upgrades |
| last_certified_at | Records previous certification date |
| previous_expertise_level_id | Records previous expertise level |

---

## 2.3 Interview Unsuccessful (Status: interview_unsuccessful, Rank: 150)

### 2.3.1 State Characteristics

| Characteristic | Value |
|----------------|-------|
| Profile | View-only (frozen) |
| Certification | Not awarded |
| Re-attempt Eligibility | Subject to cooling-off period |
| Industry Pulse Access | Restricted |

### 2.3.2 Cooling-Off Policy

**Purpose:** Provide providers time to improve before re-attempting

**Cooling-Off Periods:**
| Attempt # | Cooling-Off Duration |
|-----------|---------------------|
| 1st failure | 30 days |
| 2nd failure | 60 days |
| 3rd+ failure | 90 days |

**Maximum Attempts:** Unlimited (no maximum limit)

**Tracking Fields:**
| Field | Purpose |
|-------|---------|
| interview_attempt_count | Tracks total interview attempts |
| last_interview_failed_at | Records date of failure |
| reattempt_eligible_after | Calculated eligibility date |

---

### 2.3.3 Recovery Pathways

Providers with interview_unsuccessful status have TWO available pathways:

#### **PATH A: Re-Interview (After Cooling-Off)**

**Eligibility:** Cooling-off period has elapsed

**Action:** Schedule new interview

**Constraints:**
| Aspect | Rule |
|--------|------|
| Expertise Level | Cannot change via this path |
| Proof Points | Cannot modify |
| Assessment | Not required to re-take |
| Interview | Schedule new panel interview |

**Workflow:**
1. Wait for cooling-off period to elapse
2. Return to Interview Scheduling (Step 7)
3. Complete new panel interview
4. Receive new certification outcome

---

#### **PATH B: Modify Expertise (Hard Reset)**

**Purpose:** Allow providers to change expertise level and start fresh

**Eligibility:** Provider in interview_unsuccessful status (cooling-off NOT required for this path)

**Trigger:** Provider initiates "Modify Expertise" action

**Key Policy Attributes:**
| Attribute | Value |
|-----------|-------|
| Industry Change | NOT allowed (never changeable) |
| Expertise Level Change | ALLOWED |
| Proficiency Areas | CLEARED (all deleted) |
| Specialities | CLEARED (all deleted) |
| Proof Points | DELETED (hard reset) |
| Proof Point Tags | DELETED with proof points |
| Assessment | MANDATORY (must re-take) |
| Interview | MANDATORY (must re-schedule) |

**Lifecycle Reset:**
- Status resets to: expertise_selected (rank 50)
- `interview_attempt_count` preserved (does not reset)
- `reattempt_eligible_after` preserved

**Post-Reset Workflow:**
1. Select new expertise level (Step 4)
2. Select proficiency areas (Step 4b)
3. System auto-derives specialities
4. Re-submit proof points (mandatory - Step 5)
5. Re-take assessment (mandatory - Step 6)
6. Schedule new interview (mandatory - Step 7)
7. Complete panel discussion (Step 8)
8. Receive new certification outcome (Step 9)

---

### 2.3.4 Comparison: Path A vs Path B

| Aspect | Path A (Re-Interview) | Path B (Modify Expertise) |
|--------|----------------------|--------------------------|
| Trigger | Cooling-off elapsed | User choice |
| Waiting Period | Required (30/60/90 days) | Not required |
| Expertise Change | No | Yes |
| Proof Points | Retained | Deleted |
| Assessment | Skip | Must re-take |
| Interview | Must schedule new | Must schedule new |
| Reset Status | panel_scheduled (120) | expertise_selected (50) |

---

## 2.4 Comparison: Post-Certification Upgrade vs. Interview Failure Reset

| Aspect | Expertise Upgrade (Certified) | Path B Reset (Interview Unsuccessful) |
|--------|------------------------------|--------------------------------------|
| Trigger Status | certified (140) | interview_unsuccessful (150) |
| User Intent | Voluntary advancement | Recovery from failure |
| Cooling-Off | NOT required | NOT required for Path B |
| Industry Change | Never allowed | Never allowed |
| Proof Points | RETAINED | DELETED |
| Proficiency Areas | CLEARED | CLEARED |
| Counter Field | upgrade_attempt_count | interview_attempt_count |
| Reset To Status | expertise_selected (50) | expertise_selected (50) |

---

## 2.5 Administrative States

### 2.5.1 Suspended (Rank: 200)

| Attribute | Value |
|-----------|-------|
| Trigger | Platform administrator action |
| Content Visibility | Hidden from public/platform |
| Provider Access | Restricted |
| Recovery | Administrator reinstatement |

### 2.5.2 Inactive (Rank: 210)

| Attribute | Value |
|-----------|-------|
| Trigger | Account deactivation (user or admin) |
| Content Visibility | Hidden from public/platform |
| Provider Access | None |
| Recovery | Reactivation request |

---

## 2.6 Constraints Summary - Never Allowed Actions

| Action | Applicability | Reason |
|--------|--------------|--------|
| Change industry segment on existing enrollment | All statuses (rank ≥ 100) | Architectural integrity; create new enrollment instead |
| Modify data after rank 140 | certified, interview_unsuccessful | Audit integrity |
| Skip assessment | All providers | Mandatory verification step |
| Skip interview | All providers | Mandatory verification step |
| Delete primary enrollment | All statuses | System constraint |

---

## 2.7 Governance Principles

### 2.7.1 Audit Integrity

- All lifecycle transitions are logged with timestamps and user IDs
- Previous certification data archived before resets
- Attempt counters preserved across resets
- Soft-delete patterns used for proof points (maintains history)

### 2.7.2 System Enforcement

All rules in this document are enforced at multiple layers:
1. **Database Layer:** RPC functions validate eligibility before state changes
2. **Service Layer:** Business logic checks before mutations
3. **UI Layer:** Conditional rendering and disabled states

### 2.7.3 Exception Handling

| Scenario | Authority | Process |
|----------|-----------|---------|
| Override field locks | Platform Administrator | Documented reason required |
| Manual status adjustment | Platform Administrator | Audit log entry required |
| Data correction | Platform Administrator | Support ticket required |

---

# APPENDIX

## A. Lifecycle Rank Quick Reference

```text
10   invited
15   registered
20   enrolled
30   mode_selected
35   org_info_pending
40   org_validated
50   expertise_selected
55   profile_building
60   proof_points_started
70   proof_points_min_met
90   assessment_pending
100  assessment_in_progress    ← CONFIGURATION LOCK
105  assessment_completed
110  assessment_passed
120  panel_scheduled
130  panel_completed
135  active
140  certified                 ← EVERYTHING LOCK
150  interview_unsuccessful
200  suspended
210  inactive
```

## B. Terminal States

- certified (140)
- interview_unsuccessful (150)
- suspended (200)
- inactive (210)

## C. View-Only States

- certified (140)
- interview_unsuccessful (150)

## D. Hidden States (Content Hidden from Platform)

- suspended (200)
- inactive (210)

---

**Document End - BRD-SP-LIFECYCLE-2026**
