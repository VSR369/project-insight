/**
 * send-registrant-courtesy — MOD-04 Edge Function
 * BR-MPA-036: Sends privacy-safe courtesy email to registrant on Tier 2/3 SLA events.
 * Idempotent: skips if same tier message sent within 30 minutes.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { verification_id, tier } = await req.json();

    if (!verification_id || !tier) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing verification_id or tier" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotency check: same tier message sent within 30 min?
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("registrant_communications")
      .select("id")
      .eq("verification_id", verification_id)
      .eq("message_type", `COURTESY_${tier}`)
      .gte("created_at", thirtyMinAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      return new Response(
        JSON.stringify({ success: true, data: { skipped: true, reason: "Duplicate within 30 min window" } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get verification + org details
    const { data: verification } = await supabaseAdmin
      .from("platform_admin_verifications")
      .select("id, organization_id")
      .eq("id", verification_id)
      .single();

    if (!verification) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Verification not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: org } = await supabaseAdmin
      .from("seeker_organizations")
      .select("organization_name, primary_contact_email, primary_contact_name")
      .eq("id", verification.organization_id)
      .single();

    if (!org?.primary_contact_email) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NO_CONTACT", message: "No primary contact email for org" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build privacy-safe email content (NO admin names, NO SLA metrics)
    const subject = tier === "TIER2"
      ? `Update on your organization verification — ${org.organization_name}`
      : `Important update regarding your verification — ${org.organization_name}`;

    const bodyHtml = tier === "TIER2"
      ? `<p>Dear ${org.primary_contact_name ?? "Registrant"},</p>
         <p>We wanted to let you know that the verification of <strong>${org.organization_name}</strong> is currently being reviewed by our team. We are working to complete this process as quickly as possible.</p>
         <p>If you have any questions or additional documentation to share, please reply to this email.</p>
         <p>Thank you for your patience.</p>
         <p>Best regards,<br/>The Verification Team</p>`
      : `<p>Dear ${org.primary_contact_name ?? "Registrant"},</p>
         <p>We are writing to inform you that the verification of <strong>${org.organization_name}</strong> has been escalated for priority review. Our senior team is now handling your case to ensure a prompt resolution.</p>
         <p>If you have any questions or additional documentation to share, please reply to this email.</p>
         <p>We appreciate your patience and understanding.</p>
         <p>Best regards,<br/>The Verification Team</p>`;

    // Insert into registrant_communications
    const { error: insertErr } = await supabaseAdmin
      .from("registrant_communications")
      .insert({
        verification_id,
        direction: "OUTBOUND",
        message_type: `COURTESY_${tier}`,
        subject,
        body_html: bodyHtml,
        body_text: bodyHtml.replace(/<[^>]*>/g, ""),
        recipient_email: org.primary_contact_email,
        recipient_name: org.primary_contact_name,
        email_status: "PENDING",
      });

    if (insertErr) {
      console.error("Failed to insert registrant communication:", insertErr);
    }

    // Insert audit log entry
    await supabaseAdmin
      .from("notification_audit_log")
      .insert({
        notification_type: `COURTESY_${tier}`,
        recipient_id: null,
        recipient_email: org.primary_contact_email,
        recipient_type: "REGISTRANT",
        recipient_name: org.primary_contact_name,
        verification_id,
        status: "SENT",
        email_status: "PENDING",
        in_app_status: "SKIPPED",
        triggered_by: "SLA_ESCALATION",
      });

    return new Response(
      JSON.stringify({ success: true, data: { sent: !insertErr } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Send registrant courtesy error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
