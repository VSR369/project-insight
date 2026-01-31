
# Industry Pulse Platform - Comprehensive Product Requirements Document (PRD)

## Document Information
| Attribute | Value |
|-----------|-------|
| **Document ID** | PRD-IP-2026-001 |
| **Version** | 1.0.0 |
| **Status** | Final |
| **Date** | January 31, 2026 |
| **Classification** | Internal - Confidential |

---

# 1. EXECUTIVE SUMMARY

## 1.1 Product Vision

Industry Pulse is a **multi-tenant co-innovation platform** that connects Solution Providers (verified industry experts) with Seeker Organizations through a rigorous verification, credentialing, and social engagement ecosystem. The platform evolves through four stages:
1. **SaaS Application** (Current) - Provider enrollment and verification
2. **Two-Sided Marketplace** - Seekers ↔ Providers matching
3. **Network Platform** - Ecosystem with network effects
4. **Enterprise Advisory Engine** - PwC/EY/KPMG-class competitor

## 1.2 Business Objectives

| Objective | Metric | Target (Year 1) |
|-----------|--------|-----------------|
| Provider Enrollment | Registered Providers | 10,000 |
| Verification Rate | % Completing Verification | 60% |
| Social Engagement | Daily Active Users (Pulse) | 3,000 |
| Certification Rate | Providers Certified | 4,000 |
| Content Creation | Monthly Posts | 50,000 |

## 1.3 Success Metrics (KPIs)

| KPI | Definition | Target |
|-----|------------|--------|
| Time-to-Verification | Days from enrollment to certified | < 30 days |
| Assessment Pass Rate | % passing on first attempt | 70% |
| Provider Retention | % active after 90 days | 85% |
| Content Engagement Rate | Avg fires per post | 15 |
| Panel Completion Rate | % scheduled interviews completed | 95% |

## 1.4 Scope Boundaries

### In-Scope
- Provider self-registration and enrollment wizard (9 steps)
- Multi-industry enrollment support
- Automated assessment system with question bank
- Interview panel scheduling and evaluation
- Industry Pulse social platform (content, engagement, gamification)
- PulseCards wiki-style collaborative content
- Admin master data management (15+ modules)
- Reviewer portal with candidate management

### Out-of-Scope
- Seeker organization onboarding (Phase 2)
- Payment/billing integration
- Native mobile applications
- Third-party marketplace integrations

## 1.5 Glossary of Terms

| Term | Definition |
|------|------------|
| **Solution Provider** | Individual/firm offering industry expertise and services |
| **Seeker Organization** | Company seeking solution providers for projects |
| **Enrollment** | Provider's journey within a specific industry segment |
| **Lifecycle Status** | Current stage in the verification journey |
| **Lifecycle Rank** | Numeric value (10-210) indicating progression |
| **Proof Points** | Evidence documents supporting claimed expertise |
| **Pulse** | Social engagement module for verified providers |
| **PulseCard** | Wiki-style collaborative industry insight content |
| **Speciality** | Specific skill area within a sub-domain |
| **Proficiency Area** | Broad expertise category within industry+level |

---

# 2. USER PERSONAS & ACTORS

## 2.1 Primary Users

### 2.1.1 Solution Provider (Professional)
| Attribute | Description |
|-----------|-------------|
| **Profile** | Industry professional with 5+ years experience |
| **Goal** | Get verified and certified to access platform opportunities |
| **Pain Points** | Complex verification, time-consuming documentation |
| **Technical Literacy** | Moderate to High |
| **Primary Journeys** | Enrollment → Assessment → Interview → Certification |

### 2.1.2 Solution Provider (Student)
| Attribute | Description |
|-----------|-------------|
| **Profile** | University student in final year or recent graduate |
| **Goal** | Build verified credentials for job market |
| **Pain Points** | Limited work experience, academic proof reliance |
| **Technical Literacy** | High |
| **Primary Journeys** | Academic enrollment → Skill assessment → Entry certification |

### 2.1.3 Panel Reviewer
| Attribute | Description |
|-----------|-------------|
| **Profile** | Senior industry expert conducting verification interviews |
| **Goal** | Evaluate provider competencies efficiently |
| **Pain Points** | Limited availability, need structured evaluation |
| **Technical Literacy** | Moderate |
| **Primary Journeys** | Availability management → Interview conduction → Scoring |

### 2.1.4 Platform Administrator
| Attribute | Description |
|-----------|-------------|
| **Profile** | Operations team member managing platform |
| **Goal** | Configure system, manage master data, monitor health |
| **Pain Points** | Complex hierarchies, bulk data management |
| **Technical Literacy** | High |
| **Primary Journeys** | Master data CRUD → Question bank management → Reporting |

## 2.2 System Actors

| Actor | Description | Trigger |
|-------|-------------|---------|
| **Lifecycle Engine** | Updates provider status based on milestones | Enrollment events |
| **Assessment Scorer** | Calculates assessment results | Assessment submission |
| **Streak Calculator** | Tracks daily activity streaks | Daily cron job |
| **Slot Aggregator** | Creates composite interview slots | Reviewer availability changes |
| **Notification Service** | Sends alerts and reminders | System events |

## 2.3 User Permission Matrix

| Role | Enrollment | Assessment | Pulse | Admin | Reviewer |
|------|------------|------------|-------|-------|----------|
| **Guest** | Register only | ❌ | View only | ❌ | ❌ |
| **Provider (Enrolled)** | Full access | Limited | ❌ | ❌ | ❌ |
| **Provider (Verified)** | View only | View only | Full access | ❌ | ❌ |
| **Panel Reviewer** | ❌ | ❌ | Full access | ❌ | Full access |
| **Platform Admin** | View all | Configure | Moderate | Full access | View all |

---

# 3. FUNCTIONAL REQUIREMENTS

## 3.1 Module: Provider Enrollment Wizard

### 3.1.1 Feature Overview
A 9-step wizard guiding providers through the verification journey with progressive field locking based on lifecycle progression.

### 3.1.2 Wizard Steps

| Step | Name | Lifecycle Rank | Lock Threshold |
|------|------|----------------|----------------|
| 1 | Registration | 15 (registered) | 100 |
| 2 | Participation Mode | 30 (mode_selected) | 100 |
| 3 | Organization | 40 (org_validated) | 100 |
| 4 | Expertise Selection | 50 (expertise_selected) | 100 |
| 5 | Proof Points | 70 (proof_points_min_met) | 100 |
| 6 | Assessment | 110 (assessment_passed) | 110 |
| 7 | Interview Scheduling | 120 (panel_scheduled) | 130 |
| 8 | Panel Discussion | 130 (panel_completed) | 140 |
| 9 | Certification | 140+ (verified/certified) | 140 |

### 3.1.3 User Stories

```text
┌─────────────────────────────────────────────────────────────────┐
│ USER STORY: [US-ENR-001] Provider Registration                  │
├─────────────────────────────────────────────────────────────────┤
│ PRIORITY: Critical  │ STORY POINTS: 5                           │
├─────────────────────────────────────────────────────────────────┤
│ AS A new user                                                   │
│ I WANT TO register as a solution provider                       │
│ SO THAT I can begin the verification process                    │
├─────────────────────────────────────────────────────────────────┤
│ PRECONDITIONS:                                                  │
│ • User has valid email address                                  │
│ • User is not already registered                                │
├─────────────────────────────────────────────────────────────────┤
│ ACCEPTANCE CRITERIA:                                            │
│                                                                 │
│ AC-1: Successful Registration                                   │
│   GIVEN I am on the registration page                           │
│   WHEN I enter valid first_name, last_name, email, password     │
│   AND click Register                                            │
│   THEN a user account is created                                │
│   AND a solution_provider record is created                     │
│   AND lifecycle_status = 'registered'                           │
│   AND lifecycle_rank = 15                                       │
│   AND I am redirected to Step 1 (Registration Details)          │
│                                                                 │
│ AC-2: Duplicate Email Prevention                                │
│   GIVEN I am on the registration page                           │
│   WHEN I enter an email that already exists                     │
│   THEN I see error "This email is already registered"           │
│   AND registration is blocked                                   │
├─────────────────────────────────────────────────────────────────┤
│ BUSINESS RULES APPLIED:                                         │
│ • BR-REG-001: Email must be unique across all users             │
│ • BR-REG-002: Password minimum 8 characters                     │
├─────────────────────────────────────────────────────────────────┤
│ VALIDATION RULES:                                               │
│ • VR-REG-001: first_name: 1-50 chars, required                  │
│ • VR-REG-002: last_name: 1-50 chars, required                   │
│ • VR-REG-003: email: valid email format, required               │
│ • VR-REG-004: password: min 8 chars, required                   │
├─────────────────────────────────────────────────────────────────┤
│ ERROR SCENARIOS:                                                │
│ • ES-1: Duplicate email → "This email is already registered"    │
│ • ES-2: Invalid email format → "Please enter a valid email"     │
│ • ES-3: Password too short → "Password must be at least 8 chars"│
├─────────────────────────────────────────────────────────────────┤
│ TEST SCENARIOS:                                                 │
│ • TS-1: Register with valid data → Success                      │
│ • TS-2: Register with duplicate email → Error                   │
│ • TS-3: Register with invalid email → Validation error          │
│ • TS-4: Register with 7-char password → Validation error        │
│ • TS-5: Register with empty first_name → Validation error       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1.4 Validation Rules - Step 1 (Registration Details)

| Field | Type | Required | Min | Max | Pattern | Error Message |
|-------|------|----------|-----|-----|---------|---------------|
| first_name | string | Yes | 1 | 50 | - | "First name is required" |
| last_name | string | Yes | 1 | 50 | - | "Last name is required" |
| address | string | Yes | 1 | 200 | - | "Address is required" |
| pin_code | string | Yes | 3 | 20 | Country-specific | See PIN_CODE_PATTERNS |
| country_id | UUID | Yes | - | - | - | "Please select a country" |
| industry_segment_id | UUID | Yes | - | - | - | "Please select an industry" |

**Country-Specific PIN Code Validation:**

| Country Code | Pattern | Example | Error Message |
|--------------|---------|---------|---------------|
| IN | `^[1-9][0-9]{5}$` | 400001 | "Indian pin code must be 6 digits and cannot start with 0" |
| US | `^\d{5}(-\d{4})?$` | 12345, 12345-6789 | "US zip code must be 5 digits or 5+4 format" |
| GB | `^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$` | SW1A 1AA | "Please enter a valid UK postcode" |
| DEFAULT | `^[A-Za-z0-9\s-]{3,20}$` | - | "Please enter a valid postal code" |

---

## 3.2 Module: Lifecycle Management

### 3.2.1 Lifecycle State Machine

```text
┌─────────────────────────────────────────────────────────────────┐
│ LIFECYCLE STATUS STATE MACHINE                                  │
├─────────────────────────────────────────────────────────────────┤
│ STATES:                                                         │
│ ┌──────────────────────┬───────┬──────────────────────────────┐ │
│ │ Status               │ Rank  │ Description                   │ │
│ ├──────────────────────┼───────┼──────────────────────────────┤ │
│ │ invited              │ 10    │ Invitation sent, not yet reg  │ │
│ │ registered           │ 15    │ Account created               │ │
│ │ enrolled             │ 20    │ Basic info submitted          │ │
│ │ mode_selected        │ 30    │ Participation mode chosen     │ │
│ │ org_info_pending     │ 35    │ Org info submitted, awaiting  │ │
│ │ org_validated        │ 40    │ Organization verified         │ │
│ │ expertise_selected   │ 50    │ Expertise level chosen        │ │
│ │ profile_building     │ 55    │ Adding proof points           │ │
│ │ proof_points_started │ 60    │ First proof point added       │ │
│ │ proof_points_min_met │ 70    │ Minimum proof points achieved │ │
│ │ assessment_pending   │ 90    │ Ready to start assessment     │ │
│ │ assessment_in_prog   │ 100   │ Assessment in progress        │ │
│ │ assessment_completed │ 105   │ Assessment submitted          │ │
│ │ assessment_passed    │ 110   │ Passed with >= 70%            │ │
│ │ panel_scheduled      │ 120   │ Interview booked              │ │
│ │ panel_completed      │ 130   │ Interview completed           │ │
│ │ verified             │ 140   │ Verification complete         │ │
│ │ active               │ 145   │ Actively engaged              │ │
│ │ certified            │ 150   │ Final certification           │ │
│ │ not_verified         │ 160   │ Failed verification           │ │
│ │ suspended            │ 200   │ Account suspended             │ │
│ │ inactive             │ 210   │ Account deactivated           │ │
│ └──────────────────────┴───────┴──────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ LOCK THRESHOLDS:                                                │
│ • CONFIGURATION (Industry/Level/Areas): Locked at rank 100     │
│ • CONTENT (Registration/Mode/Org/Proof Points): Locked at 100  │
│ • EVERYTHING: Locked at rank 140 (verified/terminal states)    │
├─────────────────────────────────────────────────────────────────┤
│ TERMINAL STATES: verified, certified, not_verified,            │
│                  suspended, inactive                            │
│ HIDDEN STATES: suspended, inactive (content hidden)            │
│ VIEW-ONLY STATES: verified, certified, not_verified            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2.2 Business Rules - Lifecycle Transitions

```text
┌─────────────────────────────────────────────────────────────────┐
│ BUSINESS RULE: [BR-LC-001] Configuration Lock                   │
├─────────────────────────────────────────────────────────────────┤
│ RULE NAME: Configuration fields locked at assessment           │
│ CATEGORY: Policy                                                │
│ PRIORITY: Mandatory                                             │
├─────────────────────────────────────────────────────────────────┤
│ RULE STATEMENT:                                                 │
│ Once a provider starts their assessment (rank >= 100), they     │
│ cannot modify industry segment, expertise level, proficiency    │
│ areas, or specialities.                                         │
├─────────────────────────────────────────────────────────────────┤
│ FORMAL DEFINITION:                                              │
│ IF provider.lifecycle_rank >= 100                               │
│    AND field IN (industry_segment_id, expertise_level_id,       │
│                  proficiency_areas, specialities)               │
│ THEN modification = BLOCKED                                     │
│      message = "Industry and expertise settings cannot be       │
│                 changed during or after assessment."            │
├─────────────────────────────────────────────────────────────────┤
│ EXCEPTIONS:                                                     │
│ • Platform Admin can override with documented reason            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Module: Assessment System

### 3.3.1 Feature Overview
Automated competency assessment with randomized questions from a bank, timed execution, and automatic scoring.

### 3.3.2 Assessment Configuration

| Parameter | Value | Source |
|-----------|-------|--------|
| Time Limit | 60 minutes | DEFAULT_TIME_LIMIT_MINUTES |
| Questions Per Assessment | 20 | DEFAULT_QUESTIONS_PER_ASSESSMENT |
| Minimum Questions (Valid) | 10 | MIN_QUESTIONS_FOR_ASSESSMENT |
| Passing Score | 70% | PASSING_SCORE_PERCENTAGE |
| Question Types | conceptual, scenario, experience, decision, proof | Enum |

### 3.3.3 Question Generation Rules

Questions are selected based on:
1. **Industry Segment** - Matches provider's enrolled industry
2. **Expertise Level** - Matches provider's selected level
3. **Specialities** - Weighted toward provider's selected specialities
4. **Question Type Distribution** - Configured per expertise level

### 3.3.4 Scoring Calculation

```text
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION: [CALC-ASS-001] Assessment Score                    │
├─────────────────────────────────────────────────────────────────┤
│ PURPOSE: Calculate percentage score for completed assessment    │
│ TRIGGER: Assessment submission                                  │
├─────────────────────────────────────────────────────────────────┤
│ FORMULA:                                                        │
│                                                                 │
│ score_percentage = (correct_answers / total_questions) × 100    │
│                                                                 │
│ Where:                                                          │
│   correct_answers = COUNT(responses WHERE is_correct = true)    │
│   total_questions = COUNT(responses)                            │
├─────────────────────────────────────────────────────────────────┤
│ ROUNDING RULES:                                                 │
│ • Method: ROUND_HALF_UP                                         │
│ • Precision: 1 decimal place                                    │
├─────────────────────────────────────────────────────────────────┤
│ EXAMPLES:                                                       │
│                                                                 │
│ Example 1: Passing Score                                        │
│   Input: 14 correct out of 20 questions                         │
│   Calculation: (14/20) × 100 = 70.0%                            │
│   Result: PASSED (>= 70%)                                       │
│                                                                 │
│ Example 2: Failing Score                                        │
│   Input: 13 correct out of 20 questions                         │
│   Calculation: (13/20) × 100 = 65.0%                            │
│   Result: FAILED (< 70%)                                        │
│                                                                 │
│ Example 3: Boundary Condition                                   │
│   Input: 7 correct out of 10 questions                          │
│   Calculation: (7/10) × 100 = 70.0%                             │
│   Result: PASSED (= 70%, exact boundary)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.4 Module: Certification & Final Results

### 3.4.1 Composite Score Calculation

```text
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION: [CALC-CERT-001] Composite Certification Score      │
├─────────────────────────────────────────────────────────────────┤
│ PURPOSE: Calculate final certification outcome                  │
│ TRIGGER: Panel interview completion                             │
├─────────────────────────────────────────────────────────────────┤
│ INPUT PARAMETERS:                                               │
│ ┌──────────────────┬──────────┬───────────┬───────────────────┐ │
│ │ Parameter        │ Type     │ Required  │ Valid Range       │ │
│ ├──────────────────┼──────────┼───────────┼───────────────────┤ │
│ │ proofPointsScore │ Decimal  │ Yes       │ 0.00 - 10.00      │ │
│ │ assessmentPercent│ Decimal  │ Yes       │ 0.00 - 100.00     │ │
│ │ interviewScore   │ Decimal  │ Yes       │ 0.00 - 10.00      │ │
│ └──────────────────┴──────────┴───────────┴───────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ FORMULA:                                                        │
│                                                                 │
│ Step 1: Normalize to percentages                                │
│   proofPointsPercent = (proofPointsScore / 10) × 100            │
│   interviewPercent = (interviewScore / 10) × 100                │
│                                                                 │
│ Step 2: Apply weights                                           │
│   compositeScore = (proofPointsPercent × 0.30) +                │
│                    (assessmentPercent × 0.50) +                 │
│                    (interviewPercent × 0.20)                    │
│                                                                 │
│ WEIGHTS:                                                        │
│   • Proof Points: 30%                                           │
│   • Assessment: 50%                                             │
│   • Interview: 20%                                              │
├─────────────────────────────────────────────────────────────────┤
│ CERTIFICATION THRESHOLDS:                                       │
│ ┌─────────────────┬────────────────┬───────────────────────────┐│
│ │ Score Range     │ Outcome        │ Stars                     ││
│ ├─────────────────┼────────────────┼───────────────────────────┤│
│ │ < 51.0%         │ Not Certified  │ 0 ★                       ││
│ │ 51.0% - 65.9%   │ Certified      │ 1 ★                       ││
│ │ 66.0% - 85.9%   │ Certified      │ 2 ★★                      ││
│ │ >= 86.0%        │ Certified      │ 3 ★★★                     ││
│ └─────────────────┴────────────────┴───────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ EXAMPLES:                                                       │
│                                                                 │
│ Example 1: Three-Star Certification                             │
│   Input: ProofPoints=9.0, Assessment=90%, Interview=8.5         │
│   Calculation:                                                  │
│     PP = (9.0/10)×100 = 90%                                     │
│     IV = (8.5/10)×100 = 85%                                     │
│     Composite = (90×0.30) + (90×0.50) + (85×0.20)               │
│              = 27 + 45 + 17 = 89.0%                             │
│   Result: THREE STAR (≥86%)                                     │
│                                                                 │
│ Example 2: One-Star Certification                               │
│   Input: ProofPoints=5.5, Assessment=72%, Interview=5.0         │
│   Calculation:                                                  │
│     PP = (5.5/10)×100 = 55%                                     │
│     IV = (5.0/10)×100 = 50%                                     │
│     Composite = (55×0.30) + (72×0.50) + (50×0.20)               │
│              = 16.5 + 36 + 10 = 62.5%                           │
│   Result: ONE STAR (51-65.9%)                                   │
│                                                                 │
│ Example 3: Not Certified                                        │
│   Input: ProofPoints=4.0, Assessment=65%, Interview=3.5         │
│   Calculation:                                                  │
│     PP = (4.0/10)×100 = 40%                                     │
│     IV = (3.5/10)×100 = 35%                                     │
│     Composite = (40×0.30) + (65×0.50) + (35×0.20)               │
│              = 12 + 32.5 + 7 = 51.5%                            │
│   Result: ONE STAR (≥51%)                                       │
│                                                                 │
│ Example 4: Boundary - Exactly 51%                               │
│   Input: ProofPoints=4.0, Assessment=65%, Interview=3.0         │
│   Calculation:                                                  │
│     Composite = (40×0.30) + (65×0.50) + (30×0.20)               │
│              = 12 + 32.5 + 6 = 50.5%                            │
│   Result: NOT CERTIFIED (<51%)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.5 Module: Industry Pulse (Social Platform)

### 3.5.1 Feature Overview
A gamified social engagement platform for verified providers featuring content creation, engagement mechanics, XP-based progression, streaks, and daily rewards.

### 3.5.2 Content Types

| Type | Code | XP Reward | Max File Size | Duration Limit |
|------|------|-----------|---------------|----------------|
| Reel | reel | 100 XP | 500 MB | 3 minutes |
| Podcast | podcast | 200 XP | 500 MB | 60 minutes |
| Knowledge Spark | spark | 50 XP | - | - |
| Article | article | 150 XP | - | - |
| Gallery | gallery | 75 XP | 50 MB/image | Max 10 images |
| Quick Post | post | 25 XP | 10 MB | - |

### 3.5.3 Engagement Types & XP Awards

| Engagement | Code | XP to Creator | XP to Engager | Requires Token |
|------------|------|---------------|---------------|----------------|
| Fire | fire | 2 XP | 0 XP | No |
| Gold | gold | 15 XP | 0 XP | Yes (1 token) |
| Save | save | 5 XP | 0 XP | No |
| Bookmark | bookmark | 0 XP | 0 XP | No (private) |

### 3.5.4 Level Calculation

```text
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION: [CALC-PULSE-001] User Level                        │
├─────────────────────────────────────────────────────────────────┤
│ FORMULA:                                                        │
│                                                                 │
│ level = MAX(1, FLOOR(SQRT(totalXp / 20)) + 1)                   │
│                                                                 │
│ XP FOR LEVEL:                                                   │
│ xpRequired(level) = 20 × (level - 1)²                           │
├─────────────────────────────────────────────────────────────────┤
│ EXAMPLES:                                                       │
│ ┌──────────┬────────────────┬────────────────────────────────┐  │
│ │ Level    │ XP Required    │ Cumulative XP                  │  │
│ ├──────────┼────────────────┼────────────────────────────────┤  │
│ │ 1        │ 0              │ 0                              │  │
│ │ 2        │ 20             │ 20                             │  │
│ │ 5        │ 320            │ 320                            │  │
│ │ 10       │ 1,620          │ 1,620                          │  │
│ │ 25       │ 11,520         │ 11,520                         │  │
│ │ 50       │ 48,020         │ 48,020                         │  │
│ └──────────┴────────────────┴────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5.5 Streak Multipliers

| Streak Days | Multiplier | Loot Box Bonus |
|-------------|------------|----------------|
| 0-6 | 1.0x | Base rewards |
| 7-13 | 1.25x | +25% |
| 14-29 | 1.5x | +50% |
| 30-89 | 1.75x | +75% |
| 90-179 | 2.0x | +100% |
| 180-364 | 2.5x | +150% |
| 365+ | 3.0x | +200% |

### 3.5.6 Feed Ranking Algorithm

```text
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION: [CALC-PULSE-002] Feed Ranking Score                │
├─────────────────────────────────────────────────────────────────┤
│ FORMULA:                                                        │
│                                                                 │
│ baseScore = (fire_count × 1) + (comment_count × 3) +            │
│             (gold_count × 10) + (save_count × 5)                │
│                                                                 │
│ recencyMultiplier:                                              │
│   IF hours_since_publish <= 6 THEN 1.0                          │
│   ELSE MAX(0.1, 0.95^(hours_since_publish - 6))                 │
│                                                                 │
│ visibilityBoost:                                                │
│   IF creator.visibility_boost_active = true THEN 10             │
│   ELSE 1                                                        │
│                                                                 │
│ finalScore = baseScore × recencyMultiplier × visibilityBoost    │
├─────────────────────────────────────────────────────────────────┤
│ RECENCY DECAY:                                                  │
│ • Decay starts: 6 hours after publish                           │
│ • Decay rate: 0.95 per hour                                     │
│ • Minimum multiplier: 0.1 (content never fully disappears)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3.6 Module: PulseCards (Collaborative Wiki)

### 3.6.1 Feature Overview
Wiki-style collaborative content where multiple providers can contribute layers to industry insight topics.

### 3.6.2 Card Structure

| Component | Description | Constraints |
|-----------|-------------|-------------|
| Topic | Parent category for cards | Admin-managed |
| Card | Main insight unit | One topic per card |
| Layer | Contributor's perspective | Up to 20 per card |
| Vote | Community endorsement | One per user per layer |

### 3.6.3 Reputation Calculation

```text
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION: [CALC-PC-001] Card Contributor Reputation          │
├─────────────────────────────────────────────────────────────────┤
│ FORMULA:                                                        │
│                                                                 │
│ reputation = layersContributed × 10 +                           │
│              upvotesReceived × 2 +                              │
│              cardsCreated × 50                                  │
├─────────────────────────────────────────────────────────────────┤
│ EXAMPLES:                                                       │
│                                                                 │
│ Expert Contributor:                                             │
│   5 cards created, 20 layers, 150 upvotes                       │
│   Reputation = (5×50) + (20×10) + (150×2)                       │
│             = 250 + 200 + 300 = 750                             │
│                                                                 │
│ New Contributor:                                                │
│   0 cards, 2 layers, 5 upvotes                                  │
│   Reputation = (0×50) + (2×10) + (5×2)                          │
│             = 0 + 20 + 10 = 30                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 4. DATA REQUIREMENTS

## 4.1 Core Entity Relationships

```text
┌─────────────────────────────────────────────────────────────────┐
│ ENTITY RELATIONSHIP DIAGRAM (Core Entities)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   auth.users     │────1:1──│ solution_providers│              │
│  └──────────────────┘         └────────┬─────────┘              │
│                                        │                        │
│                                        │1:N                     │
│                                        ▼                        │
│                          ┌──────────────────────────┐           │
│                          │provider_industry_enrollments│         │
│                          └────────────┬─────────────┘           │
│                                       │                         │
│                    ┌──────────────────┼──────────────────┐      │
│                    │                  │                  │      │
│                    ▼                  ▼                  ▼      │
│          ┌─────────────┐   ┌──────────────┐   ┌───────────────┐ │
│          │proof_points │   │ assessment   │   │ interview     │ │
│          │             │   │ _attempts    │   │ _bookings     │ │
│          └─────────────┘   └──────────────┘   └───────────────┘ │
│                                                                 │
│  PROFICIENCY TAXONOMY:                                          │
│  industry_segments ──► proficiency_areas ──► sub_domains        │
│        │                      │                    │            │
│        └─────► expertise_levels                    ▼            │
│                                              specialities       │
│                                                                 │
│  PULSE SOCIAL:                                                  │
│  solution_providers ──► pulse_provider_stats (1:1)              │
│        │                                                        │
│        ├──► pulse_content ──► pulse_engagements                 │
│        ├──► pulse_comments                                      │
│        ├──► pulse_connections (follower/following)              │
│        ├──► pulse_notifications                                 │
│        ├──► pulse_skills                                        │
│        ├──► pulse_daily_standups                                │
│        └──► pulse_loot_boxes                                    │
│                                                                 │
│  PULSE CARDS:                                                   │
│  pulse_card_topics ──► pulse_cards ──► pulse_card_layers        │
│                                               │                 │
│                                               ▼                 │
│                                        pulse_card_votes         │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Data Dictionary - Core Tables

### 4.2.1 solution_providers

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| user_id | UUID | No | - | FK to auth.users |
| first_name | VARCHAR(50) | No | - | First name |
| last_name | VARCHAR(50) | No | - | Last name |
| address | VARCHAR(200) | Yes | NULL | Street address |
| pin_code | VARCHAR(20) | Yes | NULL | Postal code |
| country_id | UUID | Yes | NULL | FK to countries |
| industry_segment_id | UUID | Yes | NULL | FK to industry_segments |
| expertise_level_id | UUID | Yes | NULL | FK to expertise_levels |
| participation_mode_id | UUID | Yes | NULL | FK to participation_modes |
| is_student | BOOLEAN | No | false | Student flag |
| lifecycle_status | ENUM | No | 'registered' | Current status |
| lifecycle_rank | INTEGER | No | 15 | Numeric rank |
| onboarding_status | ENUM | No | 'incomplete' | Wizard progress |
| verification_status | ENUM | Yes | NULL | Verification outcome |
| timezone | VARCHAR(50) | Yes | NULL | User timezone |
| created_at | TIMESTAMPTZ | No | NOW() | Creation time |
| updated_at | TIMESTAMPTZ | Yes | NULL | Last update |
| created_by | UUID | Yes | NULL | Creator user |
| updated_by | UUID | Yes | NULL | Last modifier |

### 4.2.2 provider_industry_enrollments

| Column | Type | Null | Default | Description |
|--------|------|------|---------|-------------|
| id | UUID | No | gen_random_uuid() | Primary key |
| provider_id | UUID | No | - | FK to solution_providers |
| industry_segment_id | UUID | No | - | FK to industry_segments |
| expertise_level_id | UUID | Yes | NULL | FK to expertise_levels |
| participation_mode_id | UUID | Yes | NULL | FK to participation_modes |
| organization | JSONB | Yes | NULL | Embedded org info |
| org_approval_status | VARCHAR(20) | Yes | NULL | pending/approved/declined |
| lifecycle_status | ENUM | No | 'enrolled' | Enrollment status |
| lifecycle_rank | INTEGER | No | 20 | Enrollment rank |
| is_primary | BOOLEAN | No | false | Primary enrollment flag |
| created_at | TIMESTAMPTZ | No | NOW() | Creation time |
| updated_at | TIMESTAMPTZ | Yes | NULL | Last update |

---

# 5. NON-FUNCTIONAL REQUIREMENTS

## 5.1 Performance Requirements

| Operation | Target | P95 | P99 | Max |
|-----------|--------|-----|-----|-----|
| Page Load (initial) | < 2.0s | < 3.0s | < 5.0s | 10s |
| API - Simple GET | < 100ms | < 200ms | < 500ms | 2s |
| API - Complex GET | < 300ms | < 500ms | < 1.0s | 5s |
| Feed Load | < 500ms | < 1.0s | < 2.0s | 5s |
| Assessment Submit | < 200ms | < 400ms | < 800ms | 3s |
| File Upload (per MB) | < 2.0s | < 3.0s | < 5.0s | 10s |

## 5.2 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (JWT-based) |
| Authorization | Row Level Security (RLS) on all tables |
| Encryption at Rest | PostgreSQL encryption |
| Encryption in Transit | TLS 1.3 |
| Session Timeout | 7 days (remembered) / 24 hours (default) |
| Password Policy | Minimum 8 characters |
| Multi-tenant Isolation | Mandatory tenant_id on tenant-scoped tables |

## 5.3 Audit Requirements

| Audit Field | Description | Applied To |
|-------------|-------------|------------|
| created_at | Record creation timestamp | All tables |
| updated_at | Last modification timestamp | All tables |
| created_by | User who created record | All tables |
| updated_by | User who last modified | All tables |
| is_deleted | Soft delete flag | Business tables |
| deleted_at | Soft delete timestamp | Business tables |
| deleted_by | User who deleted | Business tables |

---

# 6. TEST SPECIFICATIONS

## 6.1 Test Scope

| Category | Test Count | Coverage |
|----------|------------|----------|
| Enrollment Tests | 45 | Wizard flow, lifecycle |
| Pulse Social Tests | 97 | Content, engagement, gamification |
| Admin Tests | 30 | Master data CRUD |
| Assessment Tests | 20 | Question selection, scoring |
| Integration Tests | 15 | API contracts, RLS |

## 6.2 Critical Test Scenarios

### 6.2.1 Enrollment Flow

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| ENR-001 | Complete registration with valid data | Provider created, status=registered |
| ENR-002 | Select participation mode (Independent) | No org info required, proceed to Step 4 |
| ENR-003 | Select participation mode (Employee) | Org info required, await manager approval |
| ENR-004 | Change industry after assessment start | BLOCKED with lock message |
| ENR-005 | Add 5 proof points | Lifecycle advances to proof_points_min_met |

### 6.2.2 Assessment Flow

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| ASS-001 | Start assessment with sufficient questions | 20 questions loaded |
| ASS-002 | Submit with 14/20 correct | Score=70%, status=assessment_passed |
| ASS-003 | Submit with 13/20 correct | Score=65%, status=assessment_completed |
| ASS-004 | Time expires during assessment | Auto-submit with current answers |
| ASS-005 | Attempt assessment before proof_points_min_met | BLOCKED |

### 6.2.3 Pulse Social Flow

| ID | Scenario | Expected Result |
|----|----------|-----------------|
| PLS-001 | Create reel content | +100 XP, content published |
| PLS-002 | Fire own content | BLOCKED (self-engagement) |
| PLS-003 | Award gold without tokens | BLOCKED, prompt to earn tokens |
| PLS-004 | Complete daily standup | +150 XP, visibility boost 24hrs |
| PLS-005 | Maintain 7-day streak | Multiplier = 1.25x |

---

# 7. APPENDICES

## 7.1 Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Content Creation | 5/hour, 20/day | Rolling |
| Engagements | 100/minute | Rolling |
| AI Enhancement | 10/day | 24 hours |
| Comments | 30/hour | Rolling |
| Feed Requests | 60/minute | Rolling |

## 7.2 Configuration Parameters

| Setting | Default | Description |
|---------|---------|-------------|
| DEFAULT_TIME_LIMIT_MINUTES | 60 | Assessment duration |
| PASSING_SCORE_PERCENTAGE | 70 | Minimum to pass |
| MIN_QUESTIONS_FOR_ASSESSMENT | 10 | Minimum question pool |
| STANDUP_VISIBILITY_MULTIPLIER | 10 | Boost from standup |
| BOOST_DURATION_HOURS | 24 | Visibility boost duration |
| FEED_DECAY_START_HOURS | 6 | When recency decay begins |
| MAX_GALLERY_IMAGES | 10 | Images per gallery |

## 7.3 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_SUPABASE_URL | Supabase project URL | Yes |
| VITE_SUPABASE_ANON_KEY | Supabase public key | Yes |
| OPENAI_API_KEY | For AI enhancement | Edge Functions |

---

# 8. TRACEABILITY MATRIX

| Requirement ID | User Story | Test Case | Status |
|----------------|------------|-----------|--------|
| BR-LC-001 | US-ENR-004 | ENR-004 | Implemented |
| CALC-CERT-001 | US-CERT-001 | CERT-001 | Implemented |
| CALC-PULSE-001 | US-PLS-010 | PLS-010 | Implemented |
| VR-REG-001 | US-ENR-001 | ENR-001 | Implemented |

---

**Document End**

---

## Implementation Notes

This PRD covers the complete Industry Pulse platform as currently implemented in the Lovable.dev codebase. The document structure follows the IEEE 830 standard adapted for Agile development and is designed to serve as the single source of truth for:

1. **Development**: All business rules, calculations, and validations are explicitly documented
2. **QA/Testing**: Test scenarios cover positive, negative, and boundary conditions
3. **Product Management**: Success metrics and KPIs are defined
4. **Stakeholders**: Clear acceptance criteria for feature validation

The document should be version-controlled and updated as the platform evolves through its planned stages (SaaS → Marketplace → Network → Advisory Engine).
