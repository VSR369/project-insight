
# Comprehensive Implementation Plan: Fill Provider Status Gaps

## Executive Summary

This plan fills the gaps identified in the Solution Provider Status Reference Guide (Part 8) while preserving all existing functionality. The implementation adds missing database columns, VIP expert bypass flow, and certification level assignment logic.

---

## Gap Analysis Summary

| Feature | Current State | Required Change |
|---------|---------------|-----------------|
| `registration_mode` column | Missing | Add to `solution_providers` |
| `composite_score` column | Missing | Add to `provider_industry_enrollments` |
| `certification_level` column | Missing | Add to `provider_industry_enrollments` |
| `star_rating` column | Missing | Add to `provider_industry_enrollments` |
| `certified_at` column | Missing | Add to `provider_industry_enrollments` |
| VIP bypass logic | Not implemented | Create invitation acceptance handler |
| Certification level assignment | Not implemented | Add auto-assign after interview submission |

---

## Implementation Phases

### Phase 1: Database Schema Additions

**Priority: HIGH | Risk: LOW**

#### 1.1 Add `registration_mode` column to `solution_providers`

```sql
-- Add registration_mode enum type
CREATE TYPE registration_mode AS ENUM ('self_registered', 'invitation');

-- Add column with default
ALTER TABLE solution_providers 
  ADD COLUMN registration_mode registration_mode NOT NULL DEFAULT 'self_registered';

-- Add invitation_id FK for traceability (optional but recommended)
ALTER TABLE solution_providers
  ADD COLUMN invitation_id UUID REFERENCES solution_provider_invitations(id);
```

#### 1.2 Add certification columns to `provider_industry_enrollments`

```sql
-- Add certification tracking columns
ALTER TABLE provider_industry_enrollments
  ADD COLUMN composite_score DECIMAL(5,2),
  ADD COLUMN certification_level VARCHAR(20),
  ADD COLUMN star_rating INTEGER CHECK (star_rating >= 0 AND star_rating <= 3),
  ADD COLUMN certified_at TIMESTAMPTZ,
  ADD COLUMN certified_by UUID REFERENCES auth.users(id);

-- Add index for reporting queries
CREATE INDEX idx_enrollments_certification 
  ON provider_industry_enrollments(certification_level, star_rating) 
  WHERE lifecycle_status = 'certified';
```

#### 1.3 Update `handle_new_user` trigger to set registration_mode

```sql
-- Modify handle_new_user to detect invitation vs self-registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id UUID;
  v_is_student BOOLEAN;
  v_industry_segment_id UUID;
  v_country_id UUID;
  v_enrollment_id UUID;
  v_role_type TEXT;
  v_invitation_id UUID;
  v_invitation_type TEXT;
  v_registration_mode registration_mode;
BEGIN
  -- Extract role type and invitation context from metadata
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'provider');
  v_invitation_id := (NEW.raw_user_meta_data->>'invitation_id')::uuid;
  
  -- Determine registration mode
  IF v_invitation_id IS NOT NULL THEN
    v_registration_mode := 'invitation';
    -- Lookup invitation type for VIP handling
    SELECT invitation_type INTO v_invitation_type
    FROM solution_provider_invitations
    WHERE id = v_invitation_id;
  ELSE
    v_registration_mode := 'self_registered';
  END IF;

  -- ... existing profile creation logic ...
  
  -- For provider role type
  IF v_role_type = 'provider' THEN
    INSERT INTO public.solution_providers (
      user_id,
      first_name,
      last_name,
      is_student,
      industry_segment_id,
      country_id,
      address,
      pin_code,
      lifecycle_status,
      lifecycle_rank,
      onboarding_status,
      registration_mode,
      invitation_id,
      created_by
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      v_is_student,
      v_industry_segment_id,
      v_country_id,
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'pin_code',
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'completed' ELSE 'not_started' END,
      v_registration_mode,
      v_invitation_id,
      NEW.id
    ) RETURNING id INTO v_provider_id;

    -- Create enrollment (VIP gets auto-certified)
    IF v_industry_segment_id IS NOT NULL THEN
      INSERT INTO public.provider_industry_enrollments (
        provider_id,
        industry_segment_id,
        is_primary,
        lifecycle_status,
        lifecycle_rank,
        composite_score,
        certification_level,
        star_rating,
        certified_at,
        created_by
      ) VALUES (
        v_provider_id,
        v_industry_segment_id,
        true,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 100.0 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'expert' ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 3 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN NOW() ELSE NULL END,
        NEW.id
      ) RETURNING id INTO v_enrollment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

---

### Phase 2: Invitation Acceptance Flow for Providers

**Priority: HIGH | Risk: MEDIUM**

#### 2.1 Create Edge Function: `accept-provider-invitation`

This handles invitation token validation and links the invitation to user signup.

```typescript
// supabase/functions/accept-provider-invitation/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find valid invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('solution_provider_invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .is('declined_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return invitation details for signup form pre-fill
    return new Response(
      JSON.stringify({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          invitation_type: invitation.invitation_type,
          industry_segment_id: invitation.industry_segment_id,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 2.2 Create Provider Invitation Accept Page

New route: `/invite/:token` for provider invitation acceptance

```typescript
// src/pages/InviteAccept.tsx
// - Validates token via edge function
// - Pre-fills signup form with invitation data
// - Passes invitation_id to signup metadata
// - For VIP: Shows special welcome message
```

#### 2.3 Update Registration Flow

Modify `src/pages/Register.tsx` to:
- Accept `invitationId` from URL/query params
- Include `invitation_id` in signup metadata
- For VIP invitations, show condensed form (name + password only)

---

### Phase 3: Certification Level Assignment

**Priority: HIGH | Risk: MEDIUM**

#### 3.1 Create Database Function: `finalize_certification`

```sql
CREATE OR REPLACE FUNCTION public.finalize_certification(
  p_enrollment_id UUID,
  p_composite_score DECIMAL,
  p_certifying_user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_certification_level VARCHAR(20);
  v_star_rating INTEGER;
  v_new_status lifecycle_status;
BEGIN
  -- Calculate certification level based on composite score
  IF p_composite_score < 51.0 THEN
    v_certification_level := NULL;
    v_star_rating := NULL;
    v_new_status := 'not_certified';
  ELSIF p_composite_score < 66.0 THEN
    v_certification_level := 'basic';
    v_star_rating := 1;
    v_new_status := 'certified';
  ELSIF p_composite_score < 86.0 THEN
    v_certification_level := 'competent';
    v_star_rating := 2;
    v_new_status := 'certified';
  ELSE
    v_certification_level := 'expert';
    v_star_rating := 3;
    v_new_status := 'certified';
  END IF;

  -- Update enrollment with certification details
  UPDATE provider_industry_enrollments
  SET 
    composite_score = p_composite_score,
    certification_level = v_certification_level,
    star_rating = v_star_rating,
    lifecycle_status = v_new_status,
    lifecycle_rank = CASE WHEN v_new_status = 'certified' THEN 140 ELSE 150 END,
    certified_at = CASE WHEN v_new_status = 'certified' THEN NOW() ELSE NULL END,
    certified_by = p_certifying_user_id,
    updated_at = NOW(),
    updated_by = p_certifying_user_id
  WHERE id = p_enrollment_id;

  -- Update verification_status on provider
  UPDATE solution_providers sp
  SET 
    verification_status = CASE WHEN v_new_status = 'certified' THEN 'verified' ELSE 'rejected' END,
    updated_at = NOW()
  WHERE id = (SELECT provider_id FROM provider_industry_enrollments WHERE id = p_enrollment_id);

  RETURN json_build_object(
    'success', true,
    'certification_level', v_certification_level,
    'star_rating', v_star_rating,
    'lifecycle_status', v_new_status
  );
END;
$$;
```

#### 3.2 Update Interview Submission Flow

Modify `useSubmitInterview` hook in `src/hooks/queries/useInterviewKitEvaluation.ts`:

```typescript
// After interview score is saved to interview_bookings:
// 1. Calculate composite score (proof_points_final_score + assessment % + interview score)
// 2. Call finalize_certification RPC
// 3. Invalidate relevant queries
```

#### 3.3 Create Certification Finalization Hook

```typescript
// src/hooks/mutations/useFinalizeCertification.ts
export function useFinalizeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId }: { enrollmentId: string }) => {
      // 1. Fetch all three scores
      const { data: enrollment } = await supabase
        .from('provider_industry_enrollments')
        .select('proof_points_final_score')
        .eq('id', enrollmentId)
        .single();

      const { data: assessment } = await supabase
        .from('assessment_attempts')
        .select('score_percentage')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: interview } = await supabase
        .from('interview_bookings')
        .select('interview_score_out_of_10')
        .eq('enrollment_id', enrollmentId)
        .not('interview_submitted_at', 'is', null)
        .single();

      // 2. Calculate composite
      const proofScore = enrollment?.proof_points_final_score ?? 0;
      const assessmentPct = assessment?.score_percentage ?? 0;
      const interviewScore = interview?.interview_score_out_of_10 ?? 0;

      const compositeScore = 
        ((proofScore / 10) * 100 * 0.30) +
        (assessmentPct * 0.50) +
        ((interviewScore / 10) * 100 * 0.20);

      // 3. Call RPC
      const { data, error } = await supabase.rpc('finalize_certification', {
        p_enrollment_id: enrollmentId,
        p_composite_score: Math.round(compositeScore * 10) / 10,
        p_certifying_user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { enrollmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['final-result-data'] });
      toast.success('Certification finalized');
    },
  });
}
```

---

### Phase 4: UI Integration

**Priority: MEDIUM | Risk: LOW**

#### 4.1 Update Final Result Tab

Modify `src/components/reviewer/candidates/FinalResultTabContent.tsx`:
- Add "Finalize Certification" button (visible when interview submitted but not yet certified)
- Show certification level and star rating prominently once finalized

#### 4.2 Update Certification Page

Modify `src/pages/enroll/Certification.tsx`:
- Display star rating with visual stars (1-3)
- Show certification level label
- Display composite score breakdown

#### 4.3 Update Dashboard

Modify `src/pages/Dashboard.tsx`:
- Show star badge next to certified enrollments
- Display certification level in enrollment cards

#### 4.4 Create Invitation Accept Page

New page `src/pages/InviteAccept.tsx`:
- Route: `/invite/:token`
- Validates invitation token
- Pre-fills registration form
- Special flow for VIP experts

---

### Phase 5: TypeScript Types and Constants

**Priority: MEDIUM | Risk: LOW**

#### 5.1 Add Certification Level Types

```typescript
// src/types/certification.types.ts
export type CertificationLevel = 'basic' | 'competent' | 'expert';
export type RegistrationMode = 'self_registered' | 'invitation';

export const CERTIFICATION_LEVEL_DISPLAY: Record<CertificationLevel, {
  label: string;
  stars: number;
  colorClass: string;
}> = {
  basic: { label: 'Basic', stars: 1, colorClass: 'text-amber-600' },
  competent: { label: 'Competent', stars: 2, colorClass: 'text-blue-600' },
  expert: { label: 'Expert', stars: 3, colorClass: 'text-green-600' },
};
```

#### 5.2 Update Constants

Add to `src/constants/certification.constants.ts`:
- `CERTIFICATION_LEVELS` constant
- `mapOutcomeToLevel()` helper function

---

## Technical Considerations

### Database Constraints

1. **composite_score**: DECIMAL(5,2) allows 0.00 to 100.00
2. **star_rating**: CHECK constraint 0-3 (0 = not certified)
3. **certification_level**: Free text to allow future extensions
4. **certified_at**: Only set when lifecycle_status = 'certified'

### Migration Safety

- All new columns have NULL defaults initially
- Existing records unaffected (no breaking changes)
- Trigger update is backward compatible

### VIP Expert Auto-Certification

- Sets `composite_score = 100.0`
- Sets `certification_level = 'expert'`
- Sets `star_rating = 3`
- Sets `verification_status = NULL` (no verification needed)
- Bypasses all enrollment steps

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/accept-provider-invitation/index.ts` | Invitation token validation |
| `src/pages/InviteAccept.tsx` | Invitation acceptance page |
| `src/hooks/mutations/useFinalizeCertification.ts` | Certification finalization hook |
| `src/types/certification.types.ts` | TypeScript types |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/Register.tsx` | Accept invitation_id, VIP condensed form |
| `src/hooks/queries/useInterviewKitEvaluation.ts` | Trigger certification after interview |
| `src/pages/enroll/Certification.tsx` | Display star rating and level |
| `src/pages/Dashboard.tsx` | Show certification badges |
| `src/components/reviewer/candidates/FinalResultTabContent.tsx` | Finalize button |
| `supabase/config.toml` | Add new edge function |

---

## Verification Checklist

After implementation:
- [ ] New columns exist in database
- [ ] Self-registered providers have `registration_mode = 'self_registered'`
- [ ] Invited providers have `registration_mode = 'invitation'`
- [ ] VIP experts are auto-certified with 3 stars on signup
- [ ] Standard providers go through full 9-step flow
- [ ] Interview submission triggers certification finalization
- [ ] Composite score is calculated correctly (30% + 50% + 20%)
- [ ] Certification level assigned based on score thresholds
- [ ] Star rating displayed on dashboard and profiles
- [ ] All existing functionality preserved

---

## Estimated Effort

| Phase | Complexity | Estimate |
|-------|------------|----------|
| Phase 1: Database Schema | Low | 1 session |
| Phase 2: Invitation Flow | Medium | 2 sessions |
| Phase 3: Certification Assignment | Medium | 2 sessions |
| Phase 4: UI Integration | Low | 1 session |
| Phase 5: Types & Constants | Low | 1 session |

**Total: ~7 sessions**

---

## Risk Mitigation

1. **Database Migration Rollback**: All columns are additive; can be dropped if issues arise
2. **Trigger Update**: Test with both self-registration and invitation flows
3. **VIP Bypass**: Test that VIP users cannot access enrollment wizard steps
4. **Certification Lock**: Verify certified enrollments become read-only (rank 140)
