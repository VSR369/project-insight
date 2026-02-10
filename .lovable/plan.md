
# Regression Test Kit: Complete Integration + Sidebar Navigation

## Problems Found

1. **Missing Sidebar Menu Entry**: "Regression Test Kit" exists on the AdminDashboard card grid but is NOT in `AdminSidebar.tsx` (the persistent left navigation). Users logged in as Platform Admin cannot navigate to it from the sidebar.

2. **~420 Existing Tests Not Integrated**: The orchestrator `index.ts` mentions importing from three existing test runners in comments only -- they were never actually wired in:
   - `smokeTestRunner.ts` (1,178 lines) -- ~45 Master Data CRUD tests with a DIFFERENT type system (`TestCase` with `operation`/`label` fields vs the kit's `TestCase` with `role`/`module`/`run`)
   - `enrollmentTestRunner.ts` (large file, ~300+ tests) -- LL, CR, ED, LR, EN, MI, PP, OA, AS, IS, AT, SR, MD, TS, EH, SS, LP, MA, IR, CE, RE, ME, ES prefixes
   - `pulseSocialTestRunner.ts` (~80+ tests) -- CC, EN, CM, FL, XP, LB, SR prefixes

3. **Target**: ~181 (current) + ~300 (enrollment) + ~80 (pulse) = **~560+ tests** once integrated. The smoke tests need adapter wrappers due to their different type system.

## Implementation Plan

### Step 1: Add Sidebar Menu Entry to `AdminSidebar.tsx`

Add "Regression Test Kit" to the `otherItems` array (or create a new "Quality Assurance" group) with the `TestTube2` icon, pointing to `/admin/regression-test-kit`.

**File**: `src/components/admin/AdminSidebar.tsx`
- Add `TestTube2` to lucide-react imports
- Add entry to `otherItems` array (before Settings):
```typescript
{ title: 'Regression Test Kit', icon: TestTube2, path: '/admin/regression-test-kit' },
```

### Step 2: Create Enrollment Test Adapter

The `enrollmentTestRunner.ts` uses a compatible `TestCase` type (has `id`, `category`, `name`, `run()` returning `TestResult`). It needs thin adapter wrappers to add the missing `role`, `module`, and `description` fields.

**New file**: `src/services/regressionTestKit/enrollmentTests.ts`
- Import all test arrays from `enrollmentTestRunner.ts`
- Wrap each into the regression kit `TestCase` format with appropriate `role`/`module` mapping:
  - LL (Lifecycle Locks) -- 12 tests, role: `solution_provider`, module: `enrollment`
  - CR (Cascade Reset) -- 4 tests, role: `solution_provider`, module: `enrollment`
  - ED (Deletion Rules) -- 5 tests, role: `solution_provider`, module: `enrollment`
  - LR (Lifecycle Ranks) -- 6+ tests, role: `system`, module: `enrollment`
  - EN (Enrollment Data) -- 5+ tests, role: `solution_provider`, module: `enrollment`
  - MI (Multi-Industry) -- tests, role: `solution_provider`, module: `enrollment`
  - PP (Proof Points) -- tests, role: `solution_provider`, module: `enrollment`
  - OA (Org Approval) -- tests, role: `platform_admin`, module: `enrollment`
  - AS (Assessment) -- tests, role: `solution_provider`, module: `assessment`
  - IS (Interview Scheduling) -- tests, role: `cross_portal`, module: `interview`
  - AT (Audit Trail) -- tests, role: `system`, module: `data_integrity`
  - SR (Security & RLS) -- tests, role: `system`, module: `role_access`
  - MD (Master Data) -- tests, role: `platform_admin`, module: `master_data`
  - TS (Terminal States) -- tests, role: `system`, module: `enrollment`
  - EH (Error Handling) -- tests, role: `system`, module: `enrollment`
  - SS (System Settings) -- tests, role: `platform_admin`, module: `admin_portal`
  - LP (Lifecycle Progression) -- tests, role: `solution_provider`, module: `enrollment`
  - MA (Manager Approval) -- tests, role: `platform_admin`, module: `enrollment`
  - IR (Interview Rescheduling) -- tests, role: `cross_portal`, module: `interview`
  - CE (Cross-Enrollment) -- tests, role: `solution_provider`, module: `enrollment`
  - RE (Reviewer Enrollment) -- tests, role: `panel_reviewer`, module: `reviewer_portal`
  - ME (Multi-Enrollment) -- tests, role: `solution_provider`, module: `enrollment`
  - ES (Enrollment-Scoped) -- tests, role: `solution_provider`, module: `enrollment`

### Step 3: Create Pulse Social Test Adapter

**New file**: `src/services/regressionTestKit/pulseSocialTests.ts`
- Import all test arrays from `pulseSocialTestRunner.ts`
- Wrap with `role`/`module` mappings:
  - CC (Content Creation) -- 10 tests, role: `solution_provider`, module: `pulse_social`
  - EN (Engagements) -- 10 tests, role: `solution_provider`, module: `pulse_social`
  - CM (Comments) -- 4 tests, role: `solution_provider`, module: `pulse_social`
  - FL (Connections) -- 4 tests, role: `solution_provider`, module: `pulse_social`
  - XP (Gamification) -- 8 tests, role: `system`, module: `pulse_social`
  - LB (Leaderboards) -- tests, role: `system`, module: `pulse_social`
  - SR (Security) -- 8 tests, role: `system`, module: `role_access`

### Step 4: Create Smoke Test Adapter

The `smokeTestRunner.ts` has a DIFFERENT type system (uses `operation`/`label` instead of `name`/`description`/`run`). Needs a conversion wrapper.

**New file**: `src/services/regressionTestKit/smokeTests.ts`
- Import `moduleTestConfigs` from `smokeTestRunner.ts`
- Create adapter functions that convert each module's CRUD operations into regression kit `TestCase` format
- Map all to role: `platform_admin`, module: `master_data`
- Generate IDs like `SM-001`, `SM-002`, etc.

### Step 5: Wire All Adapters into Orchestrator

**Modify**: `src/services/regressionTestKit/index.ts`
- Import the three new adapter files
- Add their tests/categories to `getAllTestCategories()`, `getAllTests()`, `getTotalTestCount()`, `getTestCountsByCategory()`
- Update category count map

### Expected Final Test Count

| Category | Source | Estimated Tests |
|----------|--------|-----------------|
| Admin Portal (AP) | regressionTestKit | 40 |
| Role Access (RA) | regressionTestKit | 35 |
| Reviewer Portal (RP) | regressionTestKit | 35 |
| Data Integrity (DI) | regressionTestKit | 25 |
| Integration (CI) | regressionTestKit | 30 |
| Edge Functions (EF) | regressionTestKit | 16 |
| Enrollment Lifecycle | enrollmentTestRunner adapter | ~300 |
| Pulse Social | pulseSocialTestRunner adapter | ~80 |
| Smoke/Master Data | smokeTestRunner adapter | ~45 |
| **Total** | | **~600+** |

### Files Changed Summary

| File | Action |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add menu entry |
| `src/services/regressionTestKit/enrollmentTests.ts` | Create (adapter) |
| `src/services/regressionTestKit/pulseSocialTests.ts` | Create (adapter) |
| `src/services/regressionTestKit/smokeTests.ts` | Create (adapter) |
| `src/services/regressionTestKit/index.ts` | Wire in 3 adapters |

### Technical Notes
- Adapter pattern preserves existing runners untouched (no breaking changes to Smoke Test page or Enrollment Test page)
- Type incompatibility in `smokeTestRunner.ts` handled via wrapper functions that call the existing CRUD functions and return the unified `TestResult` format
- Re-prefixing avoided where possible; original test IDs preserved with namespace prefix (e.g., enrollment `LL-001` stays as `LL-001`)
