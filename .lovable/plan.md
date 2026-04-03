

# Implementation Plan: Configurable Lifecycle + Pipeline Fix

## Problem
Phase ordering is hardcoded (Create→Compliance→Curation), pool upsert fails, and the CU auto-assign fires at the wrong phase. This plan corrects to Create→Curation→Compliance, makes phase config database-driven, and builds an admin UI.

---

## PROMPT 1: Database Migration

**File:** New migration `supabase/migrations/20260403100000_lifecycle_phase_config_and_rpcs.sql` (already staged at `/tmp/migration.sql`)

**Part A** — Create `md_lifecycle_phase_config` table with 30 seed rows (10 phases × 3 governance modes). Key columns: `governance_mode`, `phase_number`, `phase_name`, `required_role`, `secondary_role`, `phase_type`, `auto_complete`, `gate_flags`, `sla_days`. RLS: public SELECT, supervisor/senior_admin for mutations.

**Part B** — Config-driven RPCs:
- `get_phase_required_role(phase, mode)` — reads from config table
- `get_phase_config(challenge_id, phase)` — returns JSONB with phase metadata
- `complete_phase` — full rewrite: reads phase config, checks gates, auto-advances recursively, handles compliance auto-set

**Part C** — `auto_assign_roles_on_creation`: QUICK=all 5 roles, STRUCTURED=CR+LC, CONTROLLED=CR only

**Part D** — `complete_legal_review` and `complete_financial_review` — now Phase 3 (compliance), config-driven phase lookup

**Part E** — Pool email constraint fix (already applied in previous migration, included for idempotency)

---

## PROMPT 2: Frontend Phase Reference Updates

### 2a. `src/hooks/cogniblend/useSubmitSolutionRequest.ts` (lines 160-180)
Change CU auto-assign threshold from `currentPhase >= 3` to `currentPhase >= 2` and skip for QUICK mode:
```typescript
const normalizedGov = (payload.governanceModeOverride ?? 'STRUCTURED').toUpperCase();
if (currentPhase >= 2 && normalizedGov !== 'QUICK') {
  // auto-assign CU from pool
}
```

### 2b. `src/pages/cogniblend/CurationQueuePage.tsx`
- Line 218: Change `.in("current_phase", [1, 2, 3])` → `.in("current_phase", [2])`
- Lines 105-128: Update `phaseBadge()` — Phase 2 = "Awaiting Curation" (not "Awaiting Legal")
- Lines 248-259: SLA check for Phase 2 instead of Phase 3
- Lines 296-303: Tab counts filter for Phase 2 instead of Phase 3
- Lines 312-326: Filtered view uses Phase 2
- Lines 434-439: Tooltip text updates

### 2c. `src/pages/cogniblend/LcLegalWorkspacePage.tsx` (line 572)
Update CU auto-assign comment — after legal review, if `phase_advanced` and `current_phase >= 4` (publication), no longer auto-assigning CU (curation is done before compliance now). Remove the CU auto-assign block entirely since curation happens BEFORE compliance.

### 2d. `src/pages/cogniblend/LegalDocumentAttachmentPage.tsx` (line 681)
Same change as 2c — remove CU auto-assign after legal review.

### 2e. `src/components/cogniblend/curation/CurationActions.tsx` (lines 75-91)
After curation approval calls `complete_phase`, add LC+FC pool auto-assign for CONTROLLED mode:
```typescript
onSuccess: async () => {
  // For CONTROLLED: auto-assign LC and FC from pool after curation
  const challenge = await fetchChallengeGovMode(challengeId);
  if (challenge === 'CONTROLLED') {
    await autoAssignChallengeRole({ challengeId, roleCode: 'LC', assignedBy: user.id });
    await autoAssignChallengeRole({ challengeId, roleCode: 'FC', assignedBy: user.id });
  }
}
```

### 2f. `src/hooks/cogniblend/useCompletePhase.ts` (line 80)
Change publication detection from `result.new_phase === 7` to `result.new_phase === 4` (Phase 4 = Publication in new config).

---

## PROMPT 3: Seed Edge Function Fix

**File:** `supabase/functions/setup-test-scenario/index.ts`

- Line 355: `"Phase 2 — COMPLIANCE"` → `"Phase 2 — CURATION"`
- Line 394: `"Phase 2 — COMPLIANCE"` → `"Phase 2 — CURATION"`
- Pool entries: Already fixed with SELECT+INSERT/UPDATE pattern (no changes needed)

Deploy edge function after changes.

---

## PROMPT 4: Admin Lifecycle Config Page

### New files:

**`src/hooks/queries/useLifecyclePhaseConfig.ts`** (~70 lines)
- `useLifecyclePhaseConfig(mode)` — fetches from `md_lifecycle_phase_config` filtered by governance_mode
- `useUpdateLifecyclePhase()` — mutation to update a single phase row with `withUpdatedBy`

**`src/components/admin/lifecycle/LifecyclePhaseRow.tsx`** (~100 lines)
- Single editable table row: phase name input, required_role select (CR/CU/ER/LC/FC/null), secondary_role select, phase_type select, auto_complete toggle, gate_flags multi-select, sla_days input
- Save button per row

**`src/components/admin/lifecycle/LifecyclePhaseTable.tsx`** (~100 lines)
- Table with 10 rows for one governance mode
- Columns: Phase #, Name, Required Role, Secondary Role, Phase Type, Auto-complete, Gate Flags, SLA Days, Actions
- Loading/empty/error states

**`src/pages/admin/seeker-config/LifecyclePhaseConfigPage.tsx`** (~70 lines)
- Page shell with tabs: QUICK | STRUCTURED | CONTROLLED
- Each tab renders `<LifecyclePhaseTable mode={selectedMode} />`
- Back button to governance rules

### Route + Sidebar:

**`src/App.tsx`** — Add lazy import and route:
```typescript
const LifecyclePhaseConfigPage = lazy(() => import("@/pages/admin/seeker-config/LifecyclePhaseConfigPage"));
// Route under admin shell:
<Route path="seeker-config/lifecycle-phases" element={
  <PermissionGuard permissionKey="seeker_config.edit"><LifecyclePhaseConfigPage /></PermissionGuard>
} />
```

**`src/components/admin/AdminSidebar.tsx`** — Add to `seekerConfigItems` array (after 'Tier Access'):
```typescript
{ title: 'Lifecycle Phases', icon: GitBranch, path: '/admin/seeker-config/lifecycle-phases' },
```
Import `GitBranch` from lucide-react.

---

## Files Changed Summary

| # | File | Change |
|---|------|--------|
| 1 | New migration | Table + 30 rows + 6 RPCs + pool constraint |
| 2 | `useSubmitSolutionRequest.ts` | CU auto-assign at phase >= 2, skip QUICK |
| 3 | `CurationQueuePage.tsx` | Filter phase 2, update badges/tooltips |
| 4 | `LcLegalWorkspacePage.tsx` | Remove CU auto-assign (curation before compliance) |
| 5 | `LegalDocumentAttachmentPage.tsx` | Same removal |
| 6 | `CurationActions.tsx` | Add LC+FC pool assign for CONTROLLED after curation |
| 7 | `useCompletePhase.ts` | Publication phase = 4 |
| 8 | `setup-test-scenario/index.ts` | Phase label fix |
| 9 | New: `useLifecyclePhaseConfig.ts` | Query + mutation hooks |
| 10 | New: `LifecyclePhaseRow.tsx` | Editable row component |
| 11 | New: `LifecyclePhaseTable.tsx` | Table per governance mode |
| 12 | New: `LifecyclePhaseConfigPage.tsx` | Admin page with tabs |
| 13 | `AdminSidebar.tsx` | Add sidebar entry |
| 14 | `App.tsx` | Add lazy import + route |

