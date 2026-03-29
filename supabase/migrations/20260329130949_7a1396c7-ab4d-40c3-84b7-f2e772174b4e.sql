-- Fix 2: Change SELF-CONTAINED severity from 'error' to 'warning' in deliverables quality_criteria
UPDATE ai_review_section_config
SET quality_criteria = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'name' = 'SELF-CONTAINED' 
      THEN jsonb_set(elem, '{severity}', '"warning"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(quality_criteria::jsonb) AS elem
)::json
WHERE section_key = 'deliverables' AND role_context = 'curation';

-- Fix 3: Add open innovation benchmarking web search query to deliverables
UPDATE ai_review_section_config
SET web_search_queries = (
  web_search_queries::jsonb || '[{"purpose": "Comparable challenge deliverables", "queryTemplate": "InnoCentive HeroX open innovation challenge deliverables {{domain}}", "when": "if_available"}]'::jsonb
)::json
WHERE section_key = 'deliverables' AND role_context = 'curation';

-- Fix 4: Update platform_preamble in all rows that contain the old truncated domain list
UPDATE ai_review_section_config
SET platform_preamble = regexp_replace(
  platform_preamble,
  'across: digital business models.*?and operating model transformation\.',
  'across 17 solution domains: (1) Digital Business Models, (2) Digital Strategy, (3) Enterprise Strategy Design, (4) Intelligent Process Design (SCM, Procurement, Finance, HR), (5) Process Excellence & Automation, (6) Technology Architecture, (7) Enterprise Architecture, (8) Data Strategy & Analytics, (9) AI/ML Solutions, (10) Agentic AI & GenAI Lifecycle Management, (11) Cybersecurity & Trust, (12) Cloud Modernization & Infrastructure, (13) Smart Workplaces & Digital Experience, (14) Operating Model Transformation, (15) Product & Service Innovation, (16) Platform Ecosystems & API Strategy, (17) Workforce Transformation & Change Management.'
)
WHERE platform_preamble LIKE '%across: digital business models%';