-- Increase the name column length to accommodate longer names
ALTER TABLE expertise_levels ALTER COLUMN name TYPE character varying(200);

-- Delete all existing expertise levels
DELETE FROM expertise_levels;

-- Insert new expertise levels with the provided information
INSERT INTO expertise_levels (level_number, name, min_years, max_years, description, is_active)
VALUES 
  (1, 'Associate Consultant – Emerging Problem Solver', 1, 5, E'Hands-on contributor who solves well-defined problems using structured analysis and templates.\nDelivers accurate outputs on time, documents clearly, and follows platform standards.\nWorks within given scope and escalates ambiguity, risks, or missing information.', true),
  (2, 'Senior Consultant – Domain Specialist & Workstream Lead', 6, 10, E'Owns a domain workstream end-to-end and drives delivery with strong subject expertise.\nTranslates challenges into actionable tasks, coordinates contributors, and ensures quality.\nMakes scoped decisions, flags risks early, and aligns outcomes with seeker expectations.', true),
  (3, 'Principal Consultant – Cross-Domain Solution Designer', 11, 15, E'Designs integrated solutions across multiple domains, balancing business, process, and tech.\nConnects specialists'' inputs into one coherent approach and defines key trade-offs.\nGuides complex decisions in ambiguity and ensures feasibility, value, and alignment.', true),
  (4, 'Partner – Strategic Co-Creators & Ecosystem Shaper', 15, NULL, E'Strategic leader who co-creates direction with seekers and shapes high-impact outcomes.\nBuilds ecosystems, playbooks, and standards that scale beyond individual engagements.\nProvides governance-level guidance, risk oversight, and long-term value creation.', true);