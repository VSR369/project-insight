

# Fix: Link "Strategy" Functional Area to a Department

## Problem

The Departments CRUD and Functional Areas linkage are fully implemented and working correctly. However, there is one data-level gap:

The "Strategy" (STRAT) functional area has a NULL `department_id`. Since the admin form now requires a department selection (mandatory validation), attempting to edit this record will fail because no department is pre-selected.

## Root Cause

The original migration seeded department linkages for 9 functional areas (TECH, OPS, FIN, MKT, HR, LEGAL, RND, SCM, SALES) but missed "Strategy" because there was no obvious 1:1 department match.

## Fix

A single data UPDATE to link the "Strategy" functional area to the "Executive / Leadership" department (code: EXEC) -- the most logical match since strategy is typically an executive function.

```sql
UPDATE md_functional_areas 
SET department_id = (SELECT id FROM md_departments WHERE code = 'EXEC')
WHERE code = 'STRAT' AND department_id IS NULL;
```

## Technical Details

- **Scope**: One SQL UPDATE statement (data fix, not schema change)
- **Risk**: Zero -- only fills a NULL value on one row
- **No code changes needed** -- all hooks, pages, sidebar, routing, and prefetch are already correctly wired
- **Validation**: After the fix, all 10 functional areas will have a non-null `department_id`, consistent with the mandatory form validation

## Verification After Fix

| Functional Area | Department |
|---|---|
| Technology (TECH) | Information Technology (IT) |
| Operations (OPS) | Operations (OPS) |
| Finance (FIN) | Finance and Accounting (FIN) |
| Marketing (MKT) | Marketing (MKT) |
| Human Resources (HR) | Human Resources (HR) |
| Legal (LEGAL) | Legal and Compliance (LEGAL) |
| Research and Development (RND) | Research and Development (RND) |
| Supply Chain (SCM) | Supply Chain and Logistics (SCM) |
| Sales (SALES) | Sales (SALES) |
| **Strategy (STRAT)** | **Executive / Leadership (EXEC)** -- this fix |

