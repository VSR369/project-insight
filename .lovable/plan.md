
# Phase 2: Regression Test Kit UI & Navigation Implementation

## Overview
Complete the Regression Test Kit by building the UI page, runner hook, and integrating into admin navigation. This builds on the Phase 1 infrastructure (types, orchestrator, and ~200 tests already created).

## Current Status
| Component | Status |
|-----------|--------|
| `types.ts` | Done |
| `index.ts` (orchestrator) | Done |
| `adminPortalTests.ts` | Done (40 tests) |
| `roleAccessTests.ts` | Done (35 tests) |
| `reviewerPortalTests.ts` | Done (35 tests) |
| `dataIntegrityTests.ts` | Done (25 tests) |
| `integrationTests.ts` | Done (30 tests) |
| `edgeFunctionTests.ts` | Done (20 tests) |
| `useRegressionTestKit.ts` | **To Build** |
| `RegressionTestKitPage.tsx` | **To Build** |
| `App.tsx` route | **To Add** |
| `AdminDashboard.tsx` menu | **To Add** |

## Files to Create/Modify

### 1. Create: `src/hooks/useRegressionTestKit.ts`
Runner hook following the pattern from `useEnrollmentTestRunner.ts`:
- State management for running tests
- Progress tracking (current test, percentage, counts)
- Execution log with timestamps
- Filtering by role/module/category
- Abort/cancel support via `AbortController`
- Export to JSON/CSV functionality
- Integration with `runTests()` from orchestrator

### 2. Create: `src/pages/admin/RegressionTestKitPage.tsx`
Full-featured UI following `SmokeTestPage.tsx` patterns:
- **Summary Cards**: Total, Passed, Failed, Skipped, Duration
- **Controls**: Run All, Stop, Reset, Export, Filter buttons
- **Progress Bar**: Real-time progress with current test display
- **Filter Panel**: Filter by role/module with search
- **Category Accordion**: Expandable test categories with run buttons
- **Results Table**: Per-test results with status, duration, error
- **Execution Log**: Scrollable log panel with color-coded entries

### 3. Modify: `src/App.tsx`
Add lazy-loaded route:
```typescript
const RegressionTestKitPage = lazy(() => import("@/pages/admin/RegressionTestKitPage"));

// Route (around line 580)
<Route
  path="/admin/regression-test-kit"
  element={
    <AdminGuard>
      <LazyRoute><RegressionTestKitPage /></LazyRoute>
    </AdminGuard>
  }
/>
```

### 4. Modify: `src/pages/admin/AdminDashboard.tsx`
Add new menu entry with TestTube2 icon:
```typescript
{
  title: 'Regression Test Kit',
  description: 'Comprehensive system regression tests',
  icon: TestTube2,
  path: '/admin/regression-test-kit',
  color: 'text-emerald-500',
}
```

## UI Layout Design

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Regression Test Kit                        [AdminLayout with nav]  │
│  Comprehensive baseline verification for all system features        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ Total  │ │ Passed │ │ Failed │ │Skipped │ │Pending │ │Duration│ │
│  │  185   │ │   0    │ │   0    │ │   0    │ │  185   │ │  --    │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
│                                                                     │
│  [▶ Run All] [⏹ Stop] [↻ Reset] [📥 Export ▾] [🔍 Filter]          │
│                                                                     │
│  ════════════════════════════════════════════════════════════      │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45%              │
│  Running: AP-007 - Question Bank Import Validation                  │
│  ════════════════════════════════════════════════════════════      │
│                                                                     │
│  ┌─ Filter by Role ───────────────────────────────────────────────┐│
│  │ [x] Platform Admin (75)  [x] Provider (45)  [x] Reviewer (35)  ││
│  │ [x] Cross-Portal (20)    [x] System (10)                       ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Test Categories (6) ──────────────────────────────────────────┐│
│  │ ▼ Admin Portal (40 tests)                    [▶] Not Started   ││
│  │   ┌──────────────────────────────────────────────────────────┐ ││
│  │   │ ID       │ Name                │ Status │ Time │ Error   │ ││
│  │   │ AP-001   │ Dashboard Loads     │   ○    │  -   │         │ ││
│  │   │ AP-002   │ Countries CRUD      │   ○    │  -   │         │ ││
│  │   └──────────────────────────────────────────────────────────┘ ││
│  │ ▶ Role Access (35 tests)                     [▶] Not Started   ││
│  │ ▶ Reviewer Portal (35 tests)                 [▶] Not Started   ││
│  │ ▶ Data Integrity (25 tests)                  [▶] Not Started   ││
│  │ ▶ Integration (30 tests)                     [▶] Not Started   ││
│  │ ▶ Edge Functions (20 tests)                  [▶] Not Started   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─ Execution Log ────────────────────────────────────────────────┐│
│  │ [12:34:56] === Starting Regression Test Suite ===              ││
│  │ [12:34:57] Running: AP-001 - Admin Dashboard Loads             ││
│  │ [12:34:58] ✓ AP-001 passed (45ms)                              ││
│  │ [12:34:59] Running: AP-002 - Countries CRUD Cycle              ││
│  └────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Technical Implementation Details

### Hook State Interface
```typescript
interface RegressionTestKitState {
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
  duration: number;
  currentCategory: string | null;
  currentTest: string | null;
  results: TestCaseResult[];
  logs: TestLogEntry[];
  filters: Partial<TestFilters>;
}
```

### Export Formats
- **JSON**: Full report with `runId`, `timestamp`, `summary`, `byRole`, `byModule`, `results`, `failures`
- **CSV**: Flattened results table with columns: ID, Category, Name, Role, Module, Status, Duration, Error, Tested At

### Filter Implementation
- Checkbox groups for roles (5 options)
- Checkbox groups for modules (11 options)
- Search input for test ID/name matching
- Apply filters to `getAllTests()` via `filterTests()`

## Estimated Test Counts by Category

| Category | Tests | Description |
|----------|-------|-------------|
| Admin Portal (AP) | 40 | CRUD, taxonomy, questions, invitations |
| Role Access (RA) | 35 | RBAC, RLS, auth redirects, permissions |
| Reviewer Portal (RP) | 35 | Candidates, interviews, evaluations |
| Data Integrity (DI) | 25 | FKs, soft delete, audit fields |
| Integration (CI) | 30 | Cross-portal workflows |
| Edge Functions (EF) | 20 | RPC, edge function invocations |
| **Total** | **185** | New tests in regression kit |

## Implementation Order
1. Create `useRegressionTestKit.ts` hook
2. Create `RegressionTestKitPage.tsx` UI
3. Add lazy import and route to `App.tsx`
4. Add menu entry to `AdminDashboard.tsx`
5. Test end-to-end from admin dashboard

## Dependencies
- Uses existing `AdminLayout` component
- Uses UI components: Card, Button, Badge, Progress, Accordion, Table, Checkbox, ScrollArea
- Imports from `src/services/regressionTestKit/index.ts`
- Follows patterns from `SmokeTestPage.tsx` and `RegressionTestPage.tsx`
