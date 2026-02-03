

# Post-Interview Failure: Re-Attempt & Expertise Change Policy Implementation

## Document Reference
Based on **Requirements Document v1.1 (Revised)** - "Post-Interview Failure: Re-Attempt & Expertise Change Policy" (February 2026, Approved for Implementation)

---

## Executive Summary

This plan implements a **startup-friendly, self-service** post-interview failure policy with the following key decisions:

| Decision | Value |
|----------|-------|
| **Status Name** | `interview_unsuccessful` (replaces `not_certified`) |
| **Attempts Limit** | **UNLIMITED** (no maximum) |
| **Cooling-Off** | 30 days (1st) → 60 days (2nd) → 90 days (3rd+) |
| **Industry Change** | **NEVER** allowed (must create new enrollment) |
| **Expertise Change** | YES (triggers mandatory re-flow) |
| **Admin Approval** | NOT required (self-service model) |
| **Improvement Plan** | NOT required (reduces friction) |

---

## Phase 1: Database Schema Updates

### 1.1 Add New Columns to `provider_industry_enrollments`

```sql
ALTER TABLE provider_industry_enrollments ADD COLUMN
  interview_attempt_count INTEGER NOT NULL DEFAULT 0,
  last_interview_failed_at TIMESTAMPTZ,
  reattempt_eligible_after TIMESTAMPTZ;
```

### 1.2 Update Lifecycle Status Enum

Rename `not_certified` to `interview_unsuccessful` in:
- Database enum type (if exists)
- All references in triggers/functions

### 1.3 Update `finalize_certification` RPC

Modify to:
- Set `interview_unsuccessful` status when score < 51%
- Increment `interview_attempt_count`
- Set `last_interview_failed_at = NOW()`
- Calculate `reattempt_eligible_after` based on attempt count

---

## Phase 2: Constants & Types Updates

### 2.1 Update `src/constants/lifecycle.constants.ts`

```typescript
// Change status name
export const LIFECYCLE_RANKS: Record<string, number> = {
  // ... existing statuses ...
  certified: 140,
  interview_unsuccessful: 150,  // Renamed from not_certified
  suspended: 200,
  inactive: 210,
};

// Update terminal states
export const TERMINAL_STATES = ['certified', 'interview_unsuccessful', 'suspended', 'inactive'] as const;

// Update view-only states
export const VIEW_ONLY_STATES = ['certified', 'interview_unsuccessful'] as const;

// Add re-interview eligible state
export const REATTEMPT_ELIGIBLE_STATES = ['interview_unsuccessful'] as const;

// Update display names
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  // ... existing ...
  interview_unsuccessful: 'Interview Unsuccessful',
};
```

### 2.2 Create `src/constants/interview-retake.constants.ts`

```typescript
export const INTERVIEW_RETAKE_POLICY = {
  /** Cooling-off periods by attempt number (in days) */
  COOLING_OFF_PERIODS: {
    FIRST_FAILURE: 30,
    SECOND_FAILURE: 60,
    THIRD_PLUS_FAILURE: 90,
  },
  
  /** NO maximum limit - unlimited attempts */
  MAX_INTERVIEW_ATTEMPTS: null, // Explicit null = unlimited
  
  /** What can be changed after interview failure */
  CHANGEABLE_FIELDS: {
    industry_segment_id: false,    // NEVER changeable
    expertise_level_id: true,      // Can change → triggers re-flow
    proficiency_areas: true,       // Can change → triggers re-flow
    specialities: true,            // Can change → triggers re-flow
  },
  
  /** Status reset target when expertise is modified */
  EXPERTISE_CHANGE_RESET_TO: 'expertise_selected',
  EXPERTISE_CHANGE_RESET_RANK: 50,
} as const;

/**
 * Calculate cooling-off days based on attempt number
 */
export function getCoolingOffDays(attemptCount: number): number {
  const { COOLING_OFF_PERIODS } = INTERVIEW_RETAKE_POLICY;
  
  if (attemptCount === 1) return COOLING_OFF_PERIODS.FIRST_FAILURE;
  if (attemptCount === 2) return COOLING_OFF_PERIODS.SECOND_FAILURE;
  return COOLING_OFF_PERIODS.THIRD_PLUS_FAILURE; // 3rd and all subsequent
}

/**
 * Check if provider can schedule re-interview (cooling-off elapsed)
 */
export function canScheduleReinterview(
  reattemptEligibleAfter: Date | null,
  currentDate: Date = new Date()
): boolean {
  if (!reattemptEligibleAfter) return false;
  return currentDate >= new Date(reattemptEligibleAfter);
}
```

### 2.3 Update `src/constants/certification.constants.ts`

Update outcome type and display:

```typescript
export type CertificationOutcome = 'interview_unsuccessful' | 'one_star' | 'two_star' | 'three_star';

export const OUTCOME_DISPLAY: Record<CertificationOutcome, {...}> = {
  interview_unsuccessful: {
    label: 'Interview Unsuccessful',
    stars: 0,
    level: null,
    colorClass: 'text-amber-600',  // Changed from destructive to encourage retry
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  // ... rest unchanged
};
```

---

## Phase 3: Service Layer Updates

### 3.1 Update `src/services/lifecycleService.ts`

Add new functions for post-interview failure handling:

```typescript
/**
 * Check if provider is in interview_unsuccessful state with re-attempt pathway
 */
export function canReattemptInterview(status: string): boolean {
  return REATTEMPT_ELIGIBLE_STATES.includes(status as typeof REATTEMPT_ELIGIBLE_STATES[number]);
}

/**
 * Check if expertise can be modified (only after interview failure)
 * Industry segment NEVER changeable
 */
export function canModifyExpertiseAfterFailure(
  status: string,
  fieldName: string
): { allowed: boolean; reason?: string } {
  // Must be in interview_unsuccessful status
  if (status !== 'interview_unsuccessful') {
    return { 
      allowed: false, 
      reason: 'Expertise changes are only allowed after interview failure.' 
    };
  }
  
  // Industry segment NEVER changeable
  if (fieldName === 'industry_segment_id') {
    return { 
      allowed: false, 
      reason: 'Industry segment cannot be changed. Please create a new enrollment for a different industry.' 
    };
  }
  
  return { allowed: true };
}

/**
 * Get cascade impact for expertise change after interview failure
 * Triggers full re-flow: proof points → assessment → interview
 */
export function getExpertiseChangeReflowImpact(): CascadeImpact {
  return {
    type: 'HARD_RESET',
    deletesProofPoints: true,           // All proof points cleared
    deletesSpecialities: true,          // If specialities changed
    resetsToStatus: 'expertise_selected',
    resetsToRank: LIFECYCLE_RANKS.expertise_selected, // 50
    warningLevel: 'critical',
    message: 'Changing your expertise will clear all proof points and assessment. You will need to re-submit proof points and re-take the assessment before scheduling a new interview.',
  };
}
```

### 3.2 Create `src/services/interviewRetakeService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { getCoolingOffDays, INTERVIEW_RETAKE_POLICY } from '@/constants/interview-retake.constants';
import { LIFECYCLE_RANKS } from '@/constants/lifecycle.constants';

export interface ReinterviewEligibility {
  isEligible: boolean;
  daysRemaining: number;
  eligibleAfter: Date | null;
  attemptCount: number;
  canModifyExpertise: boolean;
}

/**
 * Check re-interview eligibility for an enrollment
 */
export async function checkReinterviewEligibility(
  enrollmentId: string
): Promise<ReinterviewEligibility> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments')
    .select('lifecycle_status, interview_attempt_count, reattempt_eligible_after')
    .eq('id', enrollmentId)
    .single();
    
  if (error || !data) {
    throw new Error('Failed to check re-interview eligibility');
  }
  
  const now = new Date();
  const eligibleAfter = data.reattempt_eligible_after 
    ? new Date(data.reattempt_eligible_after) 
    : null;
  
  const daysRemaining = eligibleAfter 
    ? Math.max(0, Math.ceil((eligibleAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  return {
    isEligible: data.lifecycle_status === 'interview_unsuccessful' && 
                eligibleAfter !== null && 
                now >= eligibleAfter,
    daysRemaining,
    eligibleAfter,
    attemptCount: data.interview_attempt_count || 0,
    canModifyExpertise: data.lifecycle_status === 'interview_unsuccessful',
  };
}

/**
 * Reset enrollment for expertise change re-flow
 * Called when provider modifies expertise after interview failure
 */
export async function resetForExpertiseChange(enrollmentId: string): Promise<void> {
  const { error } = await supabase
    .from('provider_industry_enrollments')
    .update({
      lifecycle_status: INTERVIEW_RETAKE_POLICY.EXPERTISE_CHANGE_RESET_TO,
      lifecycle_rank: INTERVIEW_RETAKE_POLICY.EXPERTISE_CHANGE_RESET_RANK,
      // Clear assessment data
      latest_assessment_attempt_id: null,
      // Keep interview_attempt_count (doesn't reset)
      // Keep reattempt_eligible_after (still applies)
    })
    .eq('id', enrollmentId);
    
  if (error) throw error;
  
  // Delete all proof points for this enrollment
  await supabase
    .from('proof_points')
    .delete()
    .eq('enrollment_id', enrollmentId);
}
```

---

## Phase 4: Hook Updates

### 4.1 Create `src/hooks/queries/useReinterviewEligibility.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { checkReinterviewEligibility } from '@/services/interviewRetakeService';

export function useReinterviewEligibility(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['reinterview-eligibility', enrollmentId],
    queryFn: () => checkReinterviewEligibility(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### 4.2 Create `src/hooks/mutations/useModifyExpertise.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resetForExpertiseChange } from '@/services/interviewRetakeService';
import { toast } from 'sonner';

interface ModifyExpertiseParams {
  enrollmentId: string;
  expertiseLevelId?: string;
  proficiencyAreas?: string[];
  specialities?: string[];
}

export function useModifyExpertise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: ModifyExpertiseParams) => {
      // 1. Reset enrollment to expertise_selected
      await resetForExpertiseChange(params.enrollmentId);
      
      // 2. Update expertise configuration
      const updates: Record<string, any> = {};
      if (params.expertiseLevelId) updates.expertise_level_id = params.expertiseLevelId;
      
      const { error } = await supabase
        .from('provider_industry_enrollments')
        .update(updates)
        .eq('id', params.enrollmentId);
        
      if (error) throw error;
      
      // 3. Update specialities if provided
      if (params.specialities) {
        // Clear existing and insert new specialities
        // ... implementation
      }
      
      return { success: true };
    },
    onSuccess: (_, { enrollmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      toast.success('Expertise updated. Please re-submit your proof points and assessment.');
    },
  });
}
```

### 4.3 Update `src/hooks/mutations/useFinalizeCertification.ts`

Update to use new status name and set cooling-off:

```typescript
// In the RPC call, ensure the database function:
// - Uses 'interview_unsuccessful' instead of 'not_certified'
// - Increments interview_attempt_count
// - Calculates reattempt_eligible_after
```

---

## Phase 5: UI Components

### 5.1 Create `src/components/enrollment/InterviewUnsuccessfulCard.tsx`

Dashboard card shown when status = `interview_unsuccessful`:

```typescript
// Features:
// - Status badge: "Interview Unsuccessful"
// - Cooling-off countdown timer
// - Attempt count display
// - Two CTA buttons:
//   1. "Schedule Re-Interview" (enabled after cooling-off, PATH A)
//   2. "Modify Expertise" (always enabled, PATH B)
// - Clear messaging about both paths
```

### 5.2 Create `src/components/enrollment/ModifyExpertiseDialog.tsx`

Dialog for expertise modification (PATH B):

```typescript
// Features:
// - Current expertise display
// - Expertise level dropdown (changeable)
// - Proficiency areas multi-select (changeable)
// - Specialities selection (changeable)
// - Industry segment display (READ-ONLY, with note: "Cannot be changed")
// - Warning: "This will clear all proof points and assessment"
// - Confirm button triggers re-flow
```

### 5.3 Update Dashboard Components

Update `src/pages/Dashboard.tsx` to show `InterviewUnsuccessfulCard` when applicable.

---

## Phase 6: Update Finalize Certification RPC

### 6.1 Modify Database Function

```sql
CREATE OR REPLACE FUNCTION finalize_certification(
  p_enrollment_id UUID,
  p_composite_score DECIMAL(5,2),
  p_certifying_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_current_attempt_count INTEGER;
  v_cooling_off_days INTEGER;
BEGIN
  -- Get current attempt count
  SELECT COALESCE(interview_attempt_count, 0) + 1
  INTO v_current_attempt_count
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id;
  
  -- Determine cooling-off period
  IF v_current_attempt_count = 1 THEN
    v_cooling_off_days := 30;
  ELSIF v_current_attempt_count = 2 THEN
    v_cooling_off_days := 60;
  ELSE
    v_cooling_off_days := 90;
  END IF;
  
  IF p_composite_score < 51.0 THEN
    -- FAILED: interview_unsuccessful
    UPDATE provider_industry_enrollments SET
      lifecycle_status = 'interview_unsuccessful',
      lifecycle_rank = 150,
      interview_attempt_count = v_current_attempt_count,
      last_interview_failed_at = NOW(),
      reattempt_eligible_after = NOW() + (v_cooling_off_days || ' days')::INTERVAL,
      composite_score = p_composite_score,
      certified_at = NULL,
      certified_by = NULL,
      certification_level = NULL,
      star_rating = NULL
    WHERE id = p_enrollment_id
    RETURNING jsonb_build_object(
      'success', true,
      'lifecycle_status', 'interview_unsuccessful',
      'interview_attempt_count', v_current_attempt_count,
      'reattempt_eligible_after', reattempt_eligible_after,
      'cooling_off_days', v_cooling_off_days
    ) INTO v_result;
  ELSE
    -- PASSED: certified
    -- ... existing certification logic ...
  END IF;
  
  RETURN v_result;
END;
$$;
```

---

## Phase 7: Two Workflow Paths

### PATH A: Direct Re-Interview (No Expertise Changes)

```text
interview_unsuccessful → Wait cooling-off → Schedule Re-Interview → Interview
```

Implementation:
1. Provider waits for cooling-off countdown to complete
2. "Schedule Re-Interview" button becomes enabled
3. Click navigates to interview scheduling (Step 7)
4. Status changes to `panel_scheduled`
5. `interview_attempt_count` remains (will increment on next finalize)

### PATH B: Re-Flow with Expertise Changes

```text
interview_unsuccessful → Modify Expertise → proof_points_started → assessment → Interview
```

Implementation:
1. Provider clicks "Modify Expertise" (available immediately)
2. Dialog shows current config with editable fields (except industry)
3. On confirm:
   - All proof points deleted
   - Assessment cleared
   - Status reset to `expertise_selected` (rank 50)
4. Provider continues from Step 5 (Proof Points)
5. Must still wait for cooling-off before final interview scheduling

---

## Phase 8: What Is Explicitly NOT Implemented

Per document Section 10 (Complexity Removed):

| Feature | Status | Rationale |
|---------|--------|-----------|
| Mandatory improvement plans | ❌ NOT IMPLEMENTED | Adds friction; self-service model |
| Activity tracking system | ❌ NOT IMPLEMENTED | Unnecessary complexity |
| Performance-based cooling reduction | ❌ NOT IMPLEMENTED | Edge cases; minimal benefit |
| Admin approval for changes | ❌ NOT IMPLEMENTED | Self-service is sufficient |
| 14-day SLA reviews | ❌ NOT IMPLEMENTED | Operational overhead |
| Appeals process | ❌ NOT IMPLEMENTED | Can add later when volume justifies |
| Mentoring tracking | ❌ NOT IMPLEMENTED | Not essential for startup |
| Maximum attempt limit | ❌ NOT IMPLEMENTED | Unlimited attempts allowed |

---

## Summary: Key Differences from Previous Plan

| Aspect | Previous Plan | Revised Plan (Per Document) |
|--------|---------------|----------------------------|
| Status Name | `not_certified` | `interview_unsuccessful` |
| Max Attempts | 3 total | **UNLIMITED** |
| Cooling-Off | 90/180/365 days | **30/60/90 days** (capped at 90) |
| Industry Change | Admin-approved request | **NEVER** (create new enrollment) |
| Improvement Plan | Mandatory | **NOT required** |
| Admin Approval | Required for changes | **NOT required** (self-service) |
| Appeals Process | Implemented | **NOT implemented** (add later) |
| Activity Tracking | Required | **NOT implemented** |

---

## Implementation Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/constants/lifecycle.constants.ts` | UPDATE | Rename `not_certified` → `interview_unsuccessful` |
| `src/constants/interview-retake.constants.ts` | CREATE | Cooling-off periods, policy rules |
| `src/constants/certification.constants.ts` | UPDATE | Outcome type and display |
| `src/services/lifecycleService.ts` | UPDATE | Add expertise change validation |
| `src/services/interviewRetakeService.ts` | CREATE | Eligibility checks, reset functions |
| `src/hooks/queries/useReinterviewEligibility.ts` | CREATE | Query hook for eligibility |
| `src/hooks/mutations/useModifyExpertise.ts` | CREATE | Mutation for expertise changes |
| `src/hooks/mutations/useFinalizeCertification.ts` | UPDATE | Use new status, set cooling-off |
| `src/components/enrollment/InterviewUnsuccessfulCard.tsx` | CREATE | Dashboard card with countdown |
| `src/components/enrollment/ModifyExpertiseDialog.tsx` | CREATE | Expertise modification UI |
| `src/pages/Dashboard.tsx` | UPDATE | Show new card for failed providers |
| Database migration | CREATE | Add columns, update RPC |

