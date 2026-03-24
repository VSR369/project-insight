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

    // ── Step 2: Percentage-based SLA warnings (GAP-08) ───────
    // Find ACTIVE timers at >= 80% elapsed without a warning sent
    let warningCount = 0;
    try {
      const { data: activeTimers } = await supabaseAdmin
        .from("sla_timers")
        .select("timer_id, challenge_id, phase, role_code, started_at, deadline_at, warning_sent_at, phase_duration_days")
        .eq("status", "ACTIVE")
        .is("warning_sent_at", null);

      if (activeTimers?.length) {
        const now = Date.now();
        const warningUpdates: string[] = [];

        for (const timer of activeTimers) {
          const startMs = new Date(timer.started_at).getTime();
          const deadlineMs = new Date(timer.deadline_at).getTime();
          const totalDuration = deadlineMs - startMs;
          if (totalDuration <= 0) continue;

          const elapsed = now - startMs;
          const pctElapsed = elapsed / totalDuration;

          if (pctElapsed >= 0.8 && pctElapsed < 1.0) {
            warningUpdates.push(timer.timer_id);

            // Get role holders for this challenge to notify
            const { data: roleHolders } = await supabaseAdmin
              .from("user_challenge_roles")
              .select("user_id")
              .eq("challenge_id", timer.challenge_id)
              .eq("role_code", timer.role_code)
              .eq("is_active", true);

            if (roleHolders?.length) {
              const hoursRemaining = Math.round((deadlineMs - now) / 3600000);
              const notifications = roleHolders.map((r: { user_id: string }) => ({
                user_id: r.user_id,
                challenge_id: timer.challenge_id,
                notification_type: "SLA_WARNING_80PCT",
                title: "SLA Warning: 80% Elapsed",
                message: `Phase ${timer.phase} SLA is at 80% — approximately ${hoursRemaining}h remaining before breach.`,
              }));
              await supabaseAdmin.from("cogni_notifications").insert(notifications);
            }
          }
        }

        if (warningUpdates.length > 0) {
          // Batch update warning_sent_at
          for (const tid of warningUpdates) {
            await supabaseAdmin
              .from("sla_timers")
              .update({ warning_sent_at: new Date().toISOString() })
              .eq("timer_id", tid);
          }
          warningCount = warningUpdates.length;
          console.log(`SLA 80% warnings sent: ${warningCount}`);
        }
      }
    } catch (warnErr: any) {
      console.error("SLA warning processing failed:", warnErr.message);
    }

    // ── Step 3: Process SLA escalation tiers ─────────────────
    let escalatedCount = 0;
    let autoHeldCount = 0;

    try {
      const { data: escalationResult, error: escErr } = await supabaseAdmin.rpc(
        "process_sla_escalation"
      );

      if (escErr) {
        console.error("SLA escalation processing error:", escErr.message);
      } else if (escalationResult && escalationResult.length > 0) {
        escalatedCount = escalationResult[0]?.escalated_count ?? 0;
        autoHeldCount = escalationResult[0]?.auto_held_count ?? 0;
        console.log(
          `Escalation processed: ${escalatedCount} escalated, ${autoHeldCount} auto-held`
        );
      }
    } catch (escError: any) {
      console.error("Escalation processing failed:", escError.message);
    }

    // ── Step 4: Governance-aware auto-hold enforcement (GAP-07) ──
    // For QUICK governance, revert any auto-holds that were just set
    // (LIGHTWEIGHT = inform only, no auto-hold or auto-cancel)
    let quickRevertCount = 0;
    try {
      // Find challenges that are ON_HOLD with QUICK governance
      const { data: lwHeld } = await supabaseAdmin
        .from("challenges")
        .select("id")
        .eq("phase_status", "ON_HOLD")
        .eq("governance_profile", "QUICK")
        .eq("is_deleted", false);

      if (lwHeld?.length) {
        for (const ch of lwHeld) {
          // Revert from ON_HOLD back to the previous status (use ACTIVE as default)
          await supabaseAdmin
            .from("challenges")
            .update({ phase_status: "ACTIVE" })
            .eq("id", ch.id)
            .eq("governance_profile", "QUICK");

          // Un-pause any timers that were paused by auto-hold
          await supabaseAdmin
            .from("sla_timers")
            .update({ status: "ACTIVE" })
            .eq("challenge_id", ch.id)
            .eq("status", "PAUSED");

          quickRevertCount++;
        }
        if (quickRevertCount > 0) {
          console.log(`Reverted ${quickRevertCount} QUICK auto-holds (inform only)`);
        }
      }
    } catch (lwErr: any) {
      console.error("Quick governance revert failed:", lwErr.message);
    }

    // ── Step 5: Auto-cancel challenges on hold too long ──────
    // Only for ENTERPRISE governance (GAP-07: QUICK skips auto-cancel)
    let autoCancelCount = 0;

    const { data: onHoldChallenges, error: holdErr } = await supabaseAdmin
      .from("challenges")
      .select("id, title, current_phase, governance_profile")
      .eq("phase_status", "ON_HOLD")
      .eq("is_deleted", false);

    if (holdErr) {
      console.error("Error fetching ON_HOLD challenges:", holdErr.message);
    } else if (onHoldChallenges?.length) {
      for (const challenge of onHoldChallenges) {
        // GAP-07: Skip auto-cancel for QUICK governance
        if (challenge.governance_profile === "QUICK") {
          continue;
        }

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
          p_user_id: "00000000-0000-0000-0000-000000000000",
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

    // ── Step 6: Legal re-acceptance expiry suspension (GAP-16) ──
    // Scan for expired re-acceptance windows and suspend solver enrollments
    let reacceptSuspendCount = 0;
    try {
      const { data: expiredReaccept } = await supabaseAdmin
        .from("legal_reacceptance_records")
        .select("id, challenge_id, solver_id")
        .eq("status", "PENDING")
        .lt("deadline_at", new Date().toISOString());

      if (expiredReaccept?.length) {
        for (const record of expiredReaccept) {
          // Update re-acceptance record to expired
          await supabaseAdmin
            .from("legal_reacceptance_records")
            .update({ status: "EXPIRED" })
            .eq("id", record.id);

          // Suspend solver's enrollment for this challenge
          await supabaseAdmin
            .from("challenge_submissions")
            .update({ status: "SUSPENDED_PENDING_REACCEPTANCE" })
            .eq("challenge_id", record.challenge_id)
            .eq("user_id", record.solver_id)
            .neq("status", "TERMINAL");

          // Notify solver
          if (record.solver_id) {
            await supabaseAdmin.from("cogni_notifications").insert({
              user_id: record.solver_id,
              challenge_id: record.challenge_id,
              notification_type: "LEGAL_REACCEPT_EXPIRED",
              title: "Enrollment Suspended — Legal Re-acceptance Required",
              message: "Your enrollment has been suspended because the legal re-acceptance deadline has passed. Please contact the challenge team to resolve.",
            });
          }

          reacceptSuspendCount++;
        }
        if (reacceptSuspendCount > 0) {
          console.log(`Legal re-acceptance: ${reacceptSuspendCount} solver enrollments suspended`);
        }
      }
    } catch (reaccErr: any) {
      console.error("Legal re-acceptance suspension failed:", reaccErr.message);
    }

    console.log(`SLA check complete: ${breachCount} breaches, ${warningCount} warnings, ${escalatedCount} escalated, ${autoHeldCount} auto-held, ${quickRevertCount} quick-reverted, ${autoCancelCount} auto-cancelled, ${reacceptSuspendCount} reaccept-suspended`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          breaches_processed: breachCount,
          warnings_sent: warningCount,
          escalations_processed: escalatedCount,
          auto_held: autoHeldCount,
          quick_reverted: quickRevertCount,
          auto_cancelled: autoCancelCount,
          reaccept_suspended: reacceptSuspendCount,
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
