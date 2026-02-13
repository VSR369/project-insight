UPDATE md_functional_areas 
SET department_id = (SELECT id FROM md_departments WHERE code = 'EXEC')
WHERE code = 'STRAT' AND department_id IS NULL;