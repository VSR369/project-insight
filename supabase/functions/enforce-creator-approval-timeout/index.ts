/**
 * enforce-creator-approval-timeout — Hourly cron job.
 *
 * Finds challenges where the Creator has not approved within 7 days of
 * `creator_approval_requested_at`, flips status to `timeout_override`,
 * logs the transition, and notifies Curator + Creator.
 *
 * Idempotency: only `creator_approval_status='pending'` rows are
 * affected; the UPDATE flips them to `timeout_override` so they
 * cannot be picked up again.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIMEOUT_DAYS = 7;

interface ChallengeRow {
  id: string;
  creator_approval_requested_at: string;
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
  const cutoffIso = new Date(Date.now() - TIMEOUT_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Step 1: candidate challenges past the 7-day window.
    const { data: candidates, error: candErr } = await supabase
      .from("challenges")
      .select("id, creator_approval_requested_at")
      .eq("creator_approval_status", "pending")
      .not("creator_approval_requested_at", "is", null)
      .lt("creator_approval_requested_at", cutoffIso);
    if (candErr) throw candErr;

    const rows = (candidates ?? []) as ChallengeRow[];
    let overridden = 0;

    for (const ch of rows) {
      // Step 2: flip status atomically (only if still pending — guards against races).
      const { data: updated, error: updErr } = await supabase
        .from("challenges")
        .update({
          creator_approval_status: "timeout_override",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ch.id)
        .eq("creator_approval_status", "pending")
        .select("id")
        .maybeSingle();
      if (updErr || !updated) continue;
      overridden++;

      // Step 3: resolve recipients (Curator + Creator).
      const { data: roles } = await supabase
        .from("user_challenge_roles")
        .select("user_id, role_code")
        .eq("challenge_id", ch.id)
        .eq("is_active", true)
        .in("role_code", ["CU", "CR"]);

      const cuIds = new Set<string>();
      const crIds = new Set<string>();
      for (const r of (roles ?? []) as Array<{ user_id: string; role_code: string }>) {
        if (r.role_code === "CU") cuIds.add(r.user_id);
        else if (r.role_code === "CR") crIds.add(r.user_id);
      }

      // Step 4: insert notifications.
      const notifications: Array<Record<string, unknown>> = [];
      for (const uid of crIds) {
        notifications.push({
          user_id: uid,
          challenge_id: ch.id,
          notification_type: "creator_approval_timeout",
          title: "Approval window closing",
          message:
            "Your 7-day approval window has elapsed. The Curator may now publish without your explicit approval.",
        });
      }
      for (const uid of cuIds) {
        notifications.push({
          user_id: uid,
          challenge_id: ch.id,
          notification_type: "creator_approval_timeout",
          title: "Creator approval timeout",
          message:
            "The 7-day Creator approval window has elapsed. You may now publish via timeout override.",
        });
      }
      if (notifications.length > 0) {
        await supabase.from("cogni_notifications").insert(notifications);
      }

      // Step 5: log immutable status history.
      await supabase.from("challenge_status_history").insert({
        challenge_id: ch.id,
        from_status: "PENDING_CREATOR_APPROVAL",
        to_status: "CREATOR_APPROVAL_TIMEOUT_OVERRIDE",
        changed_by: null,
        role: "SYSTEM",
        trigger_event: "CR_APPROVAL_TIMEOUT_OVERRIDE",
        notes: `Creator did not approve within ${TIMEOUT_DAYS} days; auto-overridden.`,
        metadata: {
          timeout_days: TIMEOUT_DAYS,
          requested_at: ch.creator_approval_requested_at,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, data: { candidates: rows.length, overridden } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "ENFORCE_CR_TIMEOUT_FAILED", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
