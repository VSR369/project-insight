-- First, delete existing specialities (child of sub_domains)
DELETE FROM specialities 
WHERE sub_domain_id IN (
  SELECT sd.id FROM sub_domains sd
  JOIN proficiency_areas pa ON sd.proficiency_area_id = pa.id
);

-- Delete existing sub_domains (child of proficiency_areas)
DELETE FROM sub_domains 
WHERE proficiency_area_id IN (
  SELECT id FROM proficiency_areas
);

-- Delete existing proficiency areas
DELETE FROM proficiency_areas;

-- Insert 4 standardized proficiency areas for each industry segment
INSERT INTO proficiency_areas (industry_segment_id, name, description, display_order, is_active)
SELECT 
  seg.id,
  areas.name,
  areas.description,
  areas.display_order,
  true
FROM industry_segments seg
CROSS JOIN (
  VALUES 
    ('Future & Business Blueprint', 'Vision, mission, strategic goals, business model, strategy map, outcome/KPI architecture', 1),
    ('Product & Service Innovation', 'Product portfolio, service constructs, customer journeys, experience design, value proposition', 2),
    ('Business & Operational Excellence', 'Policies/SOPs, process design & improvement, workplace execution, operating model, roles & decision rights', 3),
    ('Digital & Technology Blueprint', 'Tech strategy, governance, enterprise architecture, applications/platforms, data/AI foundations, infrastructure & security', 4)
) AS areas(name, description, display_order)
WHERE seg.is_active = true;