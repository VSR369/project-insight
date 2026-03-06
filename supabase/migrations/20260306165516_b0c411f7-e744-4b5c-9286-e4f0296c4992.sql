
-- Seed md_mpa_config with MOD-02 assignment engine parameters
INSERT INTO public.md_mpa_config (param_key, param_value, description) VALUES
  ('sla_duration', '48', 'SLA duration in hours for verification processing'),
  ('queue_unclaimed_sla', '24', 'Hours before unclaimed queue entry escalates'),
  ('queue_escalation_repeat_interval', '4', 'Hours between repeated escalation alerts'),
  ('admin_release_window', '24', 'Hours before admin can release a verification'),
  ('tier1_threshold', '36', 'Hours until Tier 1 SLA warning'),
  ('tier2_threshold', '44', 'Hours until Tier 2 SLA breach'),
  ('tier3_threshold', '48', 'Hours until Tier 3 critical escalation'),
  ('max_reassignments', '3', 'Maximum times a verification can be reassigned'),
  ('partially_available_threshold', '75', 'Workload % threshold for partially available status')
ON CONFLICT DO NOTHING;
