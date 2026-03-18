import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service_role to bypass RLS for cron-triggered calls
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ── Step 1: Process standard SLA breaches ────────────────
    const { data, error } = await supabaseAdmin.rpc("process_sla_breaches");

    if (error) {
      console.error("SLA breach processing error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "PROCESSING_ERROR", message: error.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const breachCount = data ?? 0;

    // ── Step 2: Auto-cancel challenges on hold too long ──────
    // Find challenges that are ON_HOLD where the hold duration
    // exceeds max_hold_days on their paused SLA timers.
    let autoCancelCount = 0;

    const { data: onHoldChallenges, error: holdErr } = await supabaseAdmin
      .from("challenges")
      .select("id, title, current_phase")
      .eq("phase_status", "ON_HOLD")
      .eq("is_deleted", false);

    if (holdErr) {
      console.error("Error fetching ON_HOLD challenges:", holdErr.message);
    } else if (onHoldChallenges?.length) {
      for (const challenge of onHoldChallenges) {
        // Check if any paused timer has exceeded max_hold_days
        const { data: expiredTimers } = await supabaseAdmin
          .from("sla_timers")
          .select("timer_id, max_hold_days, started_at")
          .eq("challenge_id", challenge.id)
          .eq("status", "PAUSED")
          .limit(1);

        if (!expiredTimers?.length) continue;

        const timer = expiredTimers[0];
        const maxDays = timer.max_hold_days ?? 30;
        const pausedSince = new Date(timer.started_at);
        const now = new Date();
        const daysPaused = (now.getTime() - pausedSince.getTime()) / (1000 * 60 * 60 * 24);

        if (daysPaused < maxDays) continue;

        // Auto-cancel: set phase_status = TERMINAL
        const { error: cancelErr } = await supabaseAdmin
          .from("challenges")
          .update({ phase_status: "TERMINAL" })
          .eq("id", challenge.id);

        if (cancelErr) {
          console.error(`Auto-cancel failed for ${challenge.id}:`, cancelErr.message);
          continue;
        }

        // Complete all active/paused SLA timers
        await supabaseAdmin
          .from("sla_timers")
          .update({ status: "COMPLETED", completed_at: now.toISOString() })
          .eq("challenge_id", challenge.id)
          .in("status", ["ACTIVE", "PAUSED"]);

        // Log audit
        await supabaseAdmin.rpc("log_audit", {
          p_user_id: "00000000-0000-0000-0000-000000000000", // system user
          p_challenge_id: challenge.id,
          p_solution_id: "",
          p_action: "CHALLENGE_AUTO_CANCELLED",
          p_method: "SYSTEM",
          p_phase_from: challenge.current_phase ?? 0,
          p_phase_to: challenge.current_phase ?? 0,
          p_details: {
            reason: `Auto-cancelled: On Hold exceeded maximum duration of ${maxDays} days.`,
            days_on_hold: Math.floor(daysPaused),
            max_hold_days: maxDays,
          },
        });

        // Notify all role holders
        const { data: roleHolders } = await supabaseAdmin
          .from("user_challenge_roles")
          .select("user_id")
          .eq("challenge_id", challenge.id)
          .eq("is_active", true);

        if (roleHolders?.length) {
          const uniqueUserIds = [...new Set(roleHolders.map((r: any) => r.user_id))];
          const notifications = uniqueUserIds.map((userId: string) => ({
            user_id: userId,
            challenge_id: challenge.id,
            notification_type: "CHALLENGE_AUTO_CANCELLED",
            title: "Challenge Auto-Cancelled",
            message: `Challenge "${challenge.title}" has been auto-cancelled after being on hold for ${Math.floor(daysPaused)} days (maximum: ${maxDays} days).`,
          }));
          await supabaseAdmin.from("cogni_notifications").insert(notifications);
        }

        autoCancelCount++;
        console.log(`Auto-cancelled challenge ${challenge.id} after ${Math.floor(daysPaused)} days on hold`);
      }
    }

    console.log(`SLA breach check complete: ${breachCount} breaches processed, ${autoCancelCount} auto-cancelled`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          breaches_processed: breachCount,
          auto_cancelled: autoCancelCount,
          checked_at: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
