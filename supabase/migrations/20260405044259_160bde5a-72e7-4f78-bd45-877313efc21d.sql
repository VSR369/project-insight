UPDATE md_governance_mode_config
SET dual_curation_enabled = false
WHERE governance_mode = 'CONTROLLED';