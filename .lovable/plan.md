
# Fix 7 Compliance Violations

## Overview

Seven targeted edits across 4 files. All changes are non-breaking -- they tighten column selections, add cache config, and add audit field helpers.

---

## Fix 1: useCountry -- Replace select("*") with Explicit Columns

**File**: `src/hooks/queries/useCountries.ts` (line 48)

**Change**: Replace `.select("*")` with the same column list used in `useCountries()`:
```
.select("id, code, name, iso_alpha3, phone_code, phone_code_display, currency_code, currency_symbol, date_format, number_format, is_ofac_restricted, address_format_template, display_order, is_active, description, created_at, updated_at, created_by, updated_by")
```

---

## Fix 2: useAcademicStreams -- Replace select("*") and Add Cache Config

**File**: `src/hooks/queries/useAcademicTaxonomy.ts` (lines 168, 183-184)

**Change 1** (line 168): Replace `.select("*, academic_disciplines(name)")` with:
```
.select("id, name, description, discipline_id, display_order, is_active, created_at, updated_at, created_by, updated_by, academic_disciplines(name)")
```

**Change 2** (lines 183-184): Add cache config after `return data;`:
```typescript
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
```

---

## Fix 3: useAcademicSubjects -- Replace select("*") and Add Cache Config

**File**: `src/hooks/queries/useAcademicTaxonomy.ts` (lines 307, 322-323)

**Change 1** (line 307): Replace `.select("*, academic_streams(name, academic_disciplines(name))")` with:
```
.select("id, name, description, stream_id, display_order, is_active, created_at, updated_at, created_by, updated_by, academic_streams(name, academic_disciplines(name))")
```

**Change 2** (lines 322-323): Add cache config:
```typescript
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
```

---

## Fix 4: useChallengeStatuses -- Add withCreatedBy to Create Mutation

**File**: `src/hooks/queries/useChallengeStatuses.ts` (lines 1-2, 31-32)

**Change 1**: Add import for audit helpers (line 5):
```typescript
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
```

**Change 2** (line 31-32): Wrap insert with audit:
```typescript
    mutationFn: async (item: ChallengeStatusInsert) => {
      const itemWithAudit = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_challenge_active_statuses").insert(itemWithAudit).select().single();
```

---

## Fix 5: useChallengeStatuses -- Add withUpdatedBy to Update Mutation

**File**: `src/hooks/queries/useChallengeStatuses.ts` (lines 44-45)

**Change**: Wrap update with audit:
```typescript
    mutationFn: async ({ id, ...updates }: ChallengeStatusUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_challenge_active_statuses").update(updatesWithAudit).eq("id", id).select().single();
```

---

## Fix 6: usePlatformFees -- Add Missing gcTime

**File**: `src/hooks/queries/usePlatformFees.ts` (lines 51-52)

**Change**: Add `gcTime` after `staleTime`:
```typescript
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
```

---

## Files Modified Summary

| File | Fixes Applied |
|------|--------------|
| `src/hooks/queries/useCountries.ts` | Fix 1: explicit columns in `useCountry` |
| `src/hooks/queries/useAcademicTaxonomy.ts` | Fixes 2-3: explicit columns + cache for streams and subjects |
| `src/hooks/queries/useChallengeStatuses.ts` | Fixes 4-5: add `withCreatedBy` and `withUpdatedBy` |
| `src/hooks/queries/usePlatformFees.ts` | Fix 6: add missing `gcTime` |

## Risk: Zero

All changes are additive refinements -- tighter column lists, cache settings matching existing patterns, and audit helpers already proven across all other hooks.
