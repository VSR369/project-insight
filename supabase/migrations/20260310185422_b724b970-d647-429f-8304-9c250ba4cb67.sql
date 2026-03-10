
ALTER TABLE platform_provider_pool
  DROP CONSTRAINT IF EXISTS platform_provider_pool_proficiency_id_fkey;

ALTER TABLE platform_provider_pool
  ADD CONSTRAINT platform_provider_pool_proficiency_area_fkey
  FOREIGN KEY (proficiency_id) REFERENCES proficiency_areas(id);
