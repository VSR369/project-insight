-- Part 1: Zero out Aggregator base fees (consulting_base_fee) across all countries
-- Business rule: Aggregator model has NO per-challenge base fees, only Platform Usage Fee %
UPDATE public.md_challenge_base_fees
SET consulting_base_fee = 0,
    management_base_fee = 0,
    updated_at = NOW()
WHERE engagement_model_id = '4321dce0-672d-4ae8-aca6-e3c7647ca185';