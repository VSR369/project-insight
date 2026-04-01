-- Add discovery_directives column
ALTER TABLE public.ai_review_section_config
  ADD COLUMN IF NOT EXISTS discovery_directives JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ai_review_section_config.discovery_directives IS
  'Per-section discovery config: { skip_discovery, priority, max_resources, discovery_context, resource_types[{ type, description, search_queries[], preferred_sources[], avoid_sources[] }] }';

-- ==============================================
-- Seed HIGH priority sections (max_resources 2-3)
-- ==============================================

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 3,
  "discovery_context": "Core problem definition requiring industry context, benchmarks, and regulatory landscape",
  "resource_types": [
    {
      "type": "industry_report",
      "description": "Industry analysis covering market trends and adoption rates",
      "search_queries": ["{{industry}} {{domain}} market trends 2024 2025", "{{domain}} adoption rates {{geography}} industry report"],
      "preferred_sources": ["mckinsey.com", "gartner.com", "forrester.com", "deloitte.com"],
      "avoid_sources": ["medium.com", "quora.com"]
    },
    {
      "type": "benchmark_data",
      "description": "KPIs and performance benchmarks for similar initiatives",
      "search_queries": ["{{domain}} KPI benchmarks {{industry}}", "{{domain}} ROI statistics {{maturityLevel}}"],
      "preferred_sources": ["statista.com", "gartner.com", "idc.com"],
      "avoid_sources": []
    },
    {
      "type": "regulatory",
      "description": "Regulatory requirements and compliance frameworks",
      "search_queries": ["{{domain}} regulations {{geography}} 2024", "{{industry}} compliance requirements {{geography}}"],
      "preferred_sources": ["gov.in", "europa.eu", "sec.gov"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'problem_statement';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 3,
  "discovery_context": "Expected outcomes need quantifiable benchmarks and industry-standard KPIs",
  "resource_types": [
    {
      "type": "benchmark_data",
      "description": "Industry benchmarks for expected outcomes and ROI",
      "search_queries": ["{{domain}} expected outcomes benchmarks {{industry}}", "{{domain}} ROI metrics {{maturityLevel}}"],
      "preferred_sources": ["gartner.com", "mckinsey.com", "hbr.org"],
      "avoid_sources": []
    },
    {
      "type": "case_study",
      "description": "Case studies of similar initiatives with measurable outcomes",
      "search_queries": ["{{domain}} case study results {{industry}}", "{{domain}} implementation outcomes {{geography}}"],
      "preferred_sources": ["hbr.org", "mckinsey.com", "accenture.com"],
      "avoid_sources": ["medium.com"]
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'expected_outcomes';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 3,
  "discovery_context": "Background context requiring organizational and industry landscape intelligence",
  "resource_types": [
    {
      "type": "industry_report",
      "description": "Industry landscape and competitive analysis",
      "search_queries": ["{{industry}} market landscape {{geography}} 2024", "{{orgName}} industry analysis"],
      "preferred_sources": ["mckinsey.com", "gartner.com", "ibisworld.com"],
      "avoid_sources": []
    },
    {
      "type": "market_data",
      "description": "Market size, growth rates, and competitive landscape data",
      "search_queries": ["{{industry}} market size {{geography}}", "{{domain}} market growth forecast"],
      "preferred_sources": ["statista.com", "grandviewresearch.com"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'context_and_background';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 2,
  "discovery_context": "Deliverables need industry-standard templates and best practice frameworks",
  "resource_types": [
    {
      "type": "framework_guide",
      "description": "Best practice frameworks for deliverable specification",
      "search_queries": ["{{domain}} deliverables framework {{industry}}", "{{domain}} project deliverables best practices"],
      "preferred_sources": ["pmi.org", "iso.org", "nist.gov"],
      "avoid_sources": []
    },
    {
      "type": "template_example",
      "description": "Deliverable templates from similar domain projects",
      "search_queries": ["{{domain}} deliverable template {{maturityLevel}}", "{{solution_type}} deliverables checklist"],
      "preferred_sources": [],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'deliverables';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 3,
  "discovery_context": "Success metrics need quantifiable KPIs grounded in industry benchmarks",
  "resource_types": [
    {
      "type": "benchmark_data",
      "description": "Industry-standard KPIs and performance metrics",
      "search_queries": ["{{domain}} KPI metrics {{industry}}", "{{domain}} success metrics benchmarks"],
      "preferred_sources": ["gartner.com", "kpiinstitute.org"],
      "avoid_sources": []
    },
    {
      "type": "industry_report",
      "description": "Reports with quantified outcomes for similar initiatives",
      "search_queries": ["{{domain}} performance metrics report {{geography}}", "{{industry}} KPI standards"],
      "preferred_sources": ["mckinsey.com", "deloitte.com"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'success_metrics_kpis';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 2,
  "discovery_context": "Evaluation criteria need objective scoring frameworks and industry standards",
  "resource_types": [
    {
      "type": "framework_guide",
      "description": "Evaluation frameworks and scoring methodologies",
      "search_queries": ["{{domain}} evaluation criteria framework", "{{solution_type}} assessment methodology"],
      "preferred_sources": ["iso.org", "nist.gov", "pmi.org"],
      "avoid_sources": []
    },
    {
      "type": "benchmark_data",
      "description": "Scoring benchmarks for evaluation criteria",
      "search_queries": ["{{domain}} evaluation scoring benchmarks {{industry}}"],
      "preferred_sources": ["gartner.com"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'evaluation_criteria';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "high",
  "max_resources": 2,
  "discovery_context": "Reward structure needs market rate data and competitive prize benchmarks",
  "resource_types": [
    {
      "type": "market_data",
      "description": "Market rates for similar challenge prizes and consulting fees",
      "search_queries": ["innovation challenge prize amounts {{industry}}", "{{domain}} consulting rates {{geography}}"],
      "preferred_sources": ["innocentive.com", "kaggle.com", "herox.com"],
      "avoid_sources": []
    },
    {
      "type": "benchmark_data",
      "description": "Prize and reward benchmarks for open innovation",
      "search_queries": ["open innovation prize benchmarks", "{{solution_type}} challenge reward structure"],
      "preferred_sources": [],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'reward_structure';

-- ==============================================
-- Seed MEDIUM priority sections (max_resources 1-2)
-- ==============================================

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "medium",
  "max_resources": 2,
  "discovery_context": "Scope definition needs comparable project scoping references",
  "resource_types": [
    {
      "type": "case_study",
      "description": "Similar-scope projects and their boundaries",
      "search_queries": ["{{domain}} project scope {{industry}} {{maturityLevel}}", "{{solution_type}} scope definition examples"],
      "preferred_sources": ["hbr.org", "pmi.org"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'scope';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "medium",
  "max_resources": 2,
  "discovery_context": "Root cause analysis needs industry failure mode data and diagnostic frameworks",
  "resource_types": [
    {
      "type": "technical_standard",
      "description": "Root cause analysis methodologies and failure mode data",
      "search_queries": ["{{domain}} root cause analysis {{industry}}", "{{domain}} failure modes {{maturityLevel}}"],
      "preferred_sources": ["iso.org", "asq.org"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'root_causes';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "medium",
  "max_resources": 1,
  "discovery_context": "Stakeholder analysis needs industry organizational pattern references",
  "resource_types": [
    {
      "type": "framework_guide",
      "description": "Stakeholder mapping frameworks for similar domains",
      "search_queries": ["{{domain}} stakeholder analysis {{industry}}", "{{domain}} RACI matrix template"],
      "preferred_sources": ["pmi.org"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'affected_stakeholders';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "medium",
  "max_resources": 2,
  "discovery_context": "Data resources section needs reference datasets and API documentation",
  "resource_types": [
    {
      "type": "api_documentation",
      "description": "Relevant public APIs and data sources",
      "search_queries": ["{{domain}} public API {{industry}}", "{{domain}} open data {{geography}}"],
      "preferred_sources": ["data.gov", "kaggle.com"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'data_resources_provided';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "medium",
  "max_resources": 1,
  "discovery_context": "Solver expertise needs talent market intelligence",
  "resource_types": [
    {
      "type": "market_data",
      "description": "Talent availability and expertise landscape data",
      "search_queries": ["{{domain}} expertise talent market {{geography}}", "{{domain}} specialist availability {{industry}}"],
      "preferred_sources": ["linkedin.com", "glassdoor.com"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'solver_expertise';

-- ==============================================
-- Seed LOW priority sections (max_resources 0-1)
-- ==============================================

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 1,
  "discovery_context": "Current deficiencies need competitor and industry gap analysis",
  "resource_types": [
    {
      "type": "competitor_example",
      "description": "Competitor approaches and industry gap analyses",
      "search_queries": ["{{domain}} industry gaps {{geography}}", "{{domain}} current challenges {{industry}}"],
      "preferred_sources": [],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'current_deficiencies';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 1,
  "discovery_context": "Preferred approach needs technology landscape references",
  "resource_types": [
    {
      "type": "technical_standard",
      "description": "Technology standards and methodology references",
      "search_queries": ["{{domain}} technology approach {{maturityLevel}}", "{{domain}} methodology comparison"],
      "preferred_sources": ["ieee.org", "acm.org"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'preferred_approach';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 0,
  "discovery_context": "Excluded approaches — minimal external context needed",
  "resource_types": []
}'::jsonb WHERE role_context = 'curation' AND section_key = 'approaches_not_of_interest';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 1,
  "discovery_context": "Timeline needs project scheduling benchmarks",
  "resource_types": [
    {
      "type": "benchmark_data",
      "description": "Project timeline benchmarks for similar initiatives",
      "search_queries": ["{{domain}} project timeline {{maturityLevel}}", "{{solution_type}} implementation duration"],
      "preferred_sources": ["pmi.org"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'phase_schedule';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 1,
  "discovery_context": "Submission guidelines need template references",
  "resource_types": [
    {
      "type": "template_example",
      "description": "Submission template examples from similar challenges",
      "search_queries": ["innovation challenge submission template", "{{solution_type}} submission guidelines"],
      "preferred_sources": [],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'submission_guidelines';

UPDATE public.ai_review_section_config SET discovery_directives = '{
  "skip_discovery": false,
  "priority": "low",
  "max_resources": 1,
  "discovery_context": "IP model needs licensing framework references",
  "resource_types": [
    {
      "type": "regulatory",
      "description": "IP and licensing framework references",
      "search_queries": ["open innovation IP model {{geography}}", "{{domain}} licensing framework"],
      "preferred_sources": ["wipo.int"],
      "avoid_sources": []
    }
  ]
}'::jsonb WHERE role_context = 'curation' AND section_key = 'ip_model';

-- ==============================================
-- Seed SKIP sections (skip_discovery=true)
-- ==============================================

UPDATE public.ai_review_section_config SET discovery_directives = '{"skip_discovery": true, "priority": "skip", "max_resources": 0, "resource_types": []}'::jsonb
WHERE role_context = 'curation' AND section_key IN (
  'maturity_level', 'solution_type', 'complexity', 'eligibility',
  'hook', 'visibility', 'domain_tags', 'escrow_funding'
);