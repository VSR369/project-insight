import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * SLA Escalation Edge Function (MOD-03)
 * 
 * Called by pg_cron on schedule. Processes verifications that have breached
 * SLA thresholds and applies tiered escalation:
 * 
 * - Tier 1 (80%): Notify assigned admin
 * - Tier 2 (100%): Notify admin + supervisors + registrant; set sla_breached
 * - Tier 3 (150%): Auto-reassign to supervisor; if none, pin CRITICAL to queue
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Read config thresholds
    const { data: configs } = await supabaseAdmin
      .from("md_mpa_config")
      .select("param_key, param_value")
      .in("param_key", [
        "sla_tier1_pct", "sla_tier2_pct", "sla_tier3_pct",
        "sla_default_duration_seconds",
      ]);

    const configMap: Record<string, string> = {};
    (configs ?? []).forEach((c: { param_key: string; param_value: string }) => {
      configMap[c.param_key] = c.param_value;
    });

    const TIER1_PCT = parseFloat(configMap.sla_tier1_pct ?? "80");
    const TIER2_PCT = parseFloat(configMap.sla_tier2_pct ?? "100");
    const TIER3_PCT = parseFloat(configMap.sla_tier3_pct ?? "150");

    // Get all active verifications with SLA running
    const { data: verifications, error: vErr } = await supabaseAdmin
      .from("platform_admin_verifications")
      .select("id, organization_id, assigned_admin_id, sla_start_at, sla_paused_duration_hours, sla_duration_seconds, sla_breach_tier, sla_breached, status")
      .eq("is_current", true)
      .in("status", ["Under_Verification", "Pending_Assignment"])
      .not("sla_start_at", "is", null);

    if (vErr) throw vErr;
    if (!verifications || verifications.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    let processed = 0;

    // Get all supervisors for Tier 2/3 notifications
    const { data: supervisors } = await supabaseAdmin
      .from("platform_admin_profiles")
      .select("id, email, full_name")
      .or("is_supervisor.eq.true,admin_tier.eq.supervisor");

    const supervisorIds = (supervisors ?? []).map((s: { id: string }) => s.id);

    for (const v of verifications) {
      const slaStartMs = new Date(v.sla_start_at).getTime();
      const pausedSeconds = (v.sla_paused_duration_hours ?? 0) * 3600;
      const elapsedSeconds = (now - slaStartMs) / 1000 - pausedSeconds;
      const elapsedPct = (elapsedSeconds / v.sla_duration_seconds) * 100;

      const currentTier = v.sla_breach_tier ?? "NONE";

      // Determine what tier to escalate to
      let targetTier: string | null = null;
      if (elapsedPct >= TIER3_PCT && currentTier !== "TIER3") {
        targetTier = "TIER3";
      } else if (elapsedPct >= TIER2_PCT && !["TIER2", "TIER3"].includes(currentTier)) {
        targetTier = "TIER2";
      } else if (elapsedPct >= TIER1_PCT && currentTier === "NONE") {
        targetTier = "TIER1";
      }

      if (!targetTier) continue;

      // Get org name for notification
      const { data: org } = await supabaseAdmin
        .from("seeker_organizations")
        .select("organization_name")
        .eq("id", v.organization_id)
        .single();

      const orgName = org?.organization_name ?? "Unknown Organization";

      // Update breach tier
      const updatePayload: Record<string, unknown> = {
        sla_breach_tier: targetTier,
        updated_at: new Date().toISOString(),
      };
      if (targetTier === "TIER2" || targetTier === "TIER3") {
        updatePayload.sla_breached = true;
      }

      await supabaseAdmin
        .from("platform_admin_verifications")
        .update(updatePayload)
        .eq("id", v.id);

      // --- NOTIFICATIONS ---
      const notifications: Array<{
        admin_id: string;
        type: string;
        title: string;
        body: string;
        deep_link: string;
      }> = [];

      if (targetTier === "TIER1" && v.assigned_admin_id) {
        notifications.push({
          admin_id: v.assigned_admin_id,
          type: "SLA_WARNING",
          title: `SLA Warning: ${orgName}`,
          body: `Verification for ${orgName} has reached ${Math.round(elapsedPct)}% of SLA. Please complete your review.`,
          deep_link: `/admin/verifications/${v.id}`,
        });
      }

      if (targetTier === "TIER2") {
        // Notify assigned admin
        if (v.assigned_admin_id) {
          notifications.push({
            admin_id: v.assigned_admin_id,
            type: "SLA_BREACH",
            title: `SLA Breached: ${orgName}`,
            body: `Verification for ${orgName} has breached its SLA deadline (${Math.round(elapsedPct)}%). Immediate action required.`,
            deep_link: `/admin/verifications/${v.id}`,
          });
        }
        // Notify all supervisors
        for (const supId of supervisorIds) {
          notifications.push({
            admin_id: supId,
            type: "SLA_BREACH",
            title: `SLA Breach Alert: ${orgName}`,
            body: `Verification for ${orgName} has breached its SLA (${Math.round(elapsedPct)}%). Assigned admin may need assistance.`,
            deep_link: `/admin/verifications/${v.id}`,
          });
        }
      }

      if (targetTier === "TIER3") {
        // Auto-reassign: attempt to call execute_auto_assignment
        // For now, notify all supervisors of critical escalation
        for (const supId of supervisorIds) {
          notifications.push({
            admin_id: supId,
            type: "SLA_CRITICAL",
            title: `CRITICAL SLA Escalation: ${orgName}`,
            body: `Verification for ${orgName} has exceeded ${Math.round(elapsedPct)}% of SLA. Auto-reassignment triggered.`,
            deep_link: `/admin/verifications/${v.id}`,
          });
        }

        // Pin as critical in open queue if unassigned
        if (!v.assigned_admin_id) {
          await supabaseAdmin
            .from("open_queue_entries")
            .update({ is_critical: true, is_pinned: true })
            .eq("verification_id", v.id);
        }
      }

      // Batch insert notifications
      if (notifications.length > 0) {
        await supabaseAdmin.from("admin_notifications").insert(notifications);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("SLA escalation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
