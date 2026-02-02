
# Complete Solution Provider Status Reference Guide (FINAL)

## Document Status: ✅ FULLY IMPLEMENTED

All features described in this guide have been implemented in the codebase. This document serves as the authoritative reference for the Solution Provider lifecycle, certification, and invitation systems.

---

## PART 1: Provider Categories (Entry Points)

| Category | System Value | How Provider Enters System | Verification Required? |
|----------|--------------|---------------------------|----------------------|
| **Self-Registered** | `registration_mode = 'self_registered'` | Signs up on their own via public signup page | YES - Full 9-step enrollment |
| **Invited (Standard)** | `invitation_type = 'standard'` | Receives email invitation from Platform Admin, accepts and signs up | YES - Full 9-step enrollment |
| **Invited (VIP Expert)** | `invitation_type = 'vip_expert'` | Receives VIP invitation from Platform Admin, accepts and signs up | NO - Bypasses enrollment, auto-certified |

### Implementation Files:
- `src/pages/Register.tsx` - Detects invitation context and passes metadata
- `src/pages/InviteAccept.tsx` - Validates invitation tokens
- `supabase/functions/accept-provider-invitation/index.ts` - Token validation edge function

---

## PART 2: Complete Lifecycle Status Table (22 Statuses)

| # | Status Code | Rank | Display Name | Wizard Step | Trigger Condition |
|---|-------------|------|--------------|-------------|-------------------|
| 1 | `invited` | 10 | Invited | Pre-Step 1 | Platform Admin sends invitation email |
| 2 | `registered` | 15 | Registered | Step 1 Start | User creates account (email + password verified) |
| 3 | `enrolled` | 20 | Enrolled | Step 1 Complete | User submits Step 1 form (name, address, country, pin code) |
| 4 | `mode_selected` | 30 | Mode Selected | Step 2 Complete | User selects participation mode (Independent or Company) |
| 5 | `org_info_pending` | 35 | Org Info Pending | Step 3 Submitted | User submits organization details, awaiting validation |
| 6 | `org_validated` | 40 | Org Validated | Step 3 Approved | Admin validates organization details |
| 7 | `expertise_selected` | 50 | Expertise Selected | Step 4 Complete | User selects Industry + Expertise Level + Proficiency Areas + Specialities |
| 8 | `profile_building` | 55 | Profile Building | Step 5 Started | User starts adding proof points (but hasn't added any yet) |
| 9 | `proof_points_started` | 60 | Proof Points Started | Step 5 In Progress | User adds at least 1 proof point |
| 10 | `proof_points_min_met` | 70 | Proof Points Min Met | Step 5 Complete | User meets minimum proof point requirements (e.g., 3 proof points) |
| 11 | `assessment_pending` | 90 | Assessment Pending | Step 6 Ready | User is eligible to start assessment but hasn't started |
| 12 | `assessment_in_progress` | 100 | Assessment In Progress | Step 6 Active | User clicks 'Start Assessment' - timer begins |
| 13 | `assessment_completed` | 105 | Assessment Completed | Step 6 Submitted | User submits assessment (or timer expires) |
| 14 | `assessment_passed` | 110 | Assessment Passed | Step 6 Passed | User scored >= 70% |
| 15 | `panel_scheduled` | 120 | Panel Scheduled | Step 7 Complete | User books interview slot |
| 16 | `panel_completed` | 130 | Panel Completed | Step 8 Complete | Interview is completed (interviewer marks as done) |
| 17 | `active` | 135 | Active | Post-Verification | Provider is actively engaging on platform |
| 18 | `certified` | 140 | Certified | Final Success | Full certification complete with star rating |
| 19 | `not_certified` | 150 | Not Certified | Step 9 (Failed) | Composite score < 51% |
| 20 | `suspended` | 200 | Suspended | Admin Action | Admin suspends account (policy violation, etc.) |
| 21 | `inactive` | 210 | Inactive | Admin Action / Auto | Account deactivated by admin or auto-deactivated |

### Implementation Files:
- `src/constants/lifecycle.constants.ts` - `LIFECYCLE_RANKS` object with all status codes and ranks
- `src/services/lifecycleService.ts` - Status checking functions (`isTerminalState`, `isHiddenState`, etc.)

---

## PART 3: Verification Status (Separate Field)

| Status | System Value | When Applied | Who Applies |
|--------|--------------|--------------|-------------|
| Pending | `verification_status = 'pending'` | Default when provider first registers | System (automatic) |
| In Progress | `verification_status = 'in_progress'` | When assessment starts (rank 100+) | System (automatic) |
| Verified | `verification_status = 'verified'` | When certification is successful | System (automatic) |
| Rejected | `verification_status = 'rejected'` | When certification fails | System (automatic) |
| NULL | `verification_status = NULL` | VIP Expert providers (no verification needed) | System (automatic) |

### Implementation:
- Updated by `finalize_certification` RPC when certification is processed

---

## PART 4: Certification Levels (For Successfully Certified Providers)

| Certification Level | Star Rating | Composite Score Range | Display Badge |
|---------------------|-------------|----------------------|---------------|
| Not Certified | 0 ⭐ | 0% - 50.9% | ❌ Not Certified |
| Basic | 1 ⭐ | 51% - 65.9% | ⭐ Certified (Basic) |
| Competent | 2 ⭐⭐ | 66% - 85.9% | ⭐⭐ Certified (Competent) |
| Expert | 3 ⭐⭐⭐ | 86% - 100% | ⭐⭐⭐ Certified (Expert) |

### Composite Score Formula:

```text
Composite = (Proof Points × 30%) + (Assessment Score × 50%) + (Interview Score × 20%)

Where:
- Proof Points: proof_points_final_score (0-10 scale, normalized to percentage)
- Assessment Score: score_percentage from assessment_attempts (0-100)
- Interview Score: interview_score_out_of_10 (normalized to percentage)
```

### Implementation Files:
- `src/constants/certification.constants.ts` - `SCORE_WEIGHTS`, `CERTIFICATION_THRESHOLDS`, `calculateCompositeScore()`
- `src/types/certification.types.ts` - `CertificationLevel` type, `CERTIFICATION_LEVEL_DISPLAY` config
- `src/components/ui/StarRating.tsx` - Visual star display component

---

## PART 5: Final Status Matrix by Provider Type

| Registration Mode | Invitation Type | Enrollment Outcome | lifecycle_status | verification_status | certification_level | star_rating |
|-------------------|-----------------|-------------------|------------------|---------------------|---------------------|-------------|
| `invitation` | `vip_expert` | N/A (Bypassed) | `certified` (140) | `NULL` | `expert` | 3 |
| `invitation` | `standard` | Success (51%+) | `certified` (140) | `verified` | Based on score | 1/2/3 |
| `invitation` | `standard` | Failed (<51%) | `not_certified` (150) | `rejected` | `NULL` | `NULL` |
| `invitation` | `standard` | Not Started | `registered` (15) to `proof_points_min_met` (70) | `pending` | `NULL` | `NULL` |
| `invitation` | `standard` | In Progress | `assessment_in_progress` (100) to `panel_completed` (130) | `in_progress` | `NULL` | `NULL` |
| `self_registered` | N/A | Success (51%+) | `certified` (140) | `verified` | Based on score | 1/2/3 |
| `self_registered` | N/A | Failed (<51%) | `not_certified` (150) | `rejected` | `NULL` | `NULL` |
| `self_registered` | N/A | Not Started | `registered` (15) to `proof_points_min_met` (70) | `pending` | `NULL` | `NULL` |
| `self_registered` | N/A | In Progress | `assessment_in_progress` (100) to `panel_completed` (130) | `in_progress` | `NULL` | `NULL` |

---

## PART 6: VIP Expert Flow (Special Case)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ VIP EXPERT BYPASS FLOW                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Step 1: Admin sends VIP invitation                                          │
│         → solution_provider_invitations.invitation_type = 'vip_expert'      │
│                                                                             │
│ Step 2: VIP clicks invitation link                                          │
│         → /invite/:token route validates token                              │
│         → Stores invitation data in sessionStorage                          │
│         → Redirects to /register?invitation=true                            │
│                                                                             │
│ Step 3: VIP completes condensed registration form                           │
│         → Form shows VIP Expert badge                                       │
│         → Only email (readonly) and password fields shown                   │
│         → signUp metadata includes invitation_id + industry_segment_id      │
│                                                                             │
│ Step 4: Database trigger auto-certifies                                     │
│         → handle_new_user trigger detects invitation_type = 'vip_expert'    │
│         → solution_providers.registration_mode = 'invitation'               │
│         → solution_providers.lifecycle_status = 'certified'                 │
│         → solution_providers.lifecycle_rank = 140                           │
│         → solution_providers.verification_status = NULL                     │
│                                                                             │
│ Step 5: Auto-create enrollment with certification                           │
│         → provider_industry_enrollments.lifecycle_status = 'certified'      │
│         → provider_industry_enrollments.certification_level = 'expert'      │
│         → provider_industry_enrollments.star_rating = 3                     │
│         → provider_industry_enrollments.composite_score = 100               │
│         → provider_industry_enrollments.certified_at = NOW()                │
│                                                                             │
│ Result: VIP is immediately visible to seekers with 3-star Expert badge      │
│         No enrollment wizard, no assessment, no interview                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Files:
- `src/pages/InviteAccept.tsx` - Token validation and redirect
- `src/hooks/queries/useValidateInvitation.ts` - Edge function call
- `src/pages/Register.tsx` - VIP condensed form with badge display
- Database: `handle_new_user` trigger with VIP detection logic

---

## PART 7: Standard/Self-Registered Flow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ STANDARD ENROLLMENT FLOW (9 Steps)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Step 1: Registration → lifecycle_status = 'registered' (15)                 │
│                        → verification_status = 'pending'                    │
│                                                                             │
│ Step 2-5: Profile Building                                                  │
│         → Progresses through enrolled (20) → proof_points_min_met (70)      │
│         → verification_status remains 'pending'                             │
│                                                                             │
│ Step 6: Assessment                                                          │
│         → assessment_in_progress (100)                                      │
│         → verification_status = 'in_progress'                               │
│         → LOCK: Steps 1-5 become read-only                                  │
│                                                                             │
│ Step 7: Interview Scheduling                                                │
│         → panel_scheduled (120)                                             │
│                                                                             │
│ Step 8: Panel Interview                                                     │
│         → panel_completed (130)                                             │
│                                                                             │
│ Step 9: Certification Decision (via Finalize Certification button)          │
│         → Reviewer clicks "Finalize Certification" in FinalResultTab        │
│         → System calculates composite score                                 │
│         → Calls finalize_certification RPC                                  │
│                                                                             │
│         IF composite_score >= 51%:                                          │
│           → lifecycle_status = 'certified' (140)                            │
│           → verification_status = 'verified'                                │
│           → certification_level = 'basic'/'competent'/'expert'              │
│           → star_rating = 1/2/3                                             │
│           → certified_at = NOW()                                            │
│         ELSE:                                                               │
│           → lifecycle_status = 'not_certified' (150)                        │
│           → verification_status = 'rejected'                                │
│           → certification_level = NULL                                      │
│           → star_rating = NULL                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Files:
- `src/hooks/mutations/useFinalizeCertification.ts` - Score calculation and RPC call
- `src/components/reviewer/candidates/FinalResultTabContent.tsx` - Finalize button UI
- Database: `finalize_certification` RPC function

---

## PART 8: Implementation Status ✅ ALL COMPLETE

| Feature | Status | Implementation Details |
|---------|--------|----------------------|
| `registration_mode` column | ✅ **IMPLEMENTED** | Added to `solution_providers` table as ENUM ('self_registered', 'invitation') |
| `invitation_id` column | ✅ **IMPLEMENTED** | Added to `solution_providers` as FK to `solution_provider_invitations` |
| `composite_score` column | ✅ **IMPLEMENTED** | Added to `provider_industry_enrollments` as DECIMAL(5,2) |
| `certification_level` column | ✅ **IMPLEMENTED** | Added to `provider_industry_enrollments` as VARCHAR(20) |
| `star_rating` column | ✅ **IMPLEMENTED** | Added to `provider_industry_enrollments` as INTEGER CHECK (0-3) |
| `certified_at` column | ✅ **IMPLEMENTED** | Added to `provider_industry_enrollments` as TIMESTAMPTZ |
| `certified_by` column | ✅ **IMPLEMENTED** | Added to `provider_industry_enrollments` as FK to auth.users |
| VIP bypass logic | ✅ **IMPLEMENTED** | `handle_new_user` trigger auto-certifies VIP experts |
| Invitation acceptance page | ✅ **IMPLEMENTED** | `/invite/:token` route with token validation |
| Registration invitation flow | ✅ **IMPLEMENTED** | Pre-fill form, VIP condensed form, metadata passing |
| Certification level assignment | ✅ **IMPLEMENTED** | `finalize_certification` RPC with thresholds |
| Composite score calculation | ✅ **IMPLEMENTED** | `calculateCompositeScore()` with 30/50/20 weights |
| Star rating display | ✅ **IMPLEMENTED** | `StarRating` component on Dashboard & Certification pages |
| Finalize Certification UI | ✅ **IMPLEMENTED** | Button in FinalResultTabContent for reviewers |

---

## PART 9: Complete File Reference

### Database Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260202172023_*.sql` | Schema additions: columns, enums, indexes, RPCs, trigger updates |

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/accept-provider-invitation/index.ts` | Validates invitation tokens, returns pre-fill data |

### Constants & Types
| File | Purpose |
|------|---------|
| `src/constants/lifecycle.constants.ts` | `LIFECYCLE_RANKS`, `LOCK_THRESHOLDS`, `STATUS_DISPLAY_NAMES` |
| `src/constants/certification.constants.ts` | `SCORE_WEIGHTS`, `CERTIFICATION_THRESHOLDS`, `calculateCompositeScore()` |
| `src/types/certification.types.ts` | `CertificationLevel`, `RegistrationMode`, display config |

### Services
| File | Purpose |
|------|---------|
| `src/services/lifecycleService.ts` | `canModifyField()`, `isTerminalState()`, `getLifecycleRank()` |
| `src/services/enrollmentService.ts` | Enrollment types with certification fields |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/mutations/useFinalizeCertification.ts` | Calculate composite, call RPC, invalidate queries |
| `src/hooks/queries/useValidateInvitation.ts` | Validate token via edge function |
| `src/hooks/queries/useFinalResultData.ts` | Aggregate all data for reviewer panel |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/InviteAccept.tsx` | `/invite/:token` - validate and redirect |
| `src/pages/Register.tsx` | Invitation detection, VIP form, metadata passing |
| `src/pages/Dashboard.tsx` | Star rating display for certified enrollments |
| `src/pages/enroll/Certification.tsx` | Full certification display with level and stars |

### Components
| File | Purpose |
|------|---------|
| `src/components/ui/StarRating.tsx` | Visual 0-3 star display with level colors |
| `src/components/reviewer/candidates/FinalResultTabContent.tsx` | Finalize button + certification display |

### Routing
| File | Purpose |
|------|---------|
| `src/App.tsx` | `/invite/:token` route added |

---

## PART 10: Lock Thresholds Reference

| Threshold | Rank | What Gets Locked |
|-----------|------|------------------|
| `CONFIGURATION` | 100 | Industry, Expertise Level, Specialities |
| `CONTENT` | 100 | Registration, Mode, Org, Proof Points |
| `EVERYTHING` | 140 | All fields frozen (terminal states) |

### Implementation:
- `src/services/lifecycleService.ts` - `canModifyField()` function
- `src/constants/lifecycle.constants.ts` - `LOCK_THRESHOLDS` object

---

## Summary

**This guide represents the complete, fully-implemented Solution Provider lifecycle system.** All 22 lifecycle statuses, 3 provider categories, 4 certification levels, and both VIP bypass and standard enrollment flows are operational in the codebase.

The system supports:
- ✅ Self-registration with full 9-step enrollment
- ✅ Standard invitations with full 9-step enrollment
- ✅ VIP Expert invitations with auto-certification bypass
- ✅ Composite score calculation (30% proof + 50% assessment + 20% interview)
- ✅ Certification level assignment (Basic/Competent/Expert)
- ✅ Star rating display (1-3 stars)
- ✅ Lifecycle-based field locking
- ✅ Terminal state handling (suspended, inactive)
