

# Master Data Portal -- Targeted Performance Improvements

## Current State Assessment

Your Master Data Portal is already well-architected. The Claude prompts you shared assume a poorly built app using `useState + useEffect` patterns -- but your codebase already has:

- React Query with `QueryClientProvider` and optimized defaults (staleTime, gcTime, no refetch on window focus)
- Lazy loading (`React.lazy`) for all admin routes with `Suspense` boundaries
- TanStack Table with built-in client-side pagination, sorting, filtering, and skeleton loading
- Supabase foreign key joins in query hooks (shadow pricing, base fees, platform fees)
- A reusable `useDebounce` hook
- Centralized `handleMutationError` utility and `withCreatedBy`/`withUpdatedBy` audit helpers

Most of Claude's 8 prompts would either duplicate existing functionality or break working patterns. Instead, here are the **genuine gaps** worth fixing.

---

## Improvement 1: Standardize Error Handling in Fee Hooks

Several newer hooks (shadow pricing, base fees, membership tiers) use raw `toast.error()` instead of the centralized `handleMutationError`, and skip audit field helpers.

**Files affected:**
- `src/hooks/queries/useShadowPricing.ts` -- 5 mutations missing `handleMutationError` + `withCreatedBy`/`withUpdatedBy`
- `src/hooks/queries/useBaseFees.ts` -- 5 mutations missing `handleMutationError` + `withCreatedBy`/`withUpdatedBy`
- `src/hooks/queries/useMembershipTiers.ts` -- 5 mutations missing `handleMutationError`

**Changes:**
- Import and use `handleMutationError` for all `onError` callbacks
- Import and use `withCreatedBy` in create mutations, `withUpdatedBy` in update mutations
- Add `gcTime: 30 * 60 * 1000` where missing for consistency

---

## Improvement 2: Explicit Column Selection in Fee Queries

The shadow pricing, base fees, and platform fees hooks use `select('*', ...)`. While they do use joins (good), the `*` fetches unnecessary columns like `created_by`, `updated_by`, `updated_at` that are never displayed in the table.

**Files affected:**
- `src/hooks/queries/useShadowPricing.ts` -- replace `*` with specific columns
- `src/hooks/queries/useBaseFees.ts` -- replace `*` with specific columns
- `src/hooks/queries/usePlatformFees.ts` -- replace `*` with specific columns

---

## Improvement 3: Add Database Indexes for Fee Tables

With 60-150 rows per fee table, indexes are not critical yet, but adding them now ensures performance as data grows. This is a one-time migration.

**Tables to index:**
- `md_challenge_base_fees`: composite index on `(country_id, tier_id, engagement_model_id)`, index on `is_active`
- `md_platform_fees`: composite index on `(country_id, tier_id, engagement_model_id)`, index on `is_active`
- `md_shadow_pricing`: composite index on `(country_id, tier_id)`, index on `is_active`

---

## Improvement 4: Memoize Dropdown Options in Page Components

In pages like `ShadowPricingPage`, `tierOptions` and `countryOptions` are recalculated on every render. Wrapping them in `useMemo` prevents unnecessary re-computation.

**Files affected:**
- `src/pages/admin/shadow-pricing/ShadowPricingPage.tsx`
- `src/pages/admin/base-fees/` (similar pattern)
- `src/pages/admin/platform-fees/` (similar pattern)

---

## What We Are NOT Changing (and Why)

| Claude Suggestion | Why It Is Already Done or Not Needed |
|---|---|
| Install React Query | Already installed and configured in `queryClient.ts` |
| Replace `useState + useEffect` fetching | No such pattern exists in admin hooks -- all use `useQuery` |
| Add server-side pagination | TanStack Table handles client-side pagination; master data tables have 30-150 rows max, making server-side pagination unnecessary overhead |
| Eliminate N+1 queries with joins | Already using Supabase joins in fee hooks |
| Add code splitting / lazy loading | All admin routes already use `React.lazy()` |
| Add loading skeletons | `DataTable` already renders column-aware skeletons |
| Debounce search | `useDebounce` hook already exists; DataTable search is client-side (instant) on small datasets |
| `React.memo` on table rows | TanStack Table already handles row virtualization efficiently; master data tables are small |
| Split context providers | No monolithic context exists for master data; each hook is independent |

---

## Technical Details

### Hook Standardization Pattern (Improvement 1)

For each affected hook file, the change follows this pattern:

```typescript
// BEFORE
onError: (e: Error) => toast.error(`Failed to create: ${e.message}`)

// AFTER
onError: (e: Error) => handleMutationError(e, { operation: "create_shadow_pricing" })
```

```typescript
// BEFORE (create mutation)
mutationFn: async (item: ShadowPricingInsert) => {
  const { data, error } = await supabase.from(TABLE).insert(item).select().single();

// AFTER
mutationFn: async (item: ShadowPricingInsert) => {
  const d = await withCreatedBy(item);
  const { data, error } = await supabase.from(TABLE).insert(d).select().single();
```

### Column Selection Pattern (Improvement 2)

```typescript
// BEFORE
.select(`*, md_subscription_tiers(name), countries(name, currency_code, currency_symbol)`)

// AFTER
.select(`id, tier_id, country_id, shadow_charge_per_challenge, currency_code, currency_symbol, description, is_active, created_at, md_subscription_tiers(name), countries(name, currency_code, currency_symbol)`)
```

### Database Index Migration (Improvement 3)

```sql
CREATE INDEX IF NOT EXISTS idx_base_fees_country_tier_model ON md_challenge_base_fees(country_id, tier_id, engagement_model_id);
CREATE INDEX IF NOT EXISTS idx_base_fees_active ON md_challenge_base_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_platform_fees_country_tier_model ON md_platform_fees(country_id, tier_id, engagement_model_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_active ON md_platform_fees(is_active);
CREATE INDEX IF NOT EXISTS idx_shadow_pricing_country_tier ON md_shadow_pricing(country_id, tier_id);
CREATE INDEX IF NOT EXISTS idx_shadow_pricing_active ON md_shadow_pricing(is_active);
```

### Memoization Pattern (Improvement 4)

```typescript
// BEFORE
const tierOptions = tiers.map((t) => ({ value: t.id, label: t.name }));

// AFTER
const tierOptions = React.useMemo(
  () => tiers.map((t) => ({ value: t.id, label: t.name })),
  [tiers]
);
```

