

## Root Cause Analysis

### Problem Identified
When clicking "Build Profile" from the banner, the Dashboard page hangs indefinitely.

### Investigation Summary

**Network Analysis** revealed the root cause:
- HTTP 300 errors with error code `PGRST201` on all enrollment API calls
- Error message: *"Could not embed because more than one relationship was found for 'provider_industry_enrollments' and 'expertise_levels'"*
- The same failing request is being retried repeatedly (every ~1 second), causing the page to appear "hung"

**Root Cause:**
The `provider_industry_enrollments` table has **two foreign keys** to the `expertise_levels` table:
1. `expertise_level_id` → Primary expertise level
2. `previous_expertise_level_id` → Previous expertise level (for tracking upgrades)

PostgREST cannot automatically determine which FK to use, so it returns HTTP 300 (ambiguous). The query in `enrollmentService.ts` uses:

```sql
expertise_level:expertise_levels(id, name, level_number)
```

But should use the **explicit FK hint**:
```sql
expertise_level:expertise_levels!expertise_level_id(id, name, level_number)
```

---

## Impact Assessment

| File | Issue | Status |
|------|-------|--------|
| `src/services/enrollmentService.ts` | 6 queries missing FK hint | **Critical** |
| `src/services/enrollmentDeletionService.ts` | 1 query missing FK hint | **Critical** |
| `src/hooks/queries/useFinalResultData.ts` | Already has correct hint | ✅ Fixed |
| `src/hooks/queries/usePulseStats.ts` | Already has correct hints | ✅ Fixed |

---

## Proposed Solution

### Technical Fix

Update all `expertise_level:expertise_levels(...)` queries to include the explicit FK constraint:

**Before:**
```typescript
expertise_level:expertise_levels(id, name, level_number)
```

**After:**
```typescript
expertise_level:expertise_levels!expertise_level_id(id, name, level_number)
```

---

## Implementation Plan

### Step 1: Fix enrollmentService.ts (6 queries)

**Locations requiring update:**
1. Line 96 - `fetchProviderEnrollments()`
2. Line 118 - `fetchEnrollment()`
3. Line 142 - `fetchActiveEnrollment()` (primary query)
4. Line 157 - `fetchActiveEnrollment()` (fallback query)
5. Line 214 - `createEnrollment()`
6. Line 350 - `getEnrollmentByIndustry()`

**Change pattern:**
```typescript
// Line 96: Before
expertise_level:expertise_levels(id, name, level_number),

// Line 96: After
expertise_level:expertise_levels!expertise_level_id(id, name, level_number),
```

### Step 2: Fix enrollmentDeletionService.ts (1 query)

**Location:** Line 91

**Change pattern:**
```typescript
// Before
expertise_level:expertise_levels(name)

// After
expertise_level:expertise_levels!expertise_level_id(name)
```

---

## Verification Steps

After the fix:
1. Refresh the Dashboard page
2. Click "Build Profile" from the banner
3. Verify no HTTP 300 errors in network tab
4. Verify enrollment data loads correctly
5. Verify wizard navigation works

---

## Technical Details

### Why This Happens
PostgREST uses foreign key relationships to automatically embed related data. When a table has multiple FKs to the same referenced table, PostgREST cannot determine which relationship to use and returns HTTP 300 with:

```json
{
  "code": "PGRST201",
  "hint": "Try changing 'expertise_levels' to one of the following: 
           'expertise_levels!provider_industry_enrollments_expertise_level_id_fkey', 
           'expertise_levels!provider_industry_enrollments_previous_expertise_level_id_fkey'"
}
```

### FK Hint Syntax Options
Both syntaxes are valid:
- Short form: `expertise_levels!expertise_level_id` (column name only)
- Full form: `expertise_levels!provider_industry_enrollments_expertise_level_id_fkey` (full constraint name)

We use the short form for readability.

### Files Already Correctly Implemented
- `usePulseStats.ts` uses `expertise_levels!pulse_skills_expertise_level_id_fkey`
- `useFinalResultData.ts` uses `expertise_levels!expertise_level_id`

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking existing functionality | Low | Same data returned, just using explicit FK |
| Incorrect FK reference | Low | Verified FK name via database query |
| Missing a query | Low | Comprehensive search completed |

