
# Complete Implementation Plan: Fill Remaining Provider Status Gaps

## Current State Analysis

### What's Already Implemented (Phase 1, 3 & 5 - COMPLETE)

| Component | Status | Details |
|-----------|--------|---------|
| **Database Schema** | ✅ Complete | `registration_mode`, `invitation_id`, `composite_score`, `certification_level`, `star_rating`, `certified_at`, `certified_by` columns added |
| **`finalize_certification` RPC** | ✅ Complete | Calculates level/stars based on composite score, updates enrollment and provider |
| **`handle_new_user` trigger** | ✅ Complete | Detects invitation_id, sets registration_mode, VIP bypass logic for auto-certification |
| **Edge Function** | ✅ Complete | `accept-provider-invitation` validates tokens and returns invitation details |
| **Certification Constants** | ✅ Complete | Score weights, thresholds, level mappings in `certification.constants.ts` |
| **Certification Types** | ✅ Complete | TypeScript types in `certification.types.ts` |
| **useFinalizeCertification Hook** | ✅ Complete | Fetches scores, calculates composite, calls RPC |
| **useFinalResultData Hook** | ✅ Complete | Aggregates all data including new certification fields |
| **StarRating Component** | ✅ Complete | Displays 0-3 stars with level-based styling |
| **FinalResultTabContent** | ✅ Complete | Shows "Finalize Certification" button and certification display |

### What's Missing (Phase 2 & 4 - INCOMPLETE)

| Component | Status | Required Work |
|-----------|--------|---------------|
| **InviteAccept Page** | ❌ Missing | New page at `/invite/:token` to validate invitation and redirect to registration |
| **Register.tsx Updates** | ❌ Missing | Accept invitation context from URL, pre-fill form, pass invitation_id to metadata |
| **App.tsx Route** | ❌ Missing | Add route for `/invite/:token` |
| **Dashboard Star Rating Display** | ❌ Missing | Show star rating badge next to certified enrollments |
| **Certification.tsx Enhancement** | ❌ Missing | Display star rating and certification level for certified providers |

---

## Implementation Plan

### Phase 2A: Create Invitation Accept Page

**File: `src/pages/InviteAccept.tsx`**

Creates a new page that:
1. Extracts token from URL params (`:token`)
2. Calls `accept-provider-invitation` edge function to validate
3. Handles error states (expired, already accepted, invalid)
4. For valid invitations:
   - Stores invitation data in sessionStorage
   - Redirects to `/register?invitation=true`
   - For VIP experts: Shows special welcome message before redirect

```text
Route Flow:
/invite/{token} → Validate Token → Store in sessionStorage → /register?invitation=true
                                 ↓
                            Invalid/Expired → Show error with retry option
```

### Phase 2B: Update Registration Flow

**File: `src/pages/Register.tsx`**

Modifications:
1. Check for `invitation=true` query param on mount
2. Read invitation data from sessionStorage if present
3. Pre-fill form fields (email, first_name, last_name - readonly for email)
4. Pass `invitation_id` in signUp metadata:
   ```typescript
   const metadata = {
     first_name: data.firstName,
     last_name: data.lastName,
     role_type: 'provider',
     invitation_id: invitationData?.id, // Added
     industry_segment_id: invitationData?.industry_segment_id, // Added for enrollment
   };
   ```
5. For VIP invitations:
   - Show condensed form (email readonly, password only)
   - Display "VIP Expert" badge and welcome message
   - Skip optional fields (address, country, pin code)

### Phase 2C: Add App Route

**File: `src/App.tsx`**

Add route:
```typescript
<Route path="/invite/:token" element={<InviteAccept />} />
```

---

### Phase 4A: Dashboard Star Rating Display

**File: `src/pages/Dashboard.tsx`**

Modifications:
1. Import `StarRating` component
2. For certified enrollments, fetch `star_rating` (already in enrollment data)
3. Display star rating next to status badge:
   ```tsx
   {enrollment.lifecycle_status === 'certified' && enrollment.star_rating && (
     <StarRating rating={enrollment.star_rating} size="sm" />
   )}
   ```
4. Update LIFECYCLE_PROGRESS_MAP to remove legacy `verified` and `not_verified` references

### Phase 4B: Certification Page Enhancement

**File: `src/pages/enroll/Certification.tsx`**

Modifications:
1. Import `StarRating` component
2. Fetch enrollment data with `star_rating`, `certification_level`, `composite_score`
3. For certified providers:
   - Display star rating prominently (large, centered)
   - Show certification level label (Basic/Competent/Expert)
   - Optionally show composite score breakdown
4. Update status config to include star rating in display

---

## Technical Details

### Invitation Data Storage

Using sessionStorage for invitation data:
```typescript
interface StoredInvitationData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invitation_type: 'standard' | 'vip_expert';
  industry_segment_id: string | null;
  industry_name: string | null;
}
```

### Signup Metadata Extension

Extended metadata passed to signUp:
```typescript
interface ProviderSignupMetadata {
  first_name: string;
  last_name: string;
  role_type: 'provider';
  is_student?: boolean;
  address?: string;
  pin_code?: string;
  country_id?: string;
  // New fields for invitation flow
  invitation_id?: string;
  industry_segment_id?: string;
}
```

### Dashboard Enrollment Type Extension

The existing enrollment query returns `star_rating` from the database (already in schema), so no query changes needed - just UI display.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/InviteAccept.tsx` | Invitation token validation and redirect page |
| `src/hooks/queries/useValidateInvitation.ts` | Hook to call edge function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/invite/:token` route |
| `src/pages/Register.tsx` | Accept invitation context, pre-fill form, pass metadata |
| `src/pages/Dashboard.tsx` | Display star rating for certified enrollments |
| `src/pages/enroll/Certification.tsx` | Display star rating and level for certified providers |

---

## Implementation Order

1. **Phase 2A**: Create `InviteAccept.tsx` and `useValidateInvitation.ts`
2. **Phase 2C**: Add route to `App.tsx`
3. **Phase 2B**: Update `Register.tsx` for invitation flow
4. **Phase 4A**: Update `Dashboard.tsx` with star rating display
5. **Phase 4B**: Update `Certification.tsx` with enhanced display

---

## Testing Checklist

After implementation:
- [ ] `/invite/{valid-token}` validates and redirects to register
- [ ] `/invite/{expired-token}` shows expiration error
- [ ] `/invite/{used-token}` shows already-accepted error
- [ ] Register form pre-fills with invitation data
- [ ] VIP invitation shows condensed form with badge
- [ ] Signup with invitation passes `invitation_id` to metadata
- [ ] VIP signup creates auto-certified provider with 3 stars
- [ ] Dashboard shows star rating for certified enrollments
- [ ] Certification page shows star rating and level
- [ ] Standard invitation flow completes full 9-step process
- [ ] Existing self-registration flow unchanged

---

## VIP Expert Auto-Certification Flow Verification

```text
Invitation Token → InviteAccept → Register (VIP condensed form)
                                        ↓
                              signUp with metadata:
                              - invitation_id
                              - industry_segment_id
                                        ↓
                              handle_new_user trigger:
                              - Detect invitation_type = 'vip_expert'
                              - Set registration_mode = 'invitation'
                              - Set lifecycle_status = 'certified'
                              - Set lifecycle_rank = 140
                              - Create enrollment with:
                                - composite_score = 100.0
                                - certification_level = 'expert'
                                - star_rating = 3
                                - certified_at = NOW()
                                        ↓
                              VIP redirects to Dashboard
                              showing 3-star Expert certification
```

---

## Estimated Effort

| Phase | Files | Complexity | Estimate |
|-------|-------|------------|----------|
| 2A: InviteAccept Page | 2 new | Medium | 30 min |
| 2B: Register Updates | 1 modify | Medium | 30 min |
| 2C: App Route | 1 modify | Low | 5 min |
| 4A: Dashboard Stars | 1 modify | Low | 15 min |
| 4B: Certification Enhancement | 1 modify | Low | 20 min |

**Total: ~1.5 hours of implementation**
