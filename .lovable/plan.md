

# MOD-01 Gap Analysis: Platform Admin Profile Management

## Summary

The MOD-01 implementation covers the core structure well — all 6 screens, 3 modals, database tables, edge functions, and UI components exist. However, there are significant gaps between the tech spec requirements and the current implementation. Below is a screen-by-screen breakdown.

---

## What IS Implemented (Working)

| Requirement | Status |
|---|---|
| SCR-01-01: Platform Admin List page with status filter, table, workload bar, expertise tags | Done |
| SCR-01-02: Create Platform Admin form with all fields | Done |
| SCR-01-03: Edit Platform Admin with read-only email, tier restrictions | Done |
| SCR-01-04: View Profile with tabs (Profile, Assignment Log placeholder, Audit Log, Performance placeholder) | Done |
| SCR-01-05: My Profile (self-service, read-only) | Done |
| SCR-01-06: Availability Settings with leave dates | Done |
| MOD-M-05: Deactivate Admin modal | Done |
| MOD-M-08: Leave Confirmation modal | Done |
| Admin tier system (supervisor/senior_admin/admin) | Done |
| Shared PlatformAdminForm (create + edit) | Done |
| AdminStatusBadge, WorkloadBar, ExpertiseTags components | Done |
| ExecutiveContactWarningBanner | Done |
| Audit log tab with pagination | Done |
| Edge functions: register-platform-admin, manage-platform-admin | Done |
| DB tables: platform_admin_profiles, audit log, performance metrics, md_mpa_config | Done |

---

## Gaps Found

### SCR-01-01 (Platform Admin List)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Count badge** | Page title should show total count badge e.g. "(12)" | No count shown |
| **Missing: Assignment Priority column** | Priority 1-3 green, 4-7 amber, 8-10 red badge | Not in table |
| **Missing: Last Assignment column** | Relative time "2h ago" or "Never assigned" in grey italics | Not in table |
| **Missing: Deactivate action in list** | X icon button per row, disabled if last Available admin (BR-MPA-001) | No deactivate button in list rows |
| **Missing: Row click → View** | Click entire row navigates to SCR-01-04 | Only Eye button navigates |
| **Missing: Pagination** | Max 50 rows/page, default 20, TanStack Table pagination | No pagination at all |
| **Weak: Empty state** | Should have "+ Add your first admin" CTA | Just text, no CTA |

### SCR-01-02 (Create Platform Admin)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Phone E.164 validation** | Regex `/^\+[1-9]\d{6,14}$/` with specific error message | No regex validation in Zod schema |
| **Missing: Supervisor Flag toggle** | Toggle with amber warning when ON, confirm dialog (MOD-M-06) | No supervisor flag toggle; only tier dropdown exists |
| **Missing: MOD-M-06 modal** | Supervisor Flag Toggle confirmation modal with two states | Component file doesn't exist |
| **Missing: Navigate to SCR-01-04 on success** | After create, navigate to new admin's View Profile page | Navigates to list instead |
| **Missing: Unsaved changes warning** | Confirm dialog on Cancel if form dirty | No dirty check |
| **Missing: Welcome email toast** | "[Name] has been added...Welcome email sent to [email]" | Generic toast |

### SCR-01-03 (Edit Platform Admin)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Padlock icon on email** | Read-only email with padlock icon + tooltip | Just disabled input with description text |
| **Missing: Capacity warning** | Amber warning if reducing max_concurrent below current_active | No warning shown |
| **Missing: Last Industry tag removal block** | Inline error when trying to remove last tag | Only Zod min(1) validation |
| **Missing: Last Supervisor flag removal block** | Toast error if removing from last supervisor (BR-MPA-002) | No check before save |

### SCR-01-04 (View Profile)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Initials avatar** | Photo placeholder with initials | No avatar shown |
| **Missing: Phone in header** | Phone should be in header card | Phone only in General Info card |
| **Partial: Assignment Log tab** | Should show columns: Date/Time, Event Type badge, Org Name, From/To Admin, Reason, Initiator | Shows "Coming in MOD-02" placeholder |

### SCR-01-05 (My Profile)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Padlock icons** | Industry/Country/OrgType/Max/Priority all locked with padlock icon | No padlock icons shown |
| **Missing: "Only a Supervisor can modify..." text** | Grey italic text below each locked section | Not shown |
| **Missing: Initials avatar** | Initials avatar in profile header | No avatar |
| **Missing: My Performance quick link** | "View My Performance →" card link | Not shown |
| **Missing: My Assignment History** | Last 5 assignments with "View full history →" | Not shown |
| **Missing: Leave dates display** | If On Leave: "On Leave: 10 Mar – 20 Mar 2026" | Shows raw dates, no formatted display |

### SCR-01-06 (Availability Settings)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Current Active Count info card** | "You currently have [N] active verifications" | Not shown |
| **Missing: Immediate vs Scheduled leave banners** | Amber banner for immediate, Blue banner for scheduled | No banners |
| **Missing: Last Available Admin red warning** | Red banner + disabled save if only Available admin (BR-MPA-001) | No BR-MPA-001 check |
| **Missing: Leave Start min=today validation** | Client-side validation for no past dates | No min date constraint |
| **Bug: useState used as initializer** | `useState(() => {...})` on line 31 is incorrect — should be `useEffect` | Functional bug |

### MOD-M-05 (Deactivate Modal)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Wrong: Confirmation text** | Spec requires typing admin's **exact full name** (case-sensitive) | Requires typing "DEACTIVATE" |
| **Missing: Admin summary card** | Shows name, email, status badge, workload bar in modal | No summary card |
| **Missing: Pre-guards** | Button disabled if last Available or last Supervisor — toast shown | No pre-guard checks |

### MOD-M-08 (Leave Confirmation Modal)

| Gap | Spec Requirement | Current State |
|---|---|---|
| **Missing: Three variants** | IMMEDIATE (amber), SCHEDULED (blue), RESTORE TO AVAILABLE (green) | Single generic variant only |
| **Missing: Pending count** | "Your [N] pending verifications will be reassigned" | Not shown |
| **Missing: Color-coded headers** | Amber/Blue/Green header based on variant | Plain header |

### Business Rules

| Rule | Spec | Current State |
|---|---|---|
| **BR-MPA-001** | Prevent last Available admin from On Leave/Inactive | **Not enforced** in UI (may be in DB trigger) |
| **BR-MPA-002** | Prevent removing last Supervisor flag | **Not enforced** in edit form UI |
| **BR-MPA-004** | Auto-calculate availability status based on workload ratio | No auto-calculation visible |
| **BR-MPA-005** | Immediate vs scheduled leave with pg_cron | No differentiation in UI; no pg_cron job |
| **BR-MPA-006** | Audit logging with IP address | IP address not captured in frontend calls |

---

## Estimated Completion: ~65-70%

The core data model, CRUD operations, screens, and navigation are in place. The gaps are primarily:
1. **UI polish and spec-exact details** (padlock icons, avatars, count badges, banners)
2. **Business rule enforcement in UI** (BR-MPA-001/002 pre-guards, capacity warnings)
3. **Modal fidelity** (name-match confirmation, 3-variant leave modal, MOD-M-06 missing entirely)
4. **Missing table columns** (priority badge, last assignment, deactivate action)
5. **Bug fix** (useState misuse in AvailabilitySettingsPage)

### Recommended Priority Order
1. Fix the `useState` bug in AvailabilitySettingsPage (functional defect)
2. Implement BR-MPA-001/002 pre-guards (security/data integrity)
3. Fix DeactivateAdminModal to require exact name match
4. Add missing MOD-M-06 (Supervisor Flag Toggle modal)
5. Add missing table columns + pagination to list page
6. Add 3-variant leave confirmation modal
7. UI polish (padlock icons, avatars, banners, count badges)

