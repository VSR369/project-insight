

# Comprehensive GAP Analysis: BRD + Tech Spec v4.0 vs Current Implementation

## Summary

The Tech Spec defines **7 modules, 30 screens, 22 APIs, 49 test cases**. The current implementation covers approximately **30-35%** of requirements, concentrated in MOD-01 (partial) and MOD-04 (partial). Major modules are entirely missing.

---

## SECTION A: HARDCODED VALUES (Violations of Master Data Purity)

| Location | Hardcoded Value | Required Source |
|---|---|---|
| `src/lib/validations/challengeAssignment.ts` line 8 | `MARKETPLACE_CORE_ROLES = ["R3", "R5_MP", "R6_MP", "R7_MP"]` — hardcoded array | Must fetch from `md_slm_role_codes` where `model_applicability = 'mp'` |
| `src/lib/validations/challengeAssignment.ts` lines 19-22 | Hardcoded `.refine()` checks for R3, R5_MP, R6_MP, R7_MP with hardcoded min counts | Must derive from `md_slm_role_codes.min_required` field dynamically |
| `src/hooks/queries/useSolutionRequests.ts` lines 73-76 | `counts = { R3: ..., R5_MP: ..., R6_MP: ..., R7_MP: ... }` — hardcoded role codes | Must derive from master data query |
| `src/components/rbac/MsmeQuickAssignModal.tsx` line 146 | `"Platform Admin"` and `"admin@cogiblend.com"` — hardcoded user info in "Myself" tab | Must use `useCurrentAdminProfile()` hook to get real user data |
| `src/components/rbac/RoleTable.tsx` lines 31-57 | `StatusBadge` hardcodes color classes for each status | Must use `md_role_assignment_statuses.color_class` from DB via `useRoleAssignmentStatuses()` |
| `src/pages/admin/marketplace/EmailTemplatesPage.tsx` | Entire email template content is hardcoded HTML/JSX (org names, role lists, etc.) | Should render dynamically using master data for role names and org details |

---

## SECTION B: MODULE-BY-MODULE GAP ANALYSIS

### MOD-01: Platform Admin Hierarchy & Resource Pool Management (12 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-PP-001 | **Partial** | Pool CRUD exists (`usePoolMembers.ts`). Missing: Supervisor confirmation token for deactivating Supervisor-created members (BR-PP-002) |
| BR-PP-002 | **Missing** | No confirmation token flow when Senior Admin deactivates a Supervisor-created pool member |
| BR-PP-003 | **Partial** | Basic Admin read-only enforcement exists in UI but no explicit RLS policy for `platform_provider_pool` |
| BR-PP-004 | **Implemented** | Pool member form validates role + industry + proficiency |
| BR-PP-005 | **Missing** | No before/after audit logging on pool member edits (no `role_audit_log` writes from frontend) |
| BR-POOL-001-003 | **Partial** | Pool list, filtering exist. Real-time availability badge recalculation via DB trigger not verified |
| BR-AVAIL-001-004 | **Partial** | Availability badge exists. Missing: real-time recalculation trigger, "No available members" 3-option alert (Broaden/Wait/Escalate), auto-decrement on challenge archive |

**Screens:**
| Screen | Status |
|---|---|
| SCR-01 Resource Pool Dashboard | Implemented |
| SCR-02 Add/Edit Pool Member Form | Implemented |
| SCR-03 Pool Member Profile Detail + Audit View | **Missing** |
| SCR-05c No Available Members Alert (3 options) | **Missing** |

---

### MOD-02: Per-Challenge Marketplace Role Assignment (10 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-ASSIGN-001 | **Missing** | No per-challenge assignment panel. Current code has `challenge_role_assignments` table and basic hooks but **no UI for the Assignment Panel with 4 role slots** |
| BR-ASSIGN-002 | **Missing** | No pre-population of previous team for same Seeking Org |
| BR-ASSIGN-003 | **Missing** | No "Fully Booked" greyed-out state in Assignment Panel |
| BR-ASSIGN-004 | **Partial** | Zod schema exists in `challengeAssignment.ts` but **no UI** for the 4-slot assignment confirm flow |
| BR-ASSIGN-005 | **Missing** | Reassignment modal/form not built (SCR-07) |
| BR-ASSIGN-006 | **Missing** | No phase-aware Expert Reviewer assignment |
| BR-ASSIGN-007 | **Missing** | No complete assignment history view per challenge |
| BR-MP-CONTACT-001 | **Implemented** | Admin contact profile page exists (SCR-19) |
| BR-MP-CONTACT-002 | **Missing** | No confirmation email on assignment (no Edge Function) |
| BR-MP-CONTACT-003 | **Missing** | No challenge blocking when core roles missing |

**Screens:**
| Screen | Status |
|---|---|
| SCR-04 MP Solution Request Queue | **Partial** (basic list exists, no assignment integration) |
| SCR-05 Challenge Assignment Panel (4 role slots) | **Missing** |
| SCR-06 Assignment Confirmation Screen | **Missing** |
| SCR-07 Mid-Challenge Reassignment Modal | **Missing** |

---

### MOD-03: Seeking Org Admin Provisioning & Delegated SOA Management (12 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-SOA-001 | **Partial** | Auto-provisioning via `create-org-admin` Edge Function exists. Primary SOA permanent lifecycle partially enforced |
| BR-SOA-002 | **Implemented** | Delegated Admin creation with scope exists (`AdminManagementPage.tsx`) |
| BR-SOA-003 | **Partial** | Domain scope restriction exists in UI. Missing: `check_delegated_scope()` DB function for server-side enforcement |
| BR-SOA-004 | **Implemented** | Deactivation exists via `deactivate-delegated-admin` Edge Function |
| BR-SOA-005 | **Partial** | Max limit check exists. Missing: 80% threshold warning toast |
| BR-DEL-001 | **Implemented** | Scope selector with cascading taxonomy exists |
| BR-DEL-002 | **Partial** | Scope narrowing warning exists in `EditDelegatedAdminPage.tsx`. Missing: blocking modal (SCR-14a) with explicit count and confirmation |
| BR-DEL-003 | **Partial** | Scope overlap check exists. Logging on save may be incomplete |
| BR-RL-009 | **Missing** | No state machine lifecycle for Delegated SOA (Invited → Active → Inactive/Suspended → Expired) |
| BR-RL-010 | **Missing** | No Reassignment Wizard (SCR-15a) — multi-step modal for orphan role reassignment |

**Screens:**
| Screen | Status |
|---|---|
| SCR-16 Delegated Admin List View | **Implemented** (`AdminManagementPage.tsx`) |
| SCR-13 Add Delegated SOA Form | **Implemented** (exists in org portal) |
| SCR-14 Edit Scope Form | **Implemented** (`EditDelegatedAdminPage.tsx`) |
| SCR-14a Orphan Roles Warning Modal | **Missing** (basic warning exists, not blocking modal with count) |
| SCR-15 Delegated SOA Deactivation Check | **Partial** |
| SCR-15a Reassignment Wizard (3-step) | **Missing** |

---

### MOD-04: Core Role Management — Both Models (7 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-CORE-001 | **Implemented** | Core roles (R2, R8, R9) shown in dashboard tab, persistent across challenges |
| BR-CORE-002 | **Missing** | No "last Active user" deactivation block. No validation preventing deactivation of the only Active user for a core role |
| BR-CORE-003 | **Partial** | PA can create core roles on behalf of org via `AssignRoleSheet`. Missing: audit trail recording "Created By: Platform Admin on behalf of [Org]" |
| BR-CORE-004 | **Missing** | No `check_model_authority()` DB function. No SCR-10a Platform Admin Blocked Screen. PA can currently access AGG role creation without restriction |
| BR-CORE-005 | **Partial** | Admin contact stored. Contact routing logic (MP→PA, AGG→SOA) not implemented |
| BR-CORE-006 | **Partial** | `role_readiness_cache` table exists. Readiness widget reads from it. Missing: DB trigger to recompute on role_assignments changes |
| BR-CORE-007 | **Missing** | No auto-notification to Challenge Creator when last missing role transitions to Active |

**Screens:**
| Screen | Status |
|---|---|
| SCR-08 Role Management Dashboard | **Implemented** |
| SCR-09 Add Core Role Form | **Implemented** (AssignRoleSheet) |
| SCR-10a Platform Admin AGG Blocked Screen | **Missing** |

---

### MOD-05: Aggregator Model — Full Role Setup (5 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-AGG-001 | **Missing** | No AGG role creation UI for SOA. No Challenge Roles tab showing R4, R5_AGG, R6_AGG, R7_AGG. No multi-role badge on user card |
| BR-AGG-002 | **Missing** | No enforcement that PA cannot assign challenge-level roles for AGG challenges |
| BR-AGG-003 | **Partial** | SOA contact panel exists (`SoaContactDetailsPanel`). Missing: separate SOA contact table (currently uses same `rbac_admin_contact`) |
| BR-AGG-004 | **Missing** | No auto-notification on READY transition |
| BR-AGG-005 | **Missing** | No NOT_READY notification dispatch to Primary SOA + in-scope Delegated SOAs |

**Screens:**
| Screen | Status |
|---|---|
| SCR-10 Add AGG Role Form | **Missing** |
| SCR-10a PA Blocked Screen | **Missing** |
| SCR-11 Role Readiness Panel (Expanded) | **Missing** |
| SCR-11a Role Readiness Block Screen | **Missing** |
| SCR-17 Availability Confirmation Modal | **Missing** |
| SCR-18 "Challenge Can Proceed" Notification | **Missing** |

---

### MOD-06: Role Readiness API & Notification Engine (6 BRs)

| BR | Status | Gap Description |
|---|---|---|
| BR-CORE-005 | **Missing** | No Edge Function for Role Readiness API (`GET /role-readiness/:org_id/:model`) |
| BR-CORE-006 | **Missing** | No DB trigger on `role_assignments` to recompute `role_readiness_cache` |
| BR-CORE-007 | **Missing** | No READY transition notification Edge Function |
| BR-AGG-003 | **Missing** | Contact routing (MP→PA, AGG→SOA) not implemented |
| BR-AGG-004 | **Missing** | No auto-notification on READY transition |
| BR-AGG-005 | **Missing** | No NOT_READY notification dispatch |

**Screens:**
| Screen | Status |
|---|---|
| SCR-12 NOT_READY In-App Notification | **Missing** |
| SCR-19 Admin Contact Profile (PA) | **Implemented** |
| SCR-20 Admin Contact Profile (SOA) | **Implemented** (SoaContactDetailsPanel) |

---

### MOD-07: Design Decisions & Cross-Cutting Constraints (D1-D9)

| Decision | Status |
|---|---|
| D1: Model selected PER CHALLENGE | Not enforced in UI — no challenge-level model selector |
| D2: SELF/SEPARATE designation at registration | Partially implemented in org registration flow |
| D3: Auto-provision Primary SOA | Implemented via Edge Function |
| D4: Three core roles regardless of model | Implemented in dashboard |
| D5: PA maintains global SLM pool for MP | Implemented |
| D6: SOA creates all AGG roles | **Not implemented** — no AGG role creation UI |
| D7: Single user MAY hold ALL roles | Supported via MSME mode |
| D8: Domain tagging at role assignment level | Implemented in AssignRoleSheet |
| D9: JIT field collection | Not applicable yet (no lifecycle integration) |

---

## SECTION C: MISSING DATABASE INFRASTRUCTURE

| Item | Status |
|---|---|
| `check_model_authority()` DB function | **Missing** — required by BR-CORE-004 to block PA from AGG roles |
| `check_delegated_scope()` DB function | **Missing** — required by BR-SOA-003 for scope enforcement |
| DB trigger on `role_assignments` → recompute `role_readiness_cache` | **Missing** |
| `pending_challenge_refs` table | **Missing** — needed for BR-MP-CONTACT-003 challenge blocking |
| RLS policies per Tech Spec Section 3.4 | **Partial** — `role_assignments` RLS exists but without `check_model_authority` / `check_delegated_scope` |
| `role_audit_log` append-only enforcement | Table exists but no write integration from frontend mutations |
| Required indexes (Section 3.3) | **Not verified** — 9 indexes specified |

---

## SECTION D: MISSING EDGE FUNCTIONS

| Edge Function | Purpose | Status |
|---|---|---|
| Role Readiness API | `GET /role-readiness/:org_id/:model` | **Missing** |
| NOT_READY Notification | Dispatch email+in-app on NOT_READY detection | **Missing** |
| READY Transition Notification | Notify Challenge Creator when READY | **Missing** |
| Assignment Confirmation Email | Email team + AM on MP assignment | **Missing** |

---

## SECTION E: MISSING ZOD SCHEMAS

| Schema | Status |
|---|---|
| `poolMemberSchema` | **Implemented** (`src/lib/validations/poolMember.ts`) |
| `challengeAssignmentSchema` | **Implemented** but with hardcoded role codes |
| `reassignmentSchema` | **Implemented** but with hardcoded role codes |
| `delegatedSoaSchema` | **Partial** — exists in org portal hooks |
| `scopeNarrowingSchema` | **Missing** |
| `coreRoleInviteSchema` | **Implemented** (`roleAssignment.ts`) |
| `aggRoleSchema` | **Missing** |

---

## SECTION F: PRIORITY RANKING OF GAPS

### Priority 1 — Critical (Breaks Business Rules)
1. Fix hardcoded role codes in `challengeAssignment.ts` — derive from `md_slm_role_codes`
2. Fix hardcoded user data in `MsmeQuickAssignModal.tsx` "Myself" tab
3. Fix hardcoded status colors in `RoleTable.tsx` — use `md_role_assignment_statuses`
4. Build `check_model_authority()` DB function (BR-CORE-004)
5. Build SCR-10a Platform Admin Blocked Screen for AGG roles
6. Build DB trigger: `role_assignments` → recompute `role_readiness_cache`
7. Implement BR-CORE-002: Block deactivation of last Active core role user

### Priority 2 — High (Missing Core Screens)
8. Build MOD-05 AGG Role Management UI (SCR-10 + Challenge Roles tab for SOA)
9. Build MOD-02 Assignment Panel (SCR-05) with 4 role slots
10. Build Role Readiness API Edge Function (MOD-06)
11. Build NOT_READY/READY notification Edge Functions
12. Build SCR-07 Mid-Challenge Reassignment Modal
13. Build SCR-15a Reassignment Wizard (3-step)
14. Build SCR-11 Role Readiness Panel (Expanded)
15. Build SCR-11a Submission Blocked Screen

### Priority 3 — Medium (Enhancement)
16. Build SCR-03 Pool Member Profile Detail + Audit View
17. Build SCR-06 Assignment Confirmation Screen
18. Build `check_delegated_scope()` DB function
19. Build `pending_challenge_refs` table and integration
20. Add before/after audit logging via `role_audit_log`
21. Implement 80% Delegated SOA limit warning toast
22. Build SCR-14a Orphan Roles blocking modal with count
23. Build SCR-17 Availability Confirmation Modal (AGG)

### Priority 4 — Low (Polish)
24. Build SCR-12 NOT_READY In-App Notification drawer
25. Build SCR-18 Challenge Can Proceed notification
26. Verify all 9 required indexes exist
27. Add RLS policies per Section 3.4 spec
28. Email template content from master data (not hardcoded JSX)

---

## OVERALL SCORE

| Category | Total | Implemented | Partial | Missing |
|---|---|---|---|---|
| Business Rules (44 BRs) | 44 | 8 (18%) | 14 (32%) | 22 (50%) |
| Screens (30) | 30 | 8 (27%) | 4 (13%) | 18 (60%) |
| Edge Functions (4 required) | 4 | 0 (0%) | 0 | 4 (100%) |
| DB Functions (2 required) | 2 | 0 (0%) | 0 | 2 (100%) |
| Hardcoded Violations | 6 | — | — | 6 to fix |

