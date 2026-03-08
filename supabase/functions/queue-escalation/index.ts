import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Queue Escalation Edge Function (MOD-03)
 * 
 * Called by pg_cron every 30 minutes. Finds unclaimed queue entries that
 * have been waiting longer than the configured threshold (default 4hr)
 * and notifies all supervisors.
 *
 * Config keys aligned with MOD-07 canonical names.
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

    // Read configurable thresholds — using MOD-07 canonical keys
    const { data: configs } = await supabaseAdmin
      .from("md_mpa_config")
      .select("param_key, param_value")
      .in("param_key", ["queue_unclaimed_sla_hours", "queue_escalation_interval_hours"]);

    const configMap: Record<string, string> = {};
    (configs ?? []).forEach((c: { param_key: string; param_value: string }) => {
      configMap[c.param_key] = c.param_value;
    });

    const UNCLAIMED_THRESHOLD_HOURS = parseFloat(configMap.queue_unclaimed_sla_hours ?? "4");
    const REPEAT_INTERVAL_HOURS = parseFloat(configMap.queue_escalation_interval_hours ?? "2");

    const thresholdTime = new Date(Date.now() - UNCLAIMED_THRESHOLD_HOURS * 3600 * 1000).toISOString();
    const repeatCutoff = new Date(Date.now() - REPEAT_INTERVAL_HOURS * 3600 * 1000).toISOString();

    // Find unclaimed entries older than threshold
    const { data: staleEntries, error: qErr } = await supabaseAdmin
      .from("open_queue_entries")
      .select("id, verification_id, entered_at, escalation_count, last_escalated_at")
      .is("claimed_by", null)
      .lt("entered_at", thresholdTime);

    if (qErr) throw qErr;
    if (!staleEntries || staleEntries.length === 0) {
      return new Response(JSON.stringify({ success: true, escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only escalate if not recently escalated
    const toEscalate = staleEntries.filter((entry) => {
      if (!entry.last_escalated_at) return true;
      return entry.last_escalated_at < repeatCutoff;
    });

    if (toEscalate.length === 0) {
      return new Response(JSON.stringify({ success: true, escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all supervisors — using admin_tier only
    const { data: supervisors } = await supabaseAdmin
      .from("platform_admin_profiles")
      .select("id")
      .eq("admin_tier", "supervisor");

    const supervisorIds = (supervisors ?? []).map((s: { id: string }) => s.id);
    if (supervisorIds.length === 0) {
      console.warn("No supervisors found for queue escalation notifications");
      return new Response(JSON.stringify({ success: true, escalated: 0, warning: "no_supervisors" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get verification + org details for notification text
    const verificationIds = toEscalate.map((e) => e.verification_id);
    const { data: verifications } = await supabaseAdmin
      .from("platform_admin_verifications")
      .select("id, organization_id")
      .in("id", verificationIds);

    const orgIds = [...new Set((verifications ?? []).map((v: { organization_id: string }) => v.organization_id))];
    const { data: orgs } = await supabaseAdmin
      .from("seeker_organizations")
      .select("id, organization_name")
      .in("id", orgIds);

    const orgMap: Record<string, string> = {};
    (orgs ?? []).forEach((o: { id: string; organization_name: string }) => {
      orgMap[o.id] = o.organization_name;
    });

    const verOrgMap: Record<string, string> = {};
    (verifications ?? []).forEach((v: { id: string; organization_id: string }) => {
      verOrgMap[v.id] = orgMap[v.organization_id] ?? "Unknown";
    });

    // Create notifications for each stale entry × each supervisor
    const notifications: Array<{
      admin_id: string;
      type: string;
      title: string;
      body: string;
      deep_link: string;
      metadata: Record<string, unknown>;
    }> = [];

    const updateIds: string[] = [];

    for (const entry of toEscalate) {
      const orgName = verOrgMap[entry.verification_id] ?? "Unknown Organization";
      const hoursInQueue = Math.round((Date.now() - new Date(entry.entered_at).getTime()) / 3600000);

      for (const supId of supervisorIds) {
        notifications.push({
          admin_id: supId,
          type: "QUEUE_ESCALATION",
          title: `Unclaimed Verification: ${orgName}`,
          body: `Verification for ${orgName} has been unclaimed in the queue for ${hoursInQueue}h. Escalation #${entry.escalation_count + 1}.`,
          deep_link: `/admin/verifications?tab=queue`,
          metadata: { org_name: orgName, hours_in_queue: hoursInQueue, escalation_count: entry.escalation_count + 1 },
        });
      }
      updateIds.push(entry.id);
    }

    // Insert all notifications
    if (notifications.length > 0) {
      await supabaseAdmin.from("admin_notifications").insert(notifications);
    }

    // Update escalation tracking
    for (const id of updateIds) {
      await supabaseAdmin
        .from("open_queue_entries")
        .update({
          escalation_count: (toEscalate.find((e) => e.id === id)?.escalation_count ?? 0) + 1,
          last_escalated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    return new Response(
      JSON.stringify({ success: true, escalated: toEscalate.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Queue escalation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
