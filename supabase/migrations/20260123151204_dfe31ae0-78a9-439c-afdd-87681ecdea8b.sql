-- =====================================================
-- Add Missing Capability Tags for Question Bank Import
-- These tags are used in the Manufacturing (Auto Components) question Excel
-- =====================================================

INSERT INTO capability_tags (name, description, display_order, is_active)
VALUES 
  ('strategic_thinking', 'Strategic planning, long-term vision, and big-picture decision making', 11, true),
  ('operational_execution', 'Day-to-day operational delivery and execution excellence', 12, true),
  ('continuous_improvement', 'Kaizen mindset, process optimization, and iterative enhancement', 13, true),
  ('decision_intelligence', 'Data-driven decision making and analytical judgment', 14, true),
  ('risk_governance', 'Risk assessment, mitigation strategies, and governance frameworks', 15, true)
ON CONFLICT (name) DO NOTHING;