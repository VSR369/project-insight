

# Inconsistency Audit: Hardcoded / Duplicated Data vs. Existing Master Data Tables

## Summary of Findings

The system has **3 master data domains** where the Platform Admin module uses hardcoded values or plain-text strings instead of referencing existing master data tables. Additionally, the `seeking_org_admins.domain_scope` column is `TEXT` instead of structured references. Here is the full audit.

---

## INCONSISTENCY 1 — `org_type_expertise`: Hardcoded strings instead of `organization_types` UUIDs

**Severity: HIGH — Data mismatch, scoring broken**

| Aspect | Current (Wrong) | Should Be |
|--------|----------------|-----------|
| DB column type | `TEXT[]` (plain strings) | `UUID[]` (FK references) |
| Picker component | `OrgTypeExpertisePicker.tsx` — 7 hardcoded strings: Corporation, Partnership, LLC, Non-Profit, Government, Academic, Other | Should query `organization_types` table (like Industry and Country pickers already do) |
| Zod schema | `z.array(z.string()).default([])` | `z.array(z.string().uuid()).default([])` |
| ExpertiseTags display | Returns raw strings (`return ids;`) instead of looking up names | Should query `organization_types` table by UUID |
| Auto-assignment scoring | Compares `p_org_type = ANY(pap.org_type_expertise)` — but `p_org_type` comes from seeker org data (likely a UUID or name from `organization_types`), while `org_type_expertise` stores hardcoded strings like "Corporation" | **Scoring comparison will never match** if the org type data uses different naming |

**What exists in master data already:**
- `organization_types` table with `id, code, name, display_order` — managed via the Master Data Portal
- `org_type_seeker_rules` extension table for business rules per org type
- `useOrganizationTypes()` hook in `useMasterData.ts` already fetches this data

**Fix required:**
1. Migrate `org_type_expertise` column from `TEXT[]` to `UUID[]`
2. Rewrite `OrgTypeExpertisePicker` to query `organization_types` table (same pattern as `IndustryExpertisePicker`)
3. Update `ExpertiseTags` to look up `organization_types` by UUID for `org_type` type
4. Update Zod schema to `z.array(z.string().uuid())`
5. Update `execute_auto_assignment` and `get_eligible_admins_ranked` RPCs to compare UUIDs consistently
6. Data migration: map existing text values to corresponding `organization_types.id` UUIDs

---

## INCONSISTENCY 2 — `seeking_org_admins.domain_scope`: Plain TEXT instead of structured master data references

**Severity: MEDIUM — Currently unused, but blocks Delegated Admin feature**

| Aspect | Current | Should Be |
|--------|---------|-----------|
| Column type | `TEXT NOT NULL DEFAULT 'ALL'` | Either `JSONB` with UUID arrays referencing master data, or a junction table |
| Content | Stores literal string `'ALL'` | Should reference `industry_segments.id`, `proficiency_areas.id`, `sub_domains.id`, `specialities.id` via UUIDs |

The BRD specifies `{industry_segments: [], proficiency_levels: [], sub_domains: [], specialties: []}` — but since all four of these are already master data tables with proper UUIDs, the scope should store UUID references, not create new data.

**No immediate fix needed** — this is a future feature (Delegated Admin). But when implemented, it MUST use UUID references to existing master data tables, not recreate them.

---

## INCONSISTENCY 3 — Duplicate query patterns for the same master data

**Severity: LOW — Functional but violates DRY principle**

`IndustryExpertisePicker` and `CountryExpertisePicker` each contain their own inline `useQuery` calls to fetch `industry_segments` and `countries`. The `useMasterData.ts` hooks (`useIndustrySegments()`, `useCountries()`) already exist and fetch the same data with proper cache settings.

| Component | Current | Should Use |
|-----------|---------|-----------|
| `IndustryExpertisePicker` | Inline `useQuery` with key `'industry-segments-picker'` | `useIndustrySegments()` from `useMasterData.ts` |
| `CountryExpertisePicker` | Inline `useQuery` with key `'countries-picker'` | `useCountries()` from `useMasterData.ts` |

This creates duplicate cache entries and inconsistent staleness behavior.

---

## INCONSISTENCY 4 — Auto-assignment scoring uses mismatched data types

**Severity: HIGH — Scoring logic silently fails**

The `execute_auto_assignment` and `get_eligible_admins_ranked` RPCs compare:
- `p_org_type` (passed from seeker org data — likely the org type **name** or **UUID** from `organization_types`)
- Against `pap.org_type_expertise` (which stores hardcoded **text labels** like "Corporation")

If the seeker org stores `organization_type_id` (a UUID), and admin expertise stores text strings, the `= ANY()` comparison **never matches**, meaning L3 scoring always returns 0 or wildcard half-points.

---

## Implementation Plan

### Phase 1: Fix `org_type_expertise` (Critical)
1. **Database migration**: ALTER `platform_admin_profiles.org_type_expertise` from `TEXT[]` to `UUID[]`
2. **Data migration**: Map existing text values ("Corporation", "LLC", etc.) to `organization_types.id` UUIDs
3. **Rewrite `OrgTypeExpertisePicker`**: Query `organization_types` table via `useOrganizationTypes()` hook — same pattern as `IndustryExpertisePicker`
4. **Update `ExpertiseTags`**: Add `organization_types` lookup for `org_type` type (currently returns raw strings)
5. **Update Zod schema**: `org_type_expertise: z.array(z.string().uuid()).default([])`
6. **Update RPCs**: Ensure `execute_auto_assignment` and `get_eligible_admins_ranked` pass `organization_type_id` (UUID) as `p_org_type` and compare against UUID array

### Phase 2: DRY the picker queries (Low effort)
1. Replace inline queries in `IndustryExpertisePicker` and `CountryExpertisePicker` with shared hooks from `useMasterData.ts`

### Phase 3: Document `domain_scope` decision (No code change)
1. Record in plan.md that `seeking_org_admins.domain_scope` MUST be converted to JSONB with UUID references to existing master data tables when the Delegated Admin feature is built — no new lookup tables or JSON string lists

---

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | ALTER column type, data migration, RPC updates |
| `OrgTypeExpertisePicker.tsx` | Rewrite to query `organization_types` table |
| `ExpertiseTags.tsx` | Add `organization_types` lookup branch |
| `platformAdminForm.schema.ts` | Change validation to `z.array(z.string().uuid())` |
| `IndustryExpertisePicker.tsx` | Use `useIndustrySegments()` instead of inline query |
| `CountryExpertisePicker.tsx` | Use `useCountries()` instead of inline query |
| `manage-platform-admin/index.ts` | No change needed (passes arrays through) |
| `.lovable/plan.md` | Document `domain_scope` decision |

