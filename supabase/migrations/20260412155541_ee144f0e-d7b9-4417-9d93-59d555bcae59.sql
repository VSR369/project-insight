UPDATE public.md_lifecycle_phase_config
SET phase_description = REPLACE(phase_description, 'Solvers submit', 'Solution Providers submit')
WHERE phase_description LIKE '%Solvers submit%';

UPDATE public.md_lifecycle_phase_config
SET phase_description = REPLACE(phase_description, 'Shortlisted solvers', 'Shortlisted Solution Providers')
WHERE phase_description LIKE '%Shortlisted solvers%';