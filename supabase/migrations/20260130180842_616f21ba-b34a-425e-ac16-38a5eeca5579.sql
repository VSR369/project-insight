-- Delete existing ad-hoc topics
DELETE FROM pulse_card_topics;

-- Insert new industry-linked topics
INSERT INTO pulse_card_topics (name, slug, description, icon, industry_segment_id, display_order, is_active) VALUES
  -- General (NULL industry - visible to all)
  ('General Knowledge', 'general-knowledge', 'Cross-industry insights: leadership, productivity, career growth', '🌍', NULL, 0, true),
  
  -- Technology (ffb4ba70-affe-4558-853d-3a1b27444210)
  ('Software Engineering', 'software-engineering', 'Coding patterns, architecture, and development best practices', '💻', 'ffb4ba70-affe-4558-853d-3a1b27444210', 1, true),
  ('AI & Automation', 'ai-automation', 'Artificial intelligence, machine learning, and process automation', '🤖', 'ffb4ba70-affe-4558-853d-3a1b27444210', 2, true),
  ('Cloud & DevOps', 'cloud-devops', 'Cloud platforms, CI/CD, infrastructure, and operations', '☁️', 'ffb4ba70-affe-4558-853d-3a1b27444210', 3, true),
  
  -- Technology - India IT Services (b1a248ce-15b9-4733-a035-a904a786fe30)
  ('IT Outsourcing', 'it-outsourcing', 'IT services delivery, offshore models, and client engagement', '🌐', 'b1a248ce-15b9-4733-a035-a904a786fe30', 1, true),
  ('Digital Transformation', 'digital-transformation', 'Enterprise modernization, legacy migration, and digital strategy', '🔄', 'b1a248ce-15b9-4733-a035-a904a786fe30', 2, true),
  ('Delivery Excellence', 'delivery-excellence', 'Project delivery, quality assurance, and process improvement', '🎯', 'b1a248ce-15b9-4733-a035-a904a786fe30', 3, true),
  
  -- Healthcare (41ee5438-f270-488c-aae1-b46c120bc276)
  ('Clinical Practice', 'clinical-practice', 'Patient care, diagnostics, and clinical decision-making', '🏥', '41ee5438-f270-488c-aae1-b46c120bc276', 1, true),
  ('Pharma & Life Sciences', 'pharma-life-sciences', 'Drug development, regulatory affairs, and pharmaceutical operations', '💊', '41ee5438-f270-488c-aae1-b46c120bc276', 2, true),
  ('Medical Research', 'medical-research', 'Clinical trials, research methodologies, and medical innovations', '🔬', '41ee5438-f270-488c-aae1-b46c120bc276', 3, true),
  
  -- Finance (853821a3-5c45-42cf-b035-3f8609e025dc)
  ('Investment & Markets', 'investment-markets', 'Capital markets, trading strategies, and investment analysis', '📈', '853821a3-5c45-42cf-b035-3f8609e025dc', 1, true),
  ('Banking Operations', 'banking-operations', 'Retail banking, corporate banking, and financial operations', '🏦', '853821a3-5c45-42cf-b035-3f8609e025dc', 2, true),
  ('Risk & Compliance', 'risk-compliance', 'Regulatory compliance, risk management, and financial controls', '📊', '853821a3-5c45-42cf-b035-3f8609e025dc', 3, true),
  
  -- Manufacturing - Auto Components (a333531e-8a60-4682-87df-a9fdc617a232)
  ('Production & Quality', 'production-quality', 'Manufacturing processes, quality control, and operational excellence', '⚙️', 'a333531e-8a60-4682-87df-a9fdc617a232', 1, true),
  ('Supply Chain', 'supply-chain', 'Logistics, inventory management, and supplier relationships', '🔧', 'a333531e-8a60-4682-87df-a9fdc617a232', 2, true),
  ('Lean Manufacturing', 'lean-manufacturing', 'Lean principles, Six Sigma, and continuous improvement', '🏭', 'a333531e-8a60-4682-87df-a9fdc617a232', 3, true),
  
  -- Retail (297e445b-4583-49b8-a0ec-d0916b50b977)
  ('E-commerce', 'ecommerce', 'Online retail, marketplace strategies, and digital commerce', '🛒', '297e445b-4583-49b8-a0ec-d0916b50b977', 1, true),
  ('Inventory Management', 'inventory-management', 'Stock control, demand planning, and warehousing', '📦', '297e445b-4583-49b8-a0ec-d0916b50b977', 2, true),
  ('Customer Experience', 'customer-experience', 'Retail CX, loyalty programs, and customer engagement', '🎯', '297e445b-4583-49b8-a0ec-d0916b50b977', 3, true),
  
  -- Education (07ec4ff5-4e92-45e4-b949-2f38683f537b)
  ('Pedagogy & Learning', 'pedagogy-learning', 'Teaching methodologies, learning science, and instructional design', '📚', '07ec4ff5-4e92-45e4-b949-2f38683f537b', 1, true),
  ('EdTech Innovation', 'edtech-innovation', 'Educational technology, e-learning platforms, and digital learning', '💡', '07ec4ff5-4e92-45e4-b949-2f38683f537b', 2, true),
  ('Curriculum Design', 'curriculum-design', 'Course development, assessment strategies, and learning outcomes', '🎓', '07ec4ff5-4e92-45e4-b949-2f38683f537b', 3, true),
  
  -- Consulting (357558fe-56d0-4bb7-a6f8-21d5ac109fc6)
  ('Strategy & Advisory', 'strategy-advisory', 'Strategic consulting, business advisory, and transformation', '📋', '357558fe-56d0-4bb7-a6f8-21d5ac109fc6', 1, true),
  ('Client Engagement', 'client-engagement', 'Client relationships, project management, and stakeholder management', '🤝', '357558fe-56d0-4bb7-a6f8-21d5ac109fc6', 2, true),
  ('Business Analysis', 'business-analysis', 'Requirements analysis, process mapping, and solution design', '📊', '357558fe-56d0-4bb7-a6f8-21d5ac109fc6', 3, true),
  
  -- Energy (70ef723b-381e-488e-9aa8-628af68dac10)
  ('Power Generation', 'power-generation', 'Electricity generation, grid management, and power systems', '⚡', '70ef723b-381e-488e-9aa8-628af68dac10', 1, true),
  ('Renewables & Sustainability', 'renewables-sustainability', 'Clean energy, environmental sustainability, and green technology', '🌱', '70ef723b-381e-488e-9aa8-628af68dac10', 2, true),
  ('Oil & Gas', 'oil-gas', 'Petroleum exploration, refining, and energy trading', '🛢️', '70ef723b-381e-488e-9aa8-628af68dac10', 3, true);