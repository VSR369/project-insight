
# Post-Certification Expertise Upgrade Implementation Plan (FINAL)

## Document Reference
**Feature:** Expertise Upgrade for Certified Providers  
**Status:** Final Plan with Corrected Data Model  
**Date:** February 2026

---

## Executive Summary

| Decision | Value |
|----------|-------|
| **Feature Name** | Expertise Upgrade (Post-Certification) |
| **Trigger Status** | `certified` (rank 140) |
| **Can Change Expertise Level?** | YES |
| **Can Change Industry?** | NO (never changeable) |
| **Proof Points** | RETAINED (amending is optional) |
| **Proof Point Tags** | RETAINED with proof points |
| **Proficiency Areas** | CLEARED (user must re-select) |
| **Specialities** | AUTO-DERIVED (no action needed) |
| **Assessment** | MANDATORY (must re-take) |
| **Interview** | MANDATORY (must re-take) |
| **Cooling-Off Required?** | NO (voluntary change) |

---

## Data Model Clarification

### What Gets Cleared vs. Retained

| Data | Storage | Selection Type | On Upgrade |
|------|---------|----------------|------------|
| Expertise Level | `provider_industry_enrollments.expertise_level_id` | User selects | CLEARED (must re-select) |
| Proficiency Areas | `provider_proficiency_areas` table | User selects | CLEARED (must re-select) |
| Specialities | `provider_specialities` table | AUTO-DERIVED from `level_speciality_map` | NO ACTION (derived data) |
| Proof Points | `proof_points` table | User creates | RETAINED |
| Proof Point Tags | `proof_point_speciality_tags` table | User maps | RETAINED |

### Why This Approach?

1. **Proficiency Areas** - User-selected, level-dependent → Must re-select for new level
2. **Specialities** - Auto-derived from level + proficiency → System regenerates automatically
3. **Proof Points** - Provider's evidence → Keep (amending optional)
4. **Tags** - Linked to proof points → Keep with proof points

---

## Phase 1: Database Migration

### 1.1 Add Tracking Columns

```sql
-- Track upgrade history for certified providers
ALTER TABLE provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS upgrade_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_certified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_expertise_level_id UUID REFERENCES expertise_levels(id);

-- Index for upgrade tracking
CREATE INDEX IF NOT EXISTS idx_enrollments_upgrade_history 
  ON provider_industry_enrollments(provider_id, upgrade_attempt_count)
  WHERE lifecycle_status = 'certified';
```

### 1.2 Create RPC: `reset_enrollment_for_expertise_upgrade`

```sql
CREATE OR REPLACE FUNCTION reset_enrollment_for_expertise_upgrade(
  p_enrollment_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
BEGIN
  -- Get current enrollment (must be certified)
  SELECT * INTO v_enrollment
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id
    AND lifecycle_status = 'certified';
    
  IF v_enrollment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Enrollment not found or not in certified status'
    );
  END IF;

  -- Store previous certification data for audit, then reset
  UPDATE provider_industry_enrollments SET
    -- Archive previous state
    previous_expertise_level_id = expertise_level_id,
    last_certified_at = certified_at,
    upgrade_attempt_count = COALESCE(upgrade_attempt_count, 0) + 1,
    
    -- Reset lifecycle to expertise_selected
    lifecycle_status = 'expertise_selected',
    lifecycle_rank = 50,
    
    -- Clear certification fields
    certified_at = NULL,
    certified_by = NULL,
    certification_level = NULL,
    star_rating = NULL,
    composite_score = NULL,
    
    -- Clear assessment reference
    latest_assessment_attempt_id = NULL,
    
    -- Audit fields
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_enrollment_id;

  -- CLEAR: Proficiency areas (user must re-select for new level)
  DELETE FROM provider_proficiency_areas 
  WHERE enrollment_id = p_enrollment_id;

  -- NO ACTION: provider_specialities (auto-derived, system regenerates)
  -- NO ACTION: proof_points (retained - amending is optional)
  -- NO ACTION: proof_point_speciality_tags (retained with proof points)

  RETURN json_build_object(
    'success', true,
    'message', 'Enrollment reset for expertise upgrade. Please select your new expertise level and proficiency areas.',
    'previous_expertise_level_id', v_enrollment.expertise_level_id,
    'previous_star_rating', v_enrollment.star_rating,
    'previous_certified_at', v_enrollment.certified_at,
    'upgrade_count', COALESCE(v_enrollment.upgrade_attempt_count, 0) + 1
  );
END;
$$;
```

---

## Phase 2: Constants Updates

### 2.1 Update `src/constants/lifecycle.constants.ts`

```typescript
// Add expertise upgrade eligible states
export const EXPERTISE_UPGRADE_ELIGIBLE_STATES = ['certified'] as const;
```

### 2.2 Create `src/constants/expertise-upgrade.constants.ts`

```typescript
/**
 * Expertise Upgrade Policy Constants
 * 
 * For certified providers who want to change their expertise level
 * and go through re-certification process.
 */

export const EXPERTISE_UPGRADE_POLICY = {
  /** What can be changed after certification */
  CHANGEABLE_FIELDS: {
    industry_segment_id: false,    // NEVER changeable
    expertise_level_id: true,      // Can upgrade/change
    proficiency_areas: true,       // Must re-select (user-selected)
  },
  
  /** Data handling during upgrade */
  DATA_HANDLING: {
    proficiency_areas: 'clear',    // Must re-select for new level
    specialities: 'auto',          // Auto-derived, no action needed
    proof_points: 'retain',        // Keep existing
    proof_point_tags: 'retain',    // Keep with proof points
  },
  
  /** Status reset target */
  RESET_TO_STATUS: 'expertise_selected' as const,
  RESET_TO_RANK: 50,
  
  /** No cooling-off for voluntary upgrade */
  COOLING_OFF_REQUIRED: false,
} as const;
```

### 2.3 Update `src/constants/index.ts`

```typescript
export * from './expertise-upgrade.constants';
```

---

## Phase 3: Service Layer

### 3.1 Create `src/services/expertiseUpgradeService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface UpgradeEligibility {
  isEligible: boolean;
  currentExpertiseLevel: string | null;
  currentStarRating: number | null;
  upgradeCount: number;
  reason?: string;
}

/**
 * Check if certified provider can initiate expertise upgrade
 */
export async function checkUpgradeEligibility(
  enrollmentId: string
): Promise<UpgradeEligibility> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments')
    .select(`
      lifecycle_status,
      star_rating,
      upgrade_attempt_count,
      expertise_level:expertise_levels(id, name)
    `)
    .eq('id', enrollmentId)
    .single();
    
  if (error) {
    handleQueryError(error, { operation: 'check_upgrade_eligibility' });
    throw new Error('Failed to check upgrade eligibility');
  }
  
  const isCertified = data.lifecycle_status === 'certified';
  
  return {
    isEligible: isCertified,
    currentExpertiseLevel: data.expertise_level?.name || null,
    currentStarRating: data.star_rating,
    upgradeCount: data.upgrade_attempt_count || 0,
    reason: isCertified ? undefined : 'Only certified providers can upgrade expertise',
  };
}

/**
 * Reset enrollment for expertise upgrade process
 */
export async function resetForExpertiseUpgrade(enrollmentId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  previousExpertiseLevelId?: string;
  upgradeCount?: number;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data, error } = await supabase.rpc('reset_enrollment_for_expertise_upgrade', {
    p_enrollment_id: enrollmentId,
    p_user_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as {
    success: boolean;
    message?: string;
    error?: string;
    previous_expertise_level_id?: string;
    upgrade_count?: number;
  };
}
```

### 3.2 Update `src/services/lifecycleService.ts`

Add upgrade-related functions:

```typescript
import { EXPERTISE_UPGRADE_ELIGIBLE_STATES } from '@/constants/lifecycle.constants';

/**
 * Check if provider can initiate expertise upgrade (certified only)
 */
export function canUpgradeExpertise(status: string): boolean {
  return EXPERTISE_UPGRADE_ELIGIBLE_STATES.includes(
    status as typeof EXPERTISE_UPGRADE_ELIGIBLE_STATES[number]
  );
}

/**
 * Check if field can be modified for expertise upgrade
 */
export function canModifyFieldForUpgrade(
  lifecycleStatus: string,
  fieldName: string
): { allowed: boolean; reason?: string } {
  if (lifecycleStatus !== 'certified') {
    return { 
      allowed: false, 
      reason: 'Expertise upgrade is only available for certified providers.' 
    };
  }
  
  // Industry NEVER changeable
  if (fieldName === 'industry_segment_id') {
    return { 
      allowed: false, 
      reason: 'Industry cannot be changed. Create a new enrollment for a different industry.' 
    };
  }
  
  return { allowed: true };
}
```

---

## Phase 4: React Query Hooks

### 4.1 Create `src/hooks/queries/useUpgradeEligibility.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { checkUpgradeEligibility } from '@/services/expertiseUpgradeService';

export function useUpgradeEligibility(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['upgrade-eligibility', enrollmentId],
    queryFn: () => checkUpgradeEligibility(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: 60 * 1000, // 1 minute
  });
}
```

### 4.2 Create `src/hooks/mutations/useUpgradeExpertise.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetForExpertiseUpgrade } from '@/services/expertiseUpgradeService';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useUpgradeExpertise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      return await resetForExpertiseUpgrade(enrollmentId);
    },
    onSuccess: (result, enrollmentId) => {
      if (result.success) {
        // Invalidate all affected queries
        queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['upgrade-eligibility', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
        
        toast.success(result.message || 'Ready for expertise upgrade. Please select your new expertise level.');
      } else {
        toast.error(result.error || 'Failed to initiate upgrade');
      }
      return result;
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'upgrade_expertise_certified' });
    },
  });
}
```

---

## Phase 5: UI Components

### 5.1 Create `src/components/enrollment/ExpertiseUpgradeCard.tsx`

Dashboard card for certified providers:

**Features:**
- Current certification badge with star rating
- "Upgrade Expertise" button
- Info tooltip explaining the process
- Shows upgrade history count if > 0

**Visual Design:**
- Success/green theme (celebrating certification)
- Clear CTA to initiate upgrade
- Non-destructive messaging (this is voluntary)

### 5.2 Create `src/components/enrollment/ExpertiseUpgradeDialog.tsx`

Confirmation dialog before initiating upgrade:

**Content:**
- Current expertise level and star rating display
- Industry segment (READ-ONLY with lock icon)
- Clear explanation of what happens:
  - ✅ Proof points will be retained
  - ✅ You can optionally amend proof points
  - ⚠️ Proficiency areas will be cleared (re-select required)
  - ⚠️ Assessment must be re-taken
  - ⚠️ Interview must be re-scheduled
- Two-step confirmation (checkbox + button)

### 5.3 Update Dashboard/Enrollment View

Show `ExpertiseUpgradeCard` when provider is certified:

```typescript
{enrollment.lifecycle_status === 'certified' && (
  <ExpertiseUpgradeCard 
    enrollmentId={enrollment.id}
    currentLevel={enrollment.expertise_level?.name}
    stars={enrollment.star_rating}
    certifiedAt={enrollment.certified_at}
    onUpgrade={() => setShowUpgradeDialog(true)}
  />
)}
```

---

## Phase 6: Complete Workflow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXPERTISE UPGRADE WORKFLOW (Certified Providers)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Current: certified (rank 140) with 2-star rating                            │
│              ↓                                                              │
│ [Provider clicks "Upgrade Expertise"]                                       │
│              ↓                                                              │
│ [ExpertiseUpgradeDialog - Confirm understanding]                            │
│              ↓                                                              │
│ [Confirm] → reset_enrollment_for_expertise_upgrade RPC                      │
│              ↓                                                              │
│ Database Changes:                                                           │
│   ✓ Store: previous_expertise_level_id, last_certified_at                   │
│   ✓ Increment: upgrade_attempt_count                                        │
│   ✓ Clear: certification fields, assessment reference                       │
│   ✓ Delete: provider_proficiency_areas (must re-select)                     │
│   ✓ Keep: proof_points, proof_point_speciality_tags                         │
│   ✓ Skip: provider_specialities (auto-derived)                              │
│              ↓                                                              │
│ New Status: expertise_selected (rank 50)                                    │
│              ↓                                                              │
│ Step 4: Select New Expertise Level                                          │
│              ↓                                                              │
│ Step 4b: Select Proficiency Areas (for new level)                           │
│              ↓                                                              │
│ [System auto-derives specialities via level_speciality_map]                 │
│              ↓                                                              │
│ Step 5: Review/Amend Proof Points (OPTIONAL)                                │
│   - Existing proof points retained                                          │
│   - Can add new, edit, or delete                                            │
│   - May need to update tags if specialities changed                         │
│              ↓                                                              │
│ Step 6: Take Assessment (MANDATORY)                                         │
│              ↓                                                              │
│ Step 7: Schedule Interview (MANDATORY)                                      │
│              ↓                                                              │
│ Step 8: Complete Interview Panel                                            │
│              ↓                                                              │
│ Step 9: Re-Certification → new star rating                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Upgrade vs. Interview Failure

| Aspect | Interview Failure (Path B) | Expertise Upgrade |
|--------|---------------------------|-------------------|
| **Trigger Status** | `interview_unsuccessful` | `certified` |
| **User Intent** | Recovery | Advancement |
| **Cooling-Off** | YES (30/60/90 days) | NO |
| **Proof Points** | DELETED | RETAINED |
| **Proficiency Areas** | DELETED | DELETED (re-select) |
| **Specialities** | No action (derived) | No action (derived) |
| **Counter Field** | `interview_attempt_count` | `upgrade_attempt_count` |

---

## Implementation Files Summary

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | CREATE | Add columns + `reset_enrollment_for_expertise_upgrade` RPC |
| `src/constants/lifecycle.constants.ts` | UPDATE | Add `EXPERTISE_UPGRADE_ELIGIBLE_STATES` |
| `src/constants/expertise-upgrade.constants.ts` | CREATE | Upgrade policy rules |
| `src/constants/index.ts` | UPDATE | Export new constants |
| `src/services/expertiseUpgradeService.ts` | CREATE | Eligibility + reset functions |
| `src/services/lifecycleService.ts` | UPDATE | Add `canUpgradeExpertise()` |
| `src/hooks/queries/useUpgradeEligibility.ts` | CREATE | Query hook |
| `src/hooks/mutations/useUpgradeExpertise.ts` | CREATE | Mutation hook |
| `src/components/enrollment/ExpertiseUpgradeCard.tsx` | CREATE | Dashboard card |
| `src/components/enrollment/ExpertiseUpgradeDialog.tsx` | CREATE | Confirmation dialog |

---

## Technical Notes

1. **Audit Trail**: Previous certification data stored in `previous_expertise_level_id` and `last_certified_at`
2. **Industry Lock**: Never changeable - enforced at RPC level and UI level
3. **Specialities**: Auto-derived via `level_speciality_map` when proficiency areas are selected
4. **Proof Point Tags**: May become orphaned if new specialities don't match - UI should guide user to update tags
5. **No Maximum Upgrades**: Providers can upgrade expertise unlimited times
