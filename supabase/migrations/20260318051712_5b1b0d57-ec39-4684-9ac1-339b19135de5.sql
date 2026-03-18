
-- Phase 4: SLA Automation Hardening
-- GAP-08: Add warning_sent_at to sla_timers for percentage-based alerts
-- GAP-14: Add phase_duration_days for linking SLA duration from phase_schedule

ALTER TABLE public.sla_timers
  ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS phase_duration_days INTEGER;

COMMENT ON COLUMN public.sla_timers.warning_sent_at IS 'Timestamp when 80% SLA warning was sent, prevents duplicate warnings';
COMMENT ON COLUMN public.sla_timers.phase_duration_days IS 'Duration in days sourced from phase_schedule JSON at timer creation';
