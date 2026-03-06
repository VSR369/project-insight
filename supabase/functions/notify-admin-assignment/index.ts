/**
 * notify-admin-assignment — MOD-02 Edge Function
 * GAP-8: Rich notification content with org name, industry, country, SLA.
 * GAP-19: Correct deep_link to /admin/verifications/:id.
 * BR-MPA-046: Inserts retry queue entry for email delivery.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      admin_id,
      verification_id,
      assignment_method,
      notification_type,
      org_name,
      industry_segments,
      hq_country,
      org_type,
      domain_score,
      sla_deadline,
    } = await req.json();

    if (!admin_id || !verification_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing admin_id or verification_id" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const type = notification_type ?? "ASSIGNMENT";
    const method = assignment_method ?? "AUTO_ASSIGNED";

    // Get admin details for notification
    const { data: admin, error: adminErr } = await supabaseClient
      .from("platform_admin_profiles")
      .select("id, full_name, email")
      .eq("id", admin_id)
      .single();

    if (adminErr || !admin) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Admin profile not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification content (GAP-8: rich content)
    const titleMap: Record<string, string> = {
      ASSIGNMENT: "New Verification Assigned",
      REASSIGNMENT_IN: "Verification Reassigned to You",
      TIER1_WARNING: "SLA Warning: Approaching Deadline",
      TIER2_BREACH: "SLA Breach: Deadline Exceeded",
      TIER3_CRITICAL: "CRITICAL: Immediate Action Required",
      QUEUE_ESCALATION: "Queue Entry Unclaimed — Escalation",
      EMAIL_FAIL: "Email Delivery Failed",
    };

    const title = titleMap[type] ?? "Notification";

    // Rich body with org context
    const bodyParts: string[] = [];
    if (org_name) bodyParts.push(`Organization: ${org_name}`);
    if (industry_segments?.length) bodyParts.push(`Industry: ${industry_segments.join(", ")}`);
    if (hq_country) bodyParts.push(`Country: ${hq_country}`);
    if (org_type) bodyParts.push(`Type: ${org_type}`);
    if (method === "AFFINITY_RESUBMISSION") bodyParts.push("Re-routed via affinity match.");

    const body = bodyParts.length > 0
      ? bodyParts.join(" · ")
      : `Verification ${verification_id.slice(0, 8)}... has been assigned to you.`;

    // GAP-8: Rich metadata for NotificationCard rendering
    const metadata: Record<string, unknown> = {
      verification_id,
      assignment_method: method,
    };
    if (org_name) metadata.org_name = org_name;
    if (industry_segments) metadata.industry_segments = industry_segments;
    if (hq_country) metadata.hq_country = hq_country;
    if (org_type) metadata.org_type = org_type;
    if (domain_score !== undefined) metadata.domain_score = domain_score;
    if (sla_deadline) metadata.sla_deadline = sla_deadline;

    // GAP-19: Correct deep link
    const deep_link = `/admin/verifications/${verification_id}`;

    // Insert in-app notification (bypass RLS via service role)
    const { error: notifErr } = await supabaseClient
      .from("admin_notifications")
      .insert({
        admin_id,
        type,
        title,
        body,
        deep_link,
        metadata,
      });

    if (notifErr) {
      console.error("Failed to insert notification:", notifErr);
    }

    // Insert audit log
    const { data: auditRow, error: auditErr } = await supabaseClient
      .from("notification_audit_log")
      .insert({
        notification_type: type,
        recipient_id: admin_id,
        recipient_email: admin.email,
        verification_id,
        status: "SENT",
      })
      .select("id")
      .single();

    if (auditErr) {
      console.error("Failed to insert audit log:", auditErr);
    }

    // GAP-7: Insert retry queue entry for email delivery (BR-MPA-046)
    if (auditRow?.id) {
      const { error: retryErr } = await supabaseClient
        .from("notification_retry_queue")
        .insert({
          notification_audit_log_id: auditRow.id,
          recipient_email: admin.email,
          verification_id,
          notification_type: type,
          status: "pending",
        });

      if (retryErr) {
        console.error("Failed to insert retry queue entry:", retryErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { notification_sent: !notifErr } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
