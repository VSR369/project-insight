
# Comprehensive Regression Test Kit Implementation Plan

## Executive Summary
Create a centralized, exhaustive regression test suite under Platform Admin that consolidates all existing test runners and adds missing test coverage for all roles (Platform Admin, Solution Provider, Panel Reviewer), master data, and transactional data.

## Current State Analysis

| Test Runner | Location | Categories | Tests | Coverage |
|-------------|----------|------------|-------|----------|
| Smoke Test | `/admin/smoke-test` | 9 | ~57 | Master Data CRUD |
| Enrollment Lifecycle | `/tools/regression-test` | 22 | ~280 | Provider Enrollment |
| Pulse Social | `/admin/pulse-social-test` | 17 | ~100 | Social Features |
| **TOTAL EXISTING** | | **48** | **~437** | |

## What Will Be Built

### 1. New Admin Menu: "Regression Test Kit"
**Location**: Admin Dashboard Side Menu

```text
Admin Dashboard
├── Master Data (existing)
├── Question Bank (existing)
├── Invitations (existing)
├── Reviewer Approvals (existing)
├── ...
└── 🆕 Regression Test Kit  <-- NEW MENU ITEM
    ├── Run All Tests
    ├── By Role (Admin/Provider/Reviewer)
    ├── By Module
    └── Export Results
```

### 2. Consolidated Test Architecture

```text
src/services/regressionTestKit/
├── index.ts                    # Main orchestrator, exports all
├── types.ts                    # Shared types for all test runners
├── masterDataTests.ts          # Imported from smokeTestRunner
├── enrollmentTests.ts          # Imported from enrollmentTestRunner
├── pulseSocialTests.ts         # Imported from pulseSocialTestRunner
├── reviewerPortalTests.ts      # 🆕 NEW - Reviewer workflow tests
├── adminPortalTests.ts         # 🆕 NEW - Admin-specific tests
├── roleAccessTests.ts          # 🆕 NEW - RBAC/RLS tests
├── integrationTests.ts         # 🆕 NEW - Cross-portal tests
└── performanceTests.ts         # 🆕 NEW - Response time validation
```

### 3. New Test Categories to Add

#### A. Reviewer Portal Tests (RP-xxx) - ~35 tests
```text
RP-001: Reviewer application flow
RP-002: Pending approval state
RP-003: Approval email received
RP-004: Dashboard access after approval
RP-005: Candidate list query
RP-006: Candidate detail access
RP-007: Interview booking acceptance
RP-008: Interview decline flow
RP-009: Interview evaluation submission
RP-010: Expertise notes auto-save
RP-011: Clarification flag toggle
RP-012: Interview KIT questions loaded
RP-013: Interview score calculation
RP-014: Panel recommendation submission
RP-015: RLS - Cannot see other reviewer's candidates
RP-016: RLS - Cannot modify other's evaluations
RP-017: Availability slot creation
RP-018: Availability slot update
RP-019: Workload distribution query
RP-020: Interview history query
... (15 more tests)
```

#### B. Admin Portal Tests (AP-xxx) - ~40 tests
```text
AP-001: Admin dashboard loads
AP-002: Countries CRUD full cycle
AP-003: Industry Segments CRUD full cycle
AP-004: Expertise Levels read (constrained table)
AP-005: Academic Taxonomy hierarchy
AP-006: Proficiency Taxonomy hierarchy
AP-007: Question Bank import validation
AP-008: Question Bank bulk delete
AP-009: Capability Tags auto-provision
AP-010: Level-Speciality mapping
AP-011: Provider invitations send
AP-012: Reviewer invitations send
AP-013: Reviewer approval/rejection
AP-014: Interview requirements config
AP-015: Interview KIT questions management
AP-016: Composite slots generation
AP-017: RLS - Admin can read all providers
AP-018: RLS - Admin cannot bypass auth
AP-019: Audit fields populated on create
AP-020: Audit fields populated on update
... (20 more tests)
```

#### C. Role-Based Access Tests (RA-xxx) - ~50 tests
```text
RA-001: Unauthenticated → Login redirect
RA-002: Provider → Cannot access /admin
RA-003: Provider → Cannot access /reviewer
RA-004: Reviewer → Cannot access /admin
RA-005: Reviewer → Can access /reviewer/dashboard
RA-006: Admin → Can access all portals
RA-007: Admin → Role stored in user_roles table
RA-008: Provider → Role stored in user_roles table
RA-009: Reviewer → Role stored in user_roles table
RA-010: Multi-role user → Correct priority routing
RA-011: Session expiry → Redirect to login
RA-012: RLS - Provider can only see own data
RA-013: RLS - Provider cannot see other providers
RA-014: RLS - Reviewer can see assigned candidates only
RA-015: RLS - Admin read access to all tables
... (35 more tests)
```

#### D. Cross-Portal Integration Tests (CI-xxx) - ~30 tests
```text
CI-001: Provider enrollment → Reviewer sees candidate
CI-002: Reviewer accepts booking → Provider sees confirmation
CI-003: Interview completed → Lifecycle status updates
CI-004: Admin approves reviewer → Reviewer can login
CI-005: Manager approves org → Provider progresses
CI-006: Assessment passed → Interview slot available
CI-007: Certification granted → Pulse card created
CI-008: Provider publishes content → Feed visible to others
CI-009: Engagement → XP awarded correctly
CI-010: Gold given → Token balance decrements
... (20 more tests)
```

#### E. Data Integrity Tests (DI-xxx) - ~25 tests
```text
DI-001: Foreign key integrity - proof_points
DI-002: Foreign key integrity - enrollments
DI-003: Foreign key integrity - bookings
DI-004: Cascade delete - enrollment deletion
DI-005: Soft delete - proof_points.is_deleted
DI-006: Soft delete - questions.is_deleted
DI-007: Audit trail - created_by populated
DI-008: Audit trail - updated_by populated
DI-009: Unique constraints - enrollment per industry
DI-010: Check constraints - expertise level_number
... (15 more tests)
```

#### F. Edge Function Tests (EF-xxx) - ~20 tests
```text
EF-001: seed-provider-test-data deploys
EF-002: notify-enrollment-deleted deploys
EF-003: send-manager-approval-email deploys
EF-004: send-manager-reminder-email deploys
EF-005: notify-manager-approval-status deploys
EF-006: generate-interview-kit deploys
EF-007: RPC - bulk_insert_questions works
EF-008: RPC - update_enrollment_lifecycle works
EF-009: RPC - has_role works
EF-010: RPC - check_lifecycle_locks works
... (10 more tests)
```

### 4. Estimated Test Count

| Category | Tests |
|----------|-------|
| Existing: Master Data CRUD | 57 |
| Existing: Enrollment Lifecycle | 280 |
| Existing: Pulse Social | 100 |
| New: Reviewer Portal | 35 |
| New: Admin Portal | 40 |
| New: Role-Based Access | 50 |
| New: Cross-Portal Integration | 30 |
| New: Data Integrity | 25 |
| New: Edge Functions | 20 |
| **TOTAL** | **~637 tests** |

## Technical Implementation

### File Structure
```text
src/
├── pages/admin/
│   └── RegressionTestKitPage.tsx      # 🆕 Main UI page
├── services/
│   └── regressionTestKit/
│       ├── index.ts                    # Orchestrator
│       ├── types.ts                    # Shared types
│       ├── reviewerPortalTests.ts      # 🆕
│       ├── adminPortalTests.ts         # 🆕
│       ├── roleAccessTests.ts          # 🆕
│       ├── integrationTests.ts         # 🆕
│       ├── dataIntegrityTests.ts       # 🆕
│       └── edgeFunctionTests.ts        # 🆕
├── hooks/
│   └── useRegressionTestKit.ts         # 🆕 Runner hook
└── components/admin/
    └── RegressionTestKit/
        ├── TestSuiteSelector.tsx       # Category/role filter
        ├── TestResultsTable.tsx        # Results display
        ├── TestProgressCard.tsx        # Progress indicator
        └── TestExportButton.tsx        # JSON/CSV export
```

### UI Design

```text
┌─────────────────────────────────────────────────────────────┐
│  Regression Test Kit                                        │
│  Comprehensive baseline verification for all system features│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│  │ Total   │ │ Passed  │ │ Failed  │ │ Skipped │ │ Time   ││
│  │  637    │ │  0      │ │  0      │ │  0      │ │ --     ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘│
│                                                             │
│  [▶ Run All] [⏹ Stop] [↻ Reset] [📥 Export] [🔍 Filter]   │
│                                                             │
│  ════════════════════════════════════════════════════════  │
│  ███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  35%        │
│  Running: RA-015 - RLS Provider Data Isolation             │
│  ════════════════════════════════════════════════════════  │
│                                                             │
│  ┌─ By Role ──────────────────────────────────────────────┐│
│  │ ▼ Platform Admin (145 tests)        [▶] All Pass       ││
│  │ ▼ Solution Provider (340 tests)     [▶] 5 Failed       ││
│  │ ▼ Panel Reviewer (85 tests)         [▶] Running...     ││
│  │ ▼ Cross-Portal (67 tests)           [▶] Not Started    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Execution Log ────────────────────────────────────────┐│
│  │ [12:34:56] === Starting Regression Test Suite ===      ││
│  │ [12:34:57] ✓ RA-001 Unauthenticated redirect (12ms)   ││
│  │ [12:34:58] ✓ RA-002 Provider admin block (8ms)        ││
│  │ [12:34:59] ✗ RA-003 Reviewer admin block - RLS fail   ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Routing Addition

```typescript
// In App.tsx - Add new admin route
<Route
  path="/admin/regression-test-kit"
  element={
    <AdminGuard>
      <LazyRoute><RegressionTestKitPage /></LazyRoute>
    </AdminGuard>
  }
/>
```

### Admin Dashboard Update

```typescript
// In AdminDashboard.tsx - Add new section
{
  title: 'Regression Test Kit',
  description: 'Comprehensive system regression tests',
  icon: TestTube2,
  path: '/admin/regression-test-kit',
  color: 'text-emerald-500',
  hasBadge: false,
}
```

## Implementation Phases

### Phase 1: Infrastructure (Day 1)
- Create `src/services/regressionTestKit/` directory structure
- Create shared types and orchestrator
- Import existing test runners

### Phase 2: New Test Categories (Days 2-3)
- Implement Reviewer Portal Tests (RP-xxx)
- Implement Admin Portal Tests (AP-xxx)
- Implement Role-Based Access Tests (RA-xxx)

### Phase 3: Integration Tests (Day 4)
- Implement Cross-Portal Integration Tests (CI-xxx)
- Implement Data Integrity Tests (DI-xxx)
- Implement Edge Function Tests (EF-xxx)

### Phase 4: UI & Polish (Day 5)
- Create RegressionTestKitPage.tsx
- Add admin dashboard menu entry
- Implement filtering by role/module
- Add export functionality (JSON/CSV)

## Test Naming Convention

| Prefix | Category | Example |
|--------|----------|---------|
| SM- | Smoke/Master Data | SM-001 Countries Read |
| EN- | Enrollment | EN-001 Provider Record |
| PS- | Pulse Social | PS-001 Content Query |
| RP- | Reviewer Portal | RP-001 Application Flow |
| AP- | Admin Portal | AP-001 Dashboard Load |
| RA- | Role Access | RA-001 Auth Redirect |
| CI- | Cross-Integration | CI-001 Enrollment→Reviewer |
| DI- | Data Integrity | DI-001 FK proof_points |
| EF- | Edge Functions | EF-001 Seed Data Deploy |

## Export Format

```json
{
  "runId": "REG-2026-02-09-143022",
  "timestamp": "2026-02-09T14:30:22.000Z",
  "environment": "preview",
  "summary": {
    "total": 637,
    "passed": 620,
    "failed": 12,
    "skipped": 5,
    "duration": "4m 32s"
  },
  "byRole": {
    "admin": { "passed": 140, "failed": 5, "skipped": 0 },
    "provider": { "passed": 335, "failed": 5, "skipped": 0 },
    "reviewer": { "passed": 80, "failed": 2, "skipped": 3 },
    "integration": { "passed": 65, "failed": 0, "skipped": 2 }
  },
  "failures": [
    {
      "id": "RA-003",
      "name": "Reviewer cannot access admin",
      "error": "RLS policy missing",
      "duration": 45
    }
  ]
}
```

## Baseline Tracking

The test results will serve as a baseline. Any future changes that cause previously passing tests to fail will be immediately visible, enabling:

1. **Regression Detection**: Breaking changes caught before deployment
2. **Release Confidence**: Known-good state documented
3. **Audit Trail**: Historical test results for compliance
4. **Development Velocity**: Developers know exactly what broke

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/services/regressionTestKit/index.ts` | Create | Orchestrator |
| `src/services/regressionTestKit/types.ts` | Create | Shared types |
| `src/services/regressionTestKit/reviewerPortalTests.ts` | Create | RP-xxx tests |
| `src/services/regressionTestKit/adminPortalTests.ts` | Create | AP-xxx tests |
| `src/services/regressionTestKit/roleAccessTests.ts` | Create | RA-xxx tests |
| `src/services/regressionTestKit/integrationTests.ts` | Create | CI-xxx tests |
| `src/services/regressionTestKit/dataIntegrityTests.ts` | Create | DI-xxx tests |
| `src/services/regressionTestKit/edgeFunctionTests.ts` | Create | EF-xxx tests |
| `src/hooks/useRegressionTestKit.ts` | Create | Runner hook |
| `src/pages/admin/RegressionTestKitPage.tsx` | Create | Main UI |
| `src/pages/admin/AdminDashboard.tsx` | Modify | Add menu entry |
| `src/App.tsx` | Modify | Add route |
