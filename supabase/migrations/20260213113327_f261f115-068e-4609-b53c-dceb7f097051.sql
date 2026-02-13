-- Soft-delete duplicate "VSR" organizations (keep oldest, remove 3 newer duplicates)
UPDATE public.seeker_organizations
SET is_deleted = true, deleted_at = NOW()
WHERE id IN (
  'aacfc012-5fe2-4462-9e43-030de5cdb44e',
  '9d3b681c-d723-4791-8f69-4111f9089157',
  '00799b8c-b6a4-4add-a3f3-a17e43b56b8a'
);

-- Add composite unique index: org name + country (case-insensitive, non-deleted only)
CREATE UNIQUE INDEX idx_seeker_orgs_unique_name_country
  ON public.seeker_organizations (LOWER(organization_name::text), hq_country_id)
  WHERE is_deleted = false;