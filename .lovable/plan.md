

# Critical Review: RBAC Remediation — Gap Closure Verification

## Verdict: 6 of 8 Phases Fully Implemented. 7 Integration Gaps Remain.

---

## Phase-by-Phase Verification

### Phase 1: Database & Audit Infrastructure — COMPLETE
| Item | Status | Evidence |
|------|--------|----------|
| 1A. `delegated_soa_scope_audit` table | DONE | Migration `20260312063729` creates table with RLS, indexes |
| 1B. `role_domain_tags` table | DEFERRED (by design) | Inline JSONB approach kept — acceptable per plan |
| 1C. `pending_challenge_refs` wired | DONE | `usePendingChallengeRefs` hook created; wired into `RoleReadinessPanel` and `SubmissionBlockedScreen` |

### Phase 2: Business Rule Enforcement — COMPLETE (code created)
| Item | Status | Evidence |
|------|--------|----------|
| 2A. Supervisor confirmation token | DONE | `SupervisorDeactivationConfirmModal` imported by `ResourcePoolPage` |
| 2B. 7-day invitation expiry | DONE | Edge Function `expire-stale-invitations` created |
| 2C. Previous team suggestion | DONE | `PreviousTeamSuggestion` imported by `AssignMemberModal` |
| 2D. Idempotency key | DONE | Column added via migration, in `types.ts` |
| 2E. Assignment phase | DONE | Column added via migration, in `types.ts` |
| 2F. Create On Behalf | DONE | `CreateOnBehalfSheet` component created |

### Phase 3: Missing Screens & Modals — COMPLETE (code created)
| Item | Status | Evidence |
|------|--------|----------|
| 3A. SCR-05b Fully Booked Alternatives | DONE | `FullyBookedAlternativesModal` imported by `AssignMemberModal` |
| 3B. SCR-05c No Available Members | DONE | `NoAvailableMembersAlert` imported by `AssignMemberModal` |
| 3C. SCR-06 Assignment Confirmation | DONE | `AssignmentConfirmationScreen` created |
| 3D. SCR-14 Edit Scope side-by-side | DONE | `EditDelegatedAdminPage` has `originalScope` vs `scope` with `DomainScopeDisplay` |
| 3E. SCR-16 Delegated Admin tab | DONE | `DelegatedAdminListTab` added to `RoleManagementDashboard` |
| 3F. SCR-16a Limit Warning | DONE | `DelegatedAdminLimitWarning` used in both `DelegatedAdminListTab` and `CreateDelegatedAdminPage` |
| 3G. SCR-15 Deactivation Check | DONE | `DeactivationCheckModal` used by `DelegatedAdminListTab` |

### Phase 4: Code Quality — MOSTLY COMPLETE
| Item | Status | Evidence |
|------|--------|----------|
| 4A. Replace raw console.error | DONE | Zero `console.error` matches in `useSeekerOrgApprovals.ts` |
| 4B. Consolidate duplicate hooks | DONE | `useOrgCoreRoles` deprecated, zero consumers |
| 4C. Consolidate `useSlmPoolRoles` | PARTIAL | Deprecated wrapper exists and delegates to `useChallengeRoleCodes("mp")`, but **still imported by 2 files** (see gap G1) |
| 4D. Shared mapping function | DONE | `mapChallengeAssignmentRow` extracted in `useSolutionRequests.ts` |
| 4E. Rename ReassignmentWizard | DONE | File renamed to `DelegatedAdminReassignmentWizard.tsx` |

### Phase 5: Security — CREATED BUT NOT WIRED
| Item | Status | Evidence |
|------|--------|----------|
| 5A. MfaGuard | CREATED but **NOT IMPORTED ANYWHERE** (see gap G2) |
| 5B. Rate limiting | Documented as infra task — acceptable |

### Phase 6: Notifications — COMPLETE
| Item | Status | Evidence |
|------|--------|----------|
| 6A. Retry with backoff | DONE | `insertWithRetry` in `role-readiness-notify` |
| 6B. Delegated SOA routing | DONE | `role-readiness-notify` queries `seeking_org_admins` for delegated tier |
| 6C. READY auto-notification | DONE | Challenge creator notified, `pending_challenge_refs` resolved |

### Phase 7: API Layer — COMPLETE
| Item | Status | Evidence |
|------|--------|----------|
| 7A. Role Readiness API | DONE | `role-readiness-api` Edge Function created |
| 7B. Admin Contact API | NOT DONE as separate endpoint — contact data is fetched via `useAdminContact` hook directly. Acceptable for current architecture. |

### Phase 8: Polish — CREATED BUT NOT WIRED
| Item | Status | Evidence |
|------|--------|----------|
| 8A. Session recovery | CREATED (`useSessionRecovery.ts`) but **NOT IMPORTED ANYWHERE** (see gap G5) |
| 8B. Duplicate invitation check | CREATED (`useDuplicateInvitationCheck.ts`) but **NOT IMPORTED ANYWHERE** (see gap G6) |
| 8C. Cross-org 404 vs 403 | Relies on RLS — no code change needed |

---

## Remaining Gaps That Need Fixing

### G1. `useSlmPoolRoles` still imported by 2 pages
- **Files**: `SolutionRequestsPage.tsx` (line 24), `AssignmentHistoryPage.tsx` (line 14)
- **Fix**: Replace imports with `useChallengeRoleCodes("mp")` — the deprecated wrapper delegates correctly so this is cosmetic but violates the consolidation goal

### G2. `MfaGuard` not wired into any route
- **Impact**: MFA enforcement (TS §0.3) is **completely inactive** — the component exists but no admin route wraps children with it
- **Fix**: Wrap RBAC admin routes (Platform Admin portal, SOA portal) with `<MfaGuard>` in the router config

### G3. `CreateOnBehalfSheet` not imported or rendered anywhere
- **Impact**: BR-CORE-003 (Platform Admin creates core roles on behalf of org) has no entry point
- **Fix**: Import and render in a Platform Admin page (e.g., `ResourcePoolPage` or a new admin marketplace sub-page) with a trigger button

### G4. `AssignmentConfirmationScreen` not imported or rendered anywhere
- **Impact**: SCR-06 exists as a component but is unreachable — no page or modal renders it
- **Fix**: Wire into `ChallengeAssignmentPanel` as a post-assignment view, or show after successful assignment in `SolutionRequestsPage`

### G5. `useSessionRecovery` hooks not used by any component
- **Impact**: Phase 8A session recovery is dead code
- **Fix**: Wire `useSessionExpiryWatcher` into `AssignMemberModal` or `CreateOnBehalfSheet` and `useRestoreFormFromRecovery` on mount

### G6. `checkDuplicateInvitation` not called before any assignment creation
- **Impact**: Phase 8B duplicate prevention is dead code
- **Fix**: Call `checkDuplicateInvitation()` in `useCreateRoleAssignment` or `AssignRoleSheet` before insert

### G7. `DelegatedAdminReassignmentWizard` not imported anywhere
- **Impact**: The renamed component has zero consumers — the orphan reassignment flow is broken
- **Fix**: Import in `DelegatedAdminListTab` or `OrphanRolesBlockingModal` where the original `ReassignmentWizard` was used

---

## Summary Scorecard

| Category | Items | Done | Wired & Active | Dead Code |
|----------|-------|------|-----------------|-----------|
| DB/Migrations | 4 | 4 | 4 | 0 |
| Edge Functions | 3 | 3 | 3 | 0 |
| Components | 12 | 12 | 8 | **4** |
| Hooks/Utils | 4 | 4 | 2 | **2** |
| Code Quality | 5 | 4 | 4 | 0 |
| **TOTAL** | **28** | **27** | **21** | **6** |

**Bottom line**: All 28 remediation items have been *coded*, but **6 items are dead code** — created but never imported/rendered. These need to be wired into the application to be functional. The 7 gaps listed above (G1–G7) represent the final integration work needed to fully close the remediation plan.

