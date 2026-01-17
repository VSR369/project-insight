# Fix: Registration Flow Does Not Create Enrollment Record

## Problem Identified

When a new provider completes Registration, the system:
1. Updates `solution_providers` table with `industry_segment_id`
2. Sets lifecycle to `enrolled` (rank 20)
3. **BUT does NOT create a record in `provider_industry_enrollments`**

The Expertise page (and other enrollment-scoped pages) use `useEnrollmentContext()` which reads from `provider_industry_enrollments`. Since no record exists, `activeEnrollment` is `null`, causing the "No Industry Selected" message.

**Database Evidence:**
- `solution_providers.industry_segment_id` = Manufacturing Auto Components
- `provider_industry_enrollments` = EMPTY for this provider

---

## Solution: Dual-Phase Fix

### Phase 1: Immediate Database Fix

Run this SQL in Supabase SQL Editor to create the missing enrollment for the test provider:

```sql
INSERT INTO provider_industry_enrollments (
  provider_id,
  industry_segment_id,
  is_primary,
  lifecycle_status,
  lifecycle_rank,
  created_by
)
VALUES (
  'c36013a0-5b22-4451-bd6e-052815912024',
  'a333531e-8a60-4682-87df-a9fdc617a232',
  true,
  'enrolled',
  20,
  '32aec070-360a-4d73-a6dd-28961c629ca6'
);
```

### Phase 2: Code Fix (Prevents Future Issues)

#### File 1: `src/services/providerService.ts`

Modify `updateProviderBasicProfile` function to also create an enrollment record when updating a provider's industry:

**Current Logic (lines 146-179):**
- Updates `solution_providers` table only

**New Logic:**
1. Update `solution_providers` table (existing behavior)
2. Check if enrollment exists for this provider + industry
3. If no enrollment exists, create one in `provider_industry_enrollments`
4. Return the enrollment ID for context synchronization

```typescript
export async function updateProviderBasicProfile(
  providerId: string,
  data: {
    firstName: string;
    lastName: string;
    address: string;
    pinCode: string;
    countryId: string;
    industrySegmentId: string;
    isStudent: boolean;
  }
): Promise<{ enrollmentId?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Update solution_providers
  const { error } = await supabase
    .from('solution_providers')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      address: data.address,
      pin_code: data.pinCode,
      country_id: data.countryId,
      industry_segment_id: data.industrySegmentId,
      is_student: data.isStudent,
      lifecycle_status: 'enrolled',
      lifecycle_rank: 20,
      onboarding_status: 'in_progress',
      updated_by: userId,
    })
    .eq('id', providerId);

  if (error) throw error;

  // Check if enrollment already exists for this provider + industry
  const { data: existingEnrollment } = await supabase
    .from('provider_industry_enrollments')
    .select('id')
    .eq('provider_id', providerId)
    .eq('industry_segment_id', data.industrySegmentId)
    .maybeSingle();

  let enrollmentId = existingEnrollment?.id;

  // Create enrollment if it doesn't exist
  if (!enrollmentId) {
    // Check if this is the first enrollment (to set is_primary)
    const { data: anyEnrollments } = await supabase
      .from('provider_industry_enrollments')
      .select('id')
      .eq('provider_id', providerId)
      .limit(1);

    const isPrimary = !anyEnrollments || anyEnrollments.length === 0;

    const { data: newEnrollment, error: enrollmentError } = await supabase
      .from('provider_industry_enrollments')
      .insert({
        provider_id: providerId,
        industry_segment_id: data.industrySegmentId,
        is_primary: isPrimary,
        lifecycle_status: 'enrolled',
        lifecycle_rank: 20,
        created_by: userId,
      })
      .select('id')
      .single();

    if (enrollmentError) throw enrollmentError;
    enrollmentId = newEnrollment.id;
  }

  return { enrollmentId };
}
```

#### File 2: `src/hooks/queries/useProvider.ts`

Update `useUpdateProviderBasicProfile` to:
1. Accept the new return type with `enrollmentId`
2. Invalidate enrollment-related queries on success
3. Return the enrollment ID for context synchronization

**Changes to `onSuccess` callback:**
```typescript
onSuccess: (result) => {
  if (result.success) {
    queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });  // ADD
    queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });     // ADD
    queryClient.invalidateQueries({ queryKey: ['proof-points'] });
    queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
    toast.success('Saved. Continue to Participation Mode.');
  }
},
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/providerService.ts` | Add enrollment creation to `updateProviderBasicProfile` |
| `src/hooks/queries/useProvider.ts` | Invalidate enrollment queries, update return type |

---

## Test Scenarios After Fix

1. **New user registration** - Creates both provider AND enrollment records
2. **Existing user re-registering** - Uses existing enrollment, no duplicate
3. **Expertise page** - Shows expertise levels (no "No Industry Selected")
4. **Multi-industry flow** - Works correctly via "Add Industry" mode

---

## Execution Order

1. Run the SQL fix to unblock your testing immediately
2. Approve this plan to implement the code fix
3. After implementation, register a fresh user to verify the complete flow