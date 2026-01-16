-- Insert General Proof Point: Shopfloor Process Baseline
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
  gen_random_uuid(),
  'dff71e3b-e65e-434c-bb9b-0d42406bd846',
  'general',
  'case_study',
  'Shopfloor Process Baseline for Machining & Assembly Lines',
  'Conducted an AS-IS shopfloor process baseline for a Tier-2 auto components manufacturer covering CNC machining, inspection, and assembly operations. Mapped material flow, handoffs, rework loops, and downtime drivers impacting OEE. Identified high-impact improvement opportunities and supported plant leadership in prioritizing corrective actions for throughput and quality stability.',
  '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13',
  false
);