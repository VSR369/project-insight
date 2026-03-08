

# Audit: Hardcoded Values in Admin Modules

## Assessment

After a thorough search across the supervisor, senior admin, and basic admin modules, here is the current state:

---

## ALREADY FIXED (from last session)
These three pickers now correctly use master data via shared hooks:
- **IndustryExpertisePicker** → `useIndustrySegments()` from `useMasterData.ts`
- **CountryExpertisePicker** → `useCountries()` from `useMasterData.ts`
- **OrgTypeExpertisePicker** → `useOrganizationTypes()` from `useMasterData.ts`
- **ExpertiseTags** → looks up all three types by UUID from master data tables

**No remaining hardcoded master data references in the expertise/profile management area.**

---

## APPROPRIATELY HARDCODED (no action needed)

These items are **internal system states** defined by database CHECK constraints, not user-managed master data. Hardcoding them in the UI is correct:

| Item | Location | Why it's OK |
|------|----------|-------------|
| Availability statuses (`Available`, `Partially_Available`, `Fully_Loaded`, `On_Leave`, `Inactive`) | `AdminStatusBadge.tsx`, `PerformanceFilters.tsx` | DB CHECK constraint — not user-editable, tied to trigger logic |
| Admin tiers (`supervisor`, `senior_admin`, `admin`) | `platformAdminForm.schema.ts` | DB CHECK constraint + trigger-enforced hierarchy |
| Notification types (`ASSIGNMENT`, `SLA_WARNING`, etc.) | `NotificationAuditFilters.tsx`, `NotificationCard.tsx`, `NotificationTypeBadge.tsx` | System-generated event types, not user-managed |
| Email delivery statuses (`SENT`, `PENDING`, `FAILED`, etc.) | `NotificationAuditFilters.tsx` | Internal delivery pipeline states |
| Permission keys in `PERMISSION_CATEGORIES` | `PermissionsManagementPage.tsx` | These are hardcoded category groupings for display — the actual permission data comes from the `tier_permissions` DB table |

---

## ONE MINOR INCONSISTENCY FOUND

**`PermissionsManagementPage.tsx` — hardcoded permission key list may drift from DB**

The `PERMISSION_CATEGORIES` array hardcodes 16 permission keys (e.g., `verification.view_dashboard`, `admin_management.create_admin`). If a new permission is added to the `tier_permissions` table, it won't appear in the UI unless this array is also updated manually.

**Options:**
- **Option A (recommended):** Keep as-is. Permission keys are structural (like routes) and change infrequently. The hardcoded categories provide meaningful grouping that can't easily be derived from flat DB rows.
- **Option B:** Add a `category` column to `tier_permissions` and build the matrix dynamically. More flexible but adds complexity for a rarely-changing dataset.

---

## CONCLUSION

**No remaining hardcoded values that should reference master data.** All three expertise pickers (Industry, Country, Org Type) now use UUID references to their respective master data tables via shared hooks. The remaining hardcoded strings are internal system states governed by DB constraints and triggers — hardcoding them in UI display components is the correct pattern.

