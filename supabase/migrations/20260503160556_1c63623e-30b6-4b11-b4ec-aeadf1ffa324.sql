UPDATE public.organization_types SET is_active = true,  updated_at = now() WHERE code = 'COLLEGE';
UPDATE public.organization_types SET is_active = false, updated_at = now() WHERE code = 'COL';