/**
 * enforce-lc-timeout — Hourly cron job.
 *
 * Finds CONTROLLED-mode challenges in Phase 3 where the LC has not
 * completed legal review within the configured timeout window, and
 * sends a one-time escalation notification to the Curator + LC.
 *
 * Idempotency: skips any challenge that already has a
 * `LC_REVIEW_TIMEOUT_REACHED` row in `challenge_status_history`.
 *
 * Auth: invoked by pg_cron with the project anon key. Uses service
 * role inside the function for cross-row reads/writes.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TIMEOUT_DAYS = 7;

interface ChallengeRow {
  id: string;
  organization_id: string | null;
  governance_mode_override: string | null;
  governance_profile: string | null;
  updated_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "MISSING_ENV", message: "Server configuration missing" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Step 1: load global default timeout from md_governance_mode_config (CONTROLLED).
    const { data: cfgRow } = await supabase
      .from("md_governance_mode_config")
      .select("lc_review_timeout_days")
      .eq("governance_mode", "CONTROLLED")
      .eq("is_active", true)
      .maybeSingle();
    const globalDefault = (cfgRow?.lc_review_timeout_days as number | undefined) ?? DEFAULT_TIMEOUT_DAYS;

    // Step 2: candidate challenges — Phase 3, LC review pending, CONTROLLED.
    const { data: candidates, error: candErr } = await supabase
      .from("challenges")
      .select("id, organization_id, governance_mode_override, governance_profile, updated_at")
      .eq("current_phase", 3)
      .eq("phase_status", "ACTIVE")
      .eq("lc_review_required", true)
      .eq("lc_compliance_complete", false);
    if (candErr) throw candErr;

    const rows = (candidates ?? []) as ChallengeRow[];
    const now = Date.now();
    let processed = 0;
    let notified = 0;

    for (const ch of rows) {
      const mode = (ch.governance_mode_override ?? ch.governance_profile ?? "").toUpperCase();
      if (mode !== "CONTROLLED") continue;
      processed++;

      // Step 3: per-org override takes priority.
      let timeoutDays = globalDefault;
      if (ch.organization_id) {
        const { data: orgRow } = await supabase
          .from("seeker_organizations")
          .select("lc_review_timeout_days_override")
          .eq("id", ch.organization_id)
          .maybeSingle();
        const override = (orgRow as { lc_review_timeout_days_override: number | null } | null)?.lc_review_timeout_days_override;
        if (override && override > 0) timeoutDays = override;
      }

      // Step 4: window reached?
      const startedMs = new Date(ch.updated_at).getTime();
      const deadlineMs = startedMs + timeoutDays * 24 * 60 * 60 * 1000;
      if (now < deadlineMs) continue;

      // Step 5: idempotency — skip if already notified.
      const { data: prior } = await supabase
        .from("challenge_status_history")
        .select("id")
        .eq("challenge_id", ch.id)
        .eq("trigger_event", "LC_REVIEW_TIMEOUT_REACHED")
        .limit(1)
        .maybeSingle();
      if (prior) continue;

      // Step 6: resolve recipients (Curator + LC).
      const { data: roles } = await supabase
        .from("user_challenge_roles")
        .select("user_id, role_code")
        .eq("challenge_id", ch.id)
        .eq("is_active", true)
        .in("role_code", ["CU", "LC"]);

      const cuIds = new Set<string>();
      const lcIds = new Set<string>();
      for (const r of (roles ?? []) as Array<{ user_id: string; role_code: string }>) {
        if (r.role_code === "CU") cuIds.add(r.user_id);
        else if (r.role_code === "LC") lcIds.add(r.user_id);
      }

      // Step 7: insert notifications (one per recipient).
      const notifications: Array<Record<string, unknown>> = [];
      for (const uid of cuIds) {
        notifications.push({
          user_id: uid,
          challenge_id: ch.id,
          notification_type: "lc_review_timeout",
          title: "Legal review timeout reached",
          message: `The Legal Coordinator has not completed review within the ${timeoutDays}-day window. Consider escalation.`,
        });
      }
      for (const uid of lcIds) {
        notifications.push({
          user_id: uid,
          challenge_id: ch.id,
          notification_type: "lc_review_timeout",
          title: "Your legal review is overdue",
          message: `The ${timeoutDays}-day review window has elapsed. Please complete or transfer this review.`,
        });
      }
      if (notifications.length > 0) {
        await supabase.from("cogni_notifications").insert(notifications);
        notified++;
      }

      // Step 8: log status history (informational; no status change).
      await supabase.from("challenge_status_history").insert({
        challenge_id: ch.id,
        from_status: null,
        to_status: "LC_REVIEW_TIMEOUT_REACHED",
        from_phase: 3,
        to_phase: 3,
        changed_by: null,
        role: "SYSTEM",
        trigger_event: "LC_REVIEW_TIMEOUT_REACHED",
        notes: `LC review window of ${timeoutDays} day(s) elapsed.`,
        metadata: { timeout_days: timeoutDays, recipients: notifications.length },
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: { candidates: rows.length, processed, notified } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "ENFORCE_LC_TIMEOUT_FAILED", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
