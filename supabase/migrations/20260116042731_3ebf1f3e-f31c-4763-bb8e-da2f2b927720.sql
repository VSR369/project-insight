-- Step 1: Update provider's expertise level and lifecycle status
UPDATE public.solution_providers
SET expertise_level_id = '2046b071-dc36-4265-b40d-4f8d62cd408f',
    lifecycle_status = 'profile_building',
    lifecycle_rank = 40,
    updated_at = NOW()
WHERE id = 'b0a56517-cabf-4dbf-82ec-28f63b9c171b';

-- Step 2: Insert Example 1 - General Proof Point (Auto Components)
INSERT INTO public.proof_points (
  id,
  provider_id,
  category,
  type,
  title,
  description,
  created_by,
  is_deleted
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'general',
  'other',
  'Shopfloor Process Baseline for Machining + Assembly Lines (Auto Components)',
  'Conducted an AS-IS process baseline for a Tier-2 auto components plant covering CNC machining, deburring, inspection, and assembly. Documented line flow, handoffs, rework loops, and downtime reasons. Identified top loss areas impacting OEE (minor stoppages, inspection queue, material shortages) and proposed quick-win actions including SOP tightening, WIP control points, and shift-wise performance tracking. Enabled the plant to start daily review rhythm using 5–7 critical KPIs aligned to throughput and quality.',
  '32aec070-360a-4d73-a6dd-28961c629ca6',
  false
);

-- Step 3: Insert the supporting link
INSERT INTO public.proof_point_links (
  proof_point_id,
  url,
  title,
  display_order
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567801',
  'https://example.com/shopfloor-baseline-autocomp',
  'Shopfloor Baseline Report',
  0
);