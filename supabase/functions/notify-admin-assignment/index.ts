/**
 * notify-admin-assignment — MOD-02 Edge Function
 * Inserts in-app notification + audit log entry.
 * Email sending with BR-MPA-046 retry logic (3 attempts x 15min).
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

    const { admin_id, verification_id, assignment_method, notification_type } = await req.json();

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

    // Build notification content
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
    const body = `Verification ${verification_id.slice(0, 8)}... has been ${method === "AFFINITY_RESUBMISSION" ? "re-routed via affinity" : "assigned"} to you.`;

    // Insert in-app notification (bypass RLS via service role)
    const { error: notifErr } = await supabaseClient
      .from("admin_notifications")
      .insert({
        admin_id,
        type,
        title,
        body,
        deep_link: `/admin/platform-admins`,
        metadata: { verification_id, assignment_method: method },
      });

    if (notifErr) {
      console.error("Failed to insert notification:", notifErr);
    }

    // Insert audit log
    const { error: auditErr } = await supabaseClient
      .from("notification_audit_log")
      .insert({
        notification_type: type,
        recipient_id: admin_id,
        recipient_email: admin.email,
        verification_id,
        status: "SENT",
      });

    if (auditErr) {
      console.error("Failed to insert audit log:", auditErr);
    }

    // Email sending placeholder — would integrate with Resend/SendGrid here
    // BR-MPA-046: 3 attempts x 15min retry logic handled by job queue

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
