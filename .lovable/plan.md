

# Plan: Remove Academic Taxonomy — Frontend + Backend Code

## Scope
Remove **all** Academic Taxonomy frontend pages, hooks, CRUD logic, and test references. DB tables stay (no schema migrations needed) but existing data can be ignored — it's legacy.

## What Changes

### DELETE — 7 files
| File | Reason |
|---|---|
| `src/pages/admin/academic-taxonomy/AcademicTaxonomyPage.tsx` | Admin CRUD page |
| `src/pages/admin/academic-taxonomy/AcademicTreePreview.tsx` | Tree preview |
| `src/pages/admin/academic-taxonomy/AcademicImportDialog.tsx` | Import dialog |
| `src/pages/admin/academic-taxonomy/AcademicExcelExport.ts` | Export logic |
| `src/pages/admin/academic-taxonomy/types.ts` | Types |
| `src/pages/admin/academic-taxonomy/index.ts` | Barrel |
| `src/hooks/queries/useAcademicTaxonomy.ts` | CRUD hooks |

### EDIT — Admin UI (3 files)
| File | Change |
|---|---|
| `src/components/admin/AdminSidebar.tsx` | Remove `Academic Taxonomy` from `taxonomyItems` (line 100) |
| `src/components/admin/AdminHeader.tsx` | Remove `'academic-taxonomy'` breadcrumb (line 44) |
| `src/pages/admin/AdminDashboard.tsx` | Remove Academic Taxonomy card (lines 102-109) |

### EDIT — Routing & Prefetch (2 files)
| File | Change |
|---|---|
| `src/App.tsx` | Remove lazy import (line 119) and Route (line 584) |
| `src/lib/routePrefetch.ts` | Remove prefetch entry (line 20) |

### EDIT — Register.tsx (Student Form)
Remove the discipline/stream dropdowns entirely. The `onProviderSubmit` handler does NOT send `disciplineId` or `streamId` to the backend — they're purely UI fields that serve no purpose without the academic taxonomy. Changes:
- Remove `useAcademicDisciplines` and `useAcademicStreams` imports and calls (lines 17, 90, 93)
- Remove `selectedDiscipline` state (line 78)
- Remove `disciplineId`/`streamId` form fields from `renderStudentFields` (lines 543-602)
- Remove default values `disciplineId`/`streamId` from studentForm (lines 126-127)

### EDIT — Validation Schema (`src/lib/validations/auth.ts`)
Remove `disciplineId`, `streamId`, `subjectId` from `baseStudentSchema`. These fields aren't sent anywhere.

### EDIT — Master Data Hook (`src/hooks/queries/useMasterData.ts`)
Remove `useAcademicDisciplines`, `useAcademicStreams`, `useAcademicSubjects` functions (lines 47-100).

### EDIT — Tests (3 files)
| File | Change |
|---|---|
| `src/services/smokeTestRunner.ts` | Remove academic test functions (lines 601-724) and config entry (lines 1126-1139) |
| `src/services/regressionTestKit/performanceDiagnosticTests.ts` | Replace academic FK join tests (lines 98-108, 330-334) with proficiency taxonomy equivalents (`sub_domains` → `proficiency_areas`) |
| `src/services/enrollmentTestRunner.ts` | Remove SS-005 test (lines 2185-2198) |

## What is NOT Changed
- Database tables — kept as-is, data becomes legacy
- Supabase generated types — untouched
- All Proficiency Taxonomy features — fully intact
- All other master data hooks and pages — untouched

## Risk: Zero
- `disciplineId`/`streamId` are never sent to any API or edge function from the student form
- No other page imports from the academic taxonomy files
- DB tables remain so no FK or type errors

