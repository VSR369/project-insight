
-- ═══════════════════════════════════════════════════════════════
-- Add escalation columns to sla_timers
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.sla_timers
  ADD COLUMN IF NOT EXISTS escalation_tier INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_hold_on_breach BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

-- Index for escalation queries
CREATE INDEX IF NOT EXISTS idx_sla_timers_escalation
  ON public.sla_timers(status, escalation_tier)
  WHERE status = 'BREACHED';

-- ═══════════════════════════════════════════════════════════════
-- process_sla_escalation() — Tiered escalation for breached timers
--
-- Tier 0 → 1: Immediate on breach, notify assigned user
-- Tier 1 → 2: 2+ days breached, notify user + Org Admin
-- Tier 2 → 3: 5+ days breached, notify Platform Admin
-- Tier 3 + auto_hold: auto-hold the challenge
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.process_sla_escalation()
RETURNS TABLE(
  escalated_count INTEGER,
  auto_held_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escalated INTEGER := 0;
  v_auto_held INTEGER := 0;
  v_timer RECORD;
  v_days_breached NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Loop through all BREACHED timers that haven't completed escalation
  FOR v_timer IN
    SELECT
      t.timer_id,
      t.challenge_id,
      t.phase,
      t.role_code,
      t.escalation_tier,
      t.auto_hold_on_breach,
      t.breached_at,
      t.last_escalated_at
    FROM sla_timers t
    WHERE t.status = 'BREACHED'
      AND t.escalation_tier < 4
    ORDER BY t.breached_at ASC
  LOOP
    v_days_breached := EXTRACT(EPOCH FROM (v_now - v_timer.breached_at)) / 86400.0;

    -- ── Tier 0 → 1: Immediate on breach ─────────────────────
    IF v_timer.escalation_tier = 0 THEN
      UPDATE sla_timers
      SET escalation_tier = 1,
          last_escalated_at = v_now,
          updated_at = v_now
      WHERE timer_id = v_timer.timer_id;

      -- Notify assigned user via role_code
      PERFORM notify_escalation(
        v_timer.challenge_id,
        v_timer.phase,
        v_timer.role_code,
        1,
        'SLA_BREACH_TIER1',
        'SLA Breach — Action Required',
        format('SLA timer for phase %s (role %s) has been breached. Please take immediate action.',
               v_timer.phase, v_timer.role_code)
      );

      v_escalated := v_escalated + 1;

    -- ── Tier 1 → 2: 2+ days breached ────────────────────────
    ELSIF v_timer.escalation_tier = 1 AND v_days_breached >= 2 THEN
      UPDATE sla_timers
      SET escalation_tier = 2,
          last_escalated_at = v_now,
          updated_at = v_now
      WHERE timer_id = v_timer.timer_id;

      PERFORM notify_escalation(
        v_timer.challenge_id,
        v_timer.phase,
        v_timer.role_code,
        2,
        'SLA_BREACH_TIER2',
        'SLA Breach Escalated — Manager Notification',
        format('SLA breach for phase %s has been unresolved for %s days. Escalated to organization admin.',
               v_timer.phase, ROUND(v_days_breached, 1))
      );

      v_escalated := v_escalated + 1;

    -- ── Tier 2 → 3: 5+ days breached ────────────────────────
    ELSIF v_timer.escalation_tier = 2 AND v_days_breached >= 5 THEN
      UPDATE sla_timers
      SET escalation_tier = 3,
          last_escalated_at = v_now,
          updated_at = v_now
      WHERE timer_id = v_timer.timer_id;

      PERFORM notify_escalation(
        v_timer.challenge_id,
        v_timer.phase,
        v_timer.role_code,
        3,
        'SLA_BREACH_TIER3',
        'Critical SLA Breach — Platform Admin Notified',
        format('SLA breach for phase %s has been unresolved for %s days. Escalated to platform administration.',
               v_timer.phase, ROUND(v_days_breached, 1))
      );

      v_escalated := v_escalated + 1;

      -- ── Tier 3 + auto_hold: Put challenge on hold ──────────
      IF v_timer.auto_hold_on_breach THEN
        UPDATE challenges
        SET phase_status = 'ON_HOLD',
            updated_at = v_now
        WHERE id = v_timer.challenge_id
          AND phase_status != 'ON_HOLD';

        -- Notify all role holders
        PERFORM notify_escalation(
          v_timer.challenge_id,
          v_timer.phase,
          v_timer.role_code,
          3,
          'CHALLENGE_AUTO_HELD',
          'Challenge Auto-Paused',
          format('Challenge has been automatically paused due to unresolved SLA breach (%s days). Contact your administrator.',
                 ROUND(v_days_breached, 1))
        );

        -- Audit log
        INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
        VALUES (
          '00000000-0000-0000-0000-000000000000',
          v_timer.challenge_id,
          'CHALLENGE_AUTO_HELD',
          'SYSTEM',
          jsonb_build_object(
            'reason', 'SLA breach auto-hold',
            'days_breached', ROUND(v_days_breached, 1),
            'phase', v_timer.phase,
            'role_code', v_timer.role_code,
            'escalation_tier', 3
          )
        );

        v_auto_held := v_auto_held + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_escalated, v_auto_held;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- notify_escalation() — Helper to insert notifications for escalation tiers
--
-- Tier 1: assigned role users
-- Tier 2: assigned role users + Org Admins
-- Tier 3: assigned role users + Org Admins + Platform Admins
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_escalation(
  p_challenge_id UUID,
  p_phase INTEGER,
  p_role_code TEXT,
  p_tier INTEGER,
  p_notification_type TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids UUID[];
  v_org_id UUID;
  v_uid UUID;
BEGIN
  -- Always notify the assigned role users
  SELECT ARRAY_AGG(DISTINCT user_id)
  INTO v_user_ids
  FROM user_challenge_roles
  WHERE challenge_id = p_challenge_id
    AND role_code = p_role_code
    AND is_active = TRUE;

  -- Tier 2+: Also notify Org Admins
  IF p_tier >= 2 THEN
    SELECT organization_id INTO v_org_id
    FROM challenges
    WHERE id = p_challenge_id;

    IF v_org_id IS NOT NULL THEN
      SELECT ARRAY_AGG(DISTINCT user_id) || COALESCE(v_user_ids, ARRAY[]::UUID[])
      INTO v_user_ids
      FROM seeking_org_admins
      WHERE organization_id = v_org_id
        AND is_active = TRUE
        AND user_id IS NOT NULL;
    END IF;
  END IF;

  -- Tier 3: Also notify Platform Admins
  IF p_tier >= 3 THEN
    SELECT COALESCE(v_user_ids, ARRAY[]::UUID[]) || ARRAY_AGG(DISTINCT user_id)
    INTO v_user_ids
    FROM platform_admin_profiles
    WHERE is_active = TRUE
      AND user_id IS NOT NULL;
  END IF;

  -- Deduplicate and insert notifications
  IF v_user_ids IS NOT NULL THEN
    FOREACH v_uid IN ARRAY (SELECT ARRAY_AGG(DISTINCT u) FROM UNNEST(v_user_ids) u WHERE u IS NOT NULL)
    LOOP
      INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
      VALUES (v_uid, p_challenge_id, p_notification_type, p_title, p_message);
    END LOOP;
  END IF;
END;
$$;
