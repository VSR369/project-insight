# QA-01: System Overview & Module Inventory

| Document ID | QA-01 |
|-------------|-------|
| Version | 1.0.0 |
| Last Updated | 2026-01-31 |
| Status | Complete |
| Total Modules | 17 |

---

## 1. Executive Summary

This document provides a comprehensive inventory of all system modules in the Industry Pulse platform, extracted from the codebase through reverse engineering. It serves as the foundation for all subsequent QA documentation.

---

## 2. System Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        INDUSTRY PULSE PLATFORM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                           │   │
│  │  • React 18 + TypeScript                                         │   │
│  │  • TanStack Query (Data Fetching)                                │   │
│  │  • React Router DOM (Navigation)                                 │   │
│  │  • Tailwind CSS + shadcn/ui (Styling)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      BUSINESS LOGIC LAYER                        │   │
│  │  • 16 Service Modules (src/services/)                            │   │
│  │  • 58 Query Hooks (src/hooks/queries/)                           │   │
│  │  • 9 Constants Files (src/constants/)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        DATA LAYER                                │   │
│  │  • Supabase PostgreSQL Database                                  │   │
│  │  • 50+ Tables with RLS Policies                                  │   │
│  │  • 110+ Database Migrations                                      │   │
│  │  • Edge Functions (Deno)                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Inventory

### 3.1 Core Modules Summary

| Module ID | Module Name | Tables | Services | Hooks | Status |
|-----------|-------------|--------|----------|-------|--------|
| MOD-001 | Authentication & Registration | 3 | 1 | 2 | Complete |
| MOD-002 | Provider Enrollment Wizard | 2 | 4 | 8 | Complete |
| MOD-003 | Participation Modes | 1 | 0 | 1 | Complete |
| MOD-004 | Organization Management | 1 | 0 | 2 | Complete |
| MOD-005 | Proficiency Taxonomy | 4 | 0 | 4 | Complete |
| MOD-006 | Academic Taxonomy | 4 | 0 | 1 | Complete |
| MOD-007 | Proof Points | 4 | 1 | 3 | Complete |
| MOD-008 | Assessment System | 3 | 2 | 5 | Complete |
| MOD-009 | Question Bank | 2 | 1 | 2 | Complete |
| MOD-010 | Interview Scheduling | 4 | 2 | 3 | Complete |
| MOD-011 | Reviewer Portal | 3 | 0 | 6 | Complete |
| MOD-012 | Lifecycle Management | 1 | 1 | 1 | Complete |
| MOD-013 | Industry Pulse - Content | 3 | 0 | 4 | Complete |
| MOD-014 | Industry Pulse - Social | 4 | 0 | 3 | Complete |
| MOD-015 | Industry Pulse - Gamification | 4 | 0 | 2 | Complete |
| MOD-016 | PulseCards Wiki | 4 | 0 | 5 | Complete |
| MOD-017 | Admin Master Data | 10 | 0 | 15 | Complete |

---

### 3.2 Detailed Module Specifications

#### MOD-001: Authentication & Registration

| Attribute | Value |
|-----------|-------|
| **Purpose** | User authentication, registration, session management |
| **Primary Tables** | `auth.users`, `profiles`, `solution_providers` |
| **Key Files** | `src/hooks/useAuth.ts`, `src/pages/Login.tsx`, `src/pages/Register.tsx` |
| **Dependencies** | Supabase Auth |

**Features:**
- Email/password registration
- Session management
- Profile creation on signup
- Role-based access control

---

#### MOD-002: Provider Enrollment Wizard

| Attribute | Value |
|-----------|-------|
| **Purpose** | 9-step wizard for provider verification journey |
| **Primary Tables** | `solution_providers`, `provider_industry_enrollments` |
| **Key Files** | `src/services/wizardNavigationService.ts`, `src/components/layout/WizardLayout.tsx` |
| **Dependencies** | MOD-001, MOD-012 |

**Wizard Steps:**
1. Registration (rank 15)
2. Participation Mode (rank 30)
3. Organization (rank 40)
4. Expertise Level (rank 50)
5. Proof Points (rank 70)
6. Assessment (rank 100-110)
7. Interview Slot (rank 120)
8. Panel Discussion (rank 130)
9. Certification (rank 140+)

**Source Reference:** `src/services/wizardNavigationService.ts:11-21`

---

#### MOD-003: Participation Modes

| Attribute | Value |
|-----------|-------|
| **Purpose** | Define how providers participate (Independent/Employee/Freelancer) |
| **Primary Tables** | `participation_modes` |
| **Key Files** | `src/hooks/queries/useParticipationModes.ts` |
| **Dependencies** | MOD-002 |

**Modes:**
- Independent
- Employee (requires org info)
- Freelancer

---

#### MOD-004: Organization Management

| Attribute | Value |
|-----------|-------|
| **Purpose** | Capture and validate organization info for Employee mode |
| **Primary Tables** | `organization_types`, embedded JSONB in enrollments |
| **Key Files** | `src/hooks/queries/useOrganizationTypes.ts`, `src/hooks/queries/useManagerApproval.ts` |
| **Dependencies** | MOD-003 |

**Features:**
- Organization details capture
- Manager approval workflow
- Approval status tracking

---

#### MOD-005: Proficiency Taxonomy

| Attribute | Value |
|-----------|-------|
| **Purpose** | 4-level expertise hierarchy for provider classification |
| **Primary Tables** | `proficiency_areas`, `sub_domains`, `specialities`, `level_speciality_map` |
| **Key Files** | `src/hooks/queries/useProficiencyTaxonomy.ts`, `src/hooks/queries/useProficiencyTaxonomyAdmin.ts` |
| **Dependencies** | Industry Segments, Expertise Levels |

**Hierarchy:**
```text
Industry Segment + Expertise Level
    └── Proficiency Area (N)
            └── Sub-Domain (N)
                    └── Speciality (N)
```

---

#### MOD-006: Academic Taxonomy

| Attribute | Value |
|-----------|-------|
| **Purpose** | Academic classification for student providers |
| **Primary Tables** | `universities`, `academic_disciplines`, `academic_streams`, `academic_subjects` |
| **Key Files** | `src/hooks/queries/useAcademicTaxonomy.ts` |
| **Dependencies** | Countries |

---

#### MOD-007: Proof Points

| Attribute | Value |
|-----------|-------|
| **Purpose** | Evidence documentation for claimed expertise |
| **Primary Tables** | `proof_points`, `proof_point_links`, `proof_point_files`, `proof_point_speciality_tags` |
| **Key Files** | `src/hooks/queries/useProofPoints.ts`, `src/services/proofPointsScoreService.ts` |
| **Dependencies** | MOD-005, MOD-002 |

**Categories:**
- General
- Specialty-specific (requires speciality tags)

**Types:**
- client_project, certification, publication, patent, speaking_engagement, open_source, award, case_study, training_delivered, tool_created

**Source Reference:** `src/hooks/queries/useProofPoints.ts:9-11`

---

#### MOD-008: Assessment System

| Attribute | Value |
|-----------|-------|
| **Purpose** | Timed competency assessment with automatic scoring |
| **Primary Tables** | `assessment_attempts`, `assessment_attempt_responses`, `assessment_results_rollup` |
| **Key Files** | `src/services/assessmentService.ts`, `src/hooks/queries/useAssessment.ts` |
| **Dependencies** | MOD-009, MOD-012 |

**Configuration:**
- Time Limit: 60 minutes
- Questions: 20
- Passing Score: 70%
- Min Questions: 10

**Source Reference:** `src/constants/assessment.constants.ts:7-17`

---

#### MOD-009: Question Bank

| Attribute | Value |
|-----------|-------|
| **Purpose** | Master data for assessment questions |
| **Primary Tables** | `question_bank`, `question_capability_tags` |
| **Key Files** | `src/hooks/queries/useQuestionBank.ts`, `src/services/questionGenerationService.ts` |
| **Dependencies** | MOD-005 |

**Question Types:**
- conceptual
- scenario
- experience
- decision
- proof

**Difficulty Levels:**
- easy
- medium
- hard

---

#### MOD-010: Interview Scheduling

| Attribute | Value |
|-----------|-------|
| **Purpose** | Panel interview booking and management |
| **Primary Tables** | `interview_bookings`, `interview_slots`, `composite_interview_slots`, `booking_reviewers` |
| **Key Files** | `src/hooks/queries/useInterviewScheduling.ts`, `src/services/rescheduleService.ts` |
| **Dependencies** | MOD-011, MOD-008 |

**Features:**
- Composite slot aggregation
- Quorum-based reviewer selection
- Conflict detection
- Reschedule/cancel workflows

---

#### MOD-011: Reviewer Portal

| Attribute | Value |
|-----------|-------|
| **Purpose** | Panel reviewer management and interview conduction |
| **Primary Tables** | `panel_reviewers`, `interview_evaluations`, `interview_question_responses` |
| **Key Files** | `src/hooks/queries/useReviewerDashboard.ts`, `src/hooks/queries/useReviewerCandidates.ts` |
| **Dependencies** | MOD-010 |

**Features:**
- Reviewer onboarding
- Availability management
- Candidate evaluation
- Interview Kit generation

---

#### MOD-012: Lifecycle Management

| Attribute | Value |
|-----------|-------|
| **Purpose** | State machine for provider verification journey |
| **Primary Tables** | `lifecycle_stages` (reference), lifecycle columns in enrollments |
| **Key Files** | `src/services/lifecycleService.ts`, `src/constants/lifecycle.constants.ts` |
| **Dependencies** | None (Core) |

**States:** 21 lifecycle statuses from rank 10 (invited) to rank 210 (inactive)

**Lock Thresholds:**
- Configuration: rank 100
- Content: rank 100
- Everything: rank 140

**Source Reference:** `src/constants/lifecycle.constants.ts:8-16`

---

#### MOD-013: Industry Pulse - Content

| Attribute | Value |
|-----------|-------|
| **Purpose** | Content creation and publishing |
| **Primary Tables** | `pulse_content`, `pulse_content_tags`, `pulse_tags` |
| **Key Files** | `src/hooks/queries/usePulseContent.ts` |
| **Dependencies** | MOD-015 |

**Content Types:**
| Type | XP Reward |
|------|-----------|
| podcast | 200 |
| reel | 100 |
| article | 150 |
| gallery | 75 |
| spark | 50 |
| post | 25 |

**Source Reference:** `src/constants/pulse.constants.ts:10-19`

---

#### MOD-014: Industry Pulse - Social

| Attribute | Value |
|-----------|-------|
| **Purpose** | Social engagement and interactions |
| **Primary Tables** | `pulse_engagements`, `pulse_comments`, `pulse_connections`, `pulse_notifications` |
| **Key Files** | `src/hooks/queries/usePulseEngagements.ts`, `src/hooks/queries/usePulseSocial.ts` |
| **Dependencies** | MOD-013, MOD-015 |

**Engagement Types:**
| Type | XP to Creator |
|------|---------------|
| fire | 2 |
| gold | 15 |
| save | 5 |
| bookmark | 0 |

**Source Reference:** `src/constants/pulse.constants.ts:20-27`

---

#### MOD-015: Industry Pulse - Gamification

| Attribute | Value |
|-----------|-------|
| **Purpose** | XP, levels, streaks, loot boxes |
| **Primary Tables** | `pulse_provider_stats`, `pulse_xp_audit_log`, `pulse_loot_boxes`, `pulse_daily_standups` |
| **Key Files** | `src/hooks/queries/usePulseStats.ts`, `src/constants/pulse.constants.ts` |
| **Dependencies** | MOD-013 |

**Level Formula:**
```
level = MAX(1, FLOOR(SQRT(totalXp / 20)) + 1)
```

**Streak Multipliers:**
| Days | Multiplier |
|------|------------|
| 365+ | 3.0x |
| 180+ | 2.5x |
| 90+ | 2.0x |
| 30+ | 1.75x |
| 14+ | 1.5x |
| 7+ | 1.25x |
| 0+ | 1.0x |

**Source Reference:** `src/constants/pulse.constants.ts:135-156`

---

#### MOD-016: PulseCards Wiki

| Attribute | Value |
|-----------|-------|
| **Purpose** | Collaborative wiki-style content |
| **Primary Tables** | `pulse_card_topics`, `pulse_cards`, `pulse_card_layers`, `pulse_card_votes` |
| **Key Files** | `src/hooks/queries/usePulseCards.ts`, `src/constants/pulseCards.constants.ts` |
| **Dependencies** | MOD-015 |

**Reputation Tiers:**
| Tier | Min Rep | Max Rep | Description |
|------|---------|---------|-------------|
| Seedling | 0 | 49 | Can view, react, comment |
| Contributor | 50 | 199 | Can start cards |
| Builder | 200 | 499 | Can build on any card |
| Expert | 500 | 999 | Vote carries 2x weight |
| Trust Council | 1000+ | ∞ | Moderation powers |

**Source Reference:** `src/constants/pulseCards.constants.ts:9-15`

---

#### MOD-017: Admin Master Data

| Attribute | Value |
|-----------|-------|
| **Purpose** | System configuration and reference data management |
| **Primary Tables** | `countries`, `industry_segments`, `expertise_levels`, `capability_tags`, `interview_kit_competencies`, `interview_kit_questions`, `interview_quorum_requirements`, `organization_types`, `participation_modes`, `system_settings` |
| **Key Files** | `src/hooks/queries/useMasterData.ts`, `src/hooks/queries/useCountries.ts`, `src/hooks/queries/useIndustrySegments.ts` |
| **Dependencies** | None (Reference Data) |

---

## 4. Source File Inventory

### 4.1 Services Layer (16 files)

| Service File | Module | Lines | Purpose |
|--------------|--------|-------|---------|
| `assessmentService.ts` | MOD-008 | 382 | Assessment lifecycle operations |
| `assessmentResultsService.ts` | MOD-008 | 150 | Results calculation |
| `availabilityService.ts` | MOD-010 | 200 | Slot management |
| `cascadeResetService.ts` | MOD-012 | 180 | Cascade delete operations |
| `enrollmentDeletionService.ts` | MOD-002 | 250 | Enrollment removal |
| `enrollmentService.ts` | MOD-002 | 300 | Enrollment CRUD |
| `enrollmentTestRunner.ts` | Testing | 400 | Automated tests |
| `interviewKitGenerationService.ts` | MOD-011 | 280 | Question generation |
| `lifecycleService.ts` | MOD-012 | 237 | State machine rules |
| `proofPointsScoreService.ts` | MOD-007 | 111 | Scoring formula |
| `providerService.ts` | MOD-002 | 200 | Provider operations |
| `pulseSocialTestRunner.ts` | Testing | 600 | Pulse tests |
| `questionGenerationService.ts` | MOD-009 | 350 | Question bank management |
| `rescheduleService.ts` | MOD-010 | 180 | Interview rescheduling |
| `smokeTestRunner.ts` | Testing | 200 | System health checks |
| `wizardNavigationService.ts` | MOD-002 | 324 | Navigation logic |

### 4.2 Query Hooks Layer (58 files)

| Hook File | Module | Purpose |
|-----------|--------|---------|
| `useAcademicTaxonomy.ts` | MOD-006 | Academic hierarchy queries |
| `useAdminReviewerSlots.ts` | MOD-011 | Admin slot management |
| `useAssessment.ts` | MOD-008 | Assessment operations |
| `useAssessmentQuestions.ts` | MOD-008 | Question fetching |
| `useAssessmentResults.ts` | MOD-008 | Results queries |
| `useCancelOrgApproval.ts` | MOD-004 | Approval cancellation |
| `useCandidateDetail.ts` | MOD-011 | Candidate info |
| `useCandidateExpertise.ts` | MOD-011 | Expertise display |
| `useCandidateProofPoints.ts` | MOD-011 | Proof points review |
| `useCapabilityTags.ts` | MOD-009 | Tag management |
| `useClearProviderMode.ts` | MOD-003 | Mode reset |
| `useCompiledNarrative.ts` | MOD-011 | Profile narrative |
| `useCountries.ts` | MOD-017 | Countries lookup |
| `useEnrollmentAssessment.ts` | MOD-008 | Enrollment-scoped assessment |
| `useEnrollmentCompletion.ts` | MOD-002 | Completion tracking |
| `useEnrollmentExpertise.ts` | MOD-002 | Expertise selection |
| `useEnrollmentParticipationMode.ts` | MOD-003 | Mode selection |
| `useExpertiseLevels.ts` | MOD-017 | Levels lookup |
| `useFinalResultData.ts` | MOD-002 | Certification results |
| `useHierarchyResolver.ts` | MOD-005 | Taxonomy resolution |
| `useHierarchyResolverOptimized.ts` | MOD-005 | Optimized resolution |
| `useIndustrySegments.ts` | MOD-017 | Industry lookup |
| `useInterviewKitCompetencies.ts` | MOD-011 | Competency config |
| `useInterviewKitEvaluation.ts` | MOD-011 | Evaluation CRUD |
| `useInterviewKitQuestions.ts` | MOD-011 | Question management |
| `useInterviewQuorumAdmin.ts` | MOD-017 | Quorum config |
| `useInterviewScheduling.ts` | MOD-010 | Booking operations |
| `useInvitations.ts` | MOD-001 | Invitation system |
| `useLevelSpecialityMap.ts` | MOD-005 | Level-speciality mapping |
| `useLifecycleValidation.ts` | MOD-012 | Lifecycle checks |
| `useManagerApproval.ts` | MOD-004 | Approval workflow |
| `useMasterData.ts` | MOD-017 | Generic master data |
| `useOrganizationTypes.ts` | MOD-017 | Org types lookup |
| `usePanelReviewers.ts` | MOD-011 | Reviewer management |
| `useParticipationModes.ts` | MOD-003 | Mode lookup |
| `useProficiencyTaxonomy.ts` | MOD-005 | Taxonomy queries |
| `useProficiencyTaxonomyAdmin.ts` | MOD-005 | Admin taxonomy |
| `useProofPoints.ts` | MOD-007 | Proof points CRUD |
| `useProvider.ts` | MOD-002 | Provider data |
| `useProviderEnrollments.ts` | MOD-002 | Multi-enrollment |
| `useProviderHierarchy.ts` | MOD-005 | Provider taxonomy |
| `useProviderSelectedTaxonomy.ts` | MOD-005 | Selected items |
| `usePulseCardLayers.ts` | MOD-016 | Card layers |
| `usePulseCardTopics.ts` | MOD-016 | Topic management |
| `usePulseCardVotes.ts` | MOD-016 | Voting system |
| `usePulseCards.ts` | MOD-016 | Card CRUD |
| `usePulseCardsReputation.ts` | MOD-016 | Reputation tracking |
| `usePulseContent.ts` | MOD-013 | Content CRUD |
| `usePulseEngagements.ts` | MOD-014 | Engagement CRUD |
| `usePulseModeration.ts` | MOD-014 | Content moderation |
| `usePulseSocial.ts` | MOD-014 | Social features |
| `usePulseStats.ts` | MOD-015 | Gamification stats |
| `useQuestionBank.ts` | MOD-009 | Question management |
| `useRescheduleEligibility.ts` | MOD-010 | Reschedule checks |
| `useReviewerAvailability.ts` | MOD-011 | Availability CRUD |
| `useReviewerCandidates.ts` | MOD-011 | Candidate listing |
| `useReviewerDashboard.ts` | MOD-011 | Dashboard data |
| `useReviewerSlotActions.ts` | MOD-011 | Slot actions |
| `useUnifiedPulseFeed.ts` | MOD-013 | Unified feed |

### 4.3 Constants Files (9 files)

| Constant File | Purpose |
|---------------|---------|
| `assessment.constants.ts` | Assessment configuration |
| `certification.constants.ts` | Scoring weights, thresholds |
| `import.constants.ts` | Data import settings |
| `interview-kit.constants.ts` | Interview configuration |
| `lifecycle.constants.ts` | Lifecycle ranks, thresholds |
| `pulse.constants.ts` | Gamification parameters |
| `pulseCards.constants.ts` | PulseCards reputation |
| `question-generation.constants.ts` | Question bank settings |
| `index.ts` | Re-exports |

---

## 5. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 18.3.1 |
| Type System | TypeScript | 5.x |
| State Management | TanStack Query | 5.83.0 |
| Routing | React Router DOM | 6.30.1 |
| UI Components | shadcn/ui + Radix | Various |
| Styling | Tailwind CSS | 3.x |
| Forms | React Hook Form + Zod | 7.61.1, 3.25.76 |
| Database | Supabase (PostgreSQL) | 2.90.1 |
| Authentication | Supabase Auth | Integrated |
| Storage | Supabase Storage | Integrated |
| Edge Functions | Deno | Runtime |

---

## 6. Statistics Summary

```text
═══════════════════════════════════════════════════════════════
                    CODEBASE STATISTICS
═══════════════════════════════════════════════════════════════

SOURCE FILES ANALYZED
────────────────────────────────────────────────────────────────
• Services:           16 files
• Query Hooks:        58 files
• Constants:           9 files
• Components:        100+ files
• Pages:              30+ files
────────────────────────────────────────────────────────────────
TOTAL:              ~250 files

DATABASE ARTIFACTS
────────────────────────────────────────────────────────────────
• Migrations:        110 files
• Tables:             50+ tables
• RLS Policies:      100+ policies
• Database Functions: 30+ functions

MODULE BREAKDOWN
────────────────────────────────────────────────────────────────
• Core Modules:           17
• Complete Modules:       17 (100%)
• Partial Modules:         0 (0%)

═══════════════════════════════════════════════════════════════
```

---

## 7. Document Cross-References

| Related Document | Description |
|------------------|-------------|
| QA-02-Data-Model-Documentation.md | Complete database schema |
| QA-03-User-Stories-Catalog.md | User stories by module |
| QA-04-Business-Rules-Catalog.md | Business rules |
| QA-05-Validation-Rules-Catalog.md | Field validations |
| QA-06-Calculations-State-Machines.md | Formulas and state machines |
| QA-07-Test-Case-Catalog.md | Test cases |
| QA-08-API-Documentation.md | API operations |
| QA-09-E2E-Workflows.md | End-to-end workflows |
| QA-10-Traceability-Matrix.md | Full traceability |

---

**Document End - QA-01**
