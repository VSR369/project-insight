
-- Ensure every org with at least one industry has exactly one primary.
-- If an org has zero rows flagged is_primary, mark its earliest-created row as primary.
WITH orgs_missing_primary AS (
  SELECT organization_id
  FROM public.seeker_org_industries
  GROUP BY organization_id
  HAVING bool_or(is_primary) = FALSE
),
firsts AS (
  SELECT DISTINCT ON (soi.organization_id)
    soi.id, soi.organization_id
  FROM public.seeker_org_industries soi
  JOIN orgs_missing_primary o ON o.organization_id = soi.organization_id
  ORDER BY soi.organization_id, soi.created_at ASC, soi.id ASC
)
UPDATE public.seeker_org_industries
SET is_primary = TRUE
WHERE id IN (SELECT id FROM firsts);

-- Enforce: at most one primary industry per organization.
CREATE UNIQUE INDEX IF NOT EXISTS uq_seeker_org_industries_one_primary
  ON public.seeker_org_industries (organization_id)
  WHERE is_primary = TRUE;

-- Helpful lookup for the new "primary industry" reads.
CREATE INDEX IF NOT EXISTS idx_seeker_org_industries_primary
  ON public.seeker_org_industries (organization_id, is_primary)
  WHERE is_primary = TRUE;
