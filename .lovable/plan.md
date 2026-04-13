

# Plan: Rename Level 0 to "Learner"

## Summary
The Level 0 expertise level is currently named "Aspiring Industry Problem Solver" in the database. It needs to be renamed to "Learner". No code files contain this name — it's purely a database record update.

## What Changes

### 1. Update database record
Update the `expertise_levels` table row where `level_number = 0` to set `name = 'Learner'`.

The description can optionally be simplified too (currently references "Learner-level participant"). No code changes are needed since all components fetch the name dynamically from the database.

## What Stays the Same
- All code references use `level_number` (not the name string), so no component/hook/service changes are required
- The `ExpertiseSelection.tsx` filter logic (`level_number !== 0`) is unaffected
- The `ExpertiseLevelCards.tsx`, `ExpertiseLevelsPage.tsx`, and query hooks all read names from DB dynamically

## Technical Detail
Single SQL update via the insert tool:
```sql
UPDATE expertise_levels 
SET name = 'Learner' 
WHERE level_number = 0;
```

