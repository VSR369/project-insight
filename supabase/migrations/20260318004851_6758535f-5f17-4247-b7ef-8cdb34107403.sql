ALTER TABLE public.sla_timers ADD COLUMN IF NOT EXISTS max_hold_days INTEGER NOT NULL DEFAULT 30;

COMMENT ON COLUMN public.sla_timers.max_hold_days IS 'Maximum number of days a challenge can remain ON_HOLD before auto-cancellation. Default: 30.';