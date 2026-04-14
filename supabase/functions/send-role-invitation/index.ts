import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { assignment_id, org_name } = await req.json();
    if (!assignment_id) throw new Error("assignment_id is required");

    // Fetch assignment
    const { data: assignment, error: aErr } = await supabase
      .from("role_assignments")
      .select("id, user_email, user_name, role_code, acceptance_token, org_id")
      .eq("id", assignment_id)
      .single();
    if (aErr || !assignment) throw new Error(aErr?.message || "Assignment not found");

    // Fetch role display name
    const { data: roleData } = await supabase
      .from("md_slm_role_codes")
      .select("display_name")
      .eq("code", assignment.role_code)
      .single();
    const roleName = roleData?.display_name || assignment.role_code;

    // Build invitation link
    const siteUrl = Deno.env.get("SITE_URL") || "https://schema-whisperer-72.lovable.app";
    const inviteLink = `${siteUrl}/org/role-invitation?token=${assignment.acceptance_token}`;

    // Determine from address and recipient based on domain verification
    // RESEND_FROM_ADDRESS should be set to an email on your verified domain (e.g. noreply@yourdomain.com)
    // If not set, falls back to sandbox mode (onboarding@resend.dev → own email only)
    const verifiedFromAddress = Deno.env.get("RESEND_FROM_ADDRESS");
    const sandboxRecipient = Deno.env.get("RESEND_VERIFIED_EMAIL") || "vsr0001@gmail.com";

    const isSandboxMode = !verifiedFromAddress;
    const fromAddress = isSandboxMode ? "onboarding@resend.dev" : verifiedFromAddress;
    const toAddress = isSandboxMode ? sandboxRecipient : assignment.user_email;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject: `You've been invited to the ${roleName} role${org_name ? ` at ${org_name}` : ""}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a1a;">Role Invitation</h2>
            <p>Hello ${assignment.user_name || "there"},</p>
            <p>You have been invited to join as <strong>${roleName}</strong>${org_name ? ` at <strong>${org_name}</strong>` : ""}.</p>
            ${isSandboxMode ? `<p style="color:#b45309;font-size:12px;background:#fef3c7;padding:8px 12px;border-radius:6px;">⚠️ Sandbox mode: This email was redirected to ${sandboxRecipient}. Original recipient: ${assignment.user_email}. To send to actual recipients, verify a domain at resend.com/domains.</p>` : ""}
            <p>Please click the link below to accept or decline this invitation:</p>
            <p style="margin:24px 0;">
              <a href="${inviteLink}" style="background-color:hsl(222.2,47.4%,11.2%);color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
                View Invitation
              </a>
            </p>
            <p style="color:#666;font-size:13px;">This invitation will expire in 7 days. If you did not expect this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend error [${emailRes.status}]: ${errBody}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          assignment_id,
          sandbox_mode: isSandboxMode,
          delivered_to: toAddress,
          original_recipient: assignment.user_email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-role-invitation error:", message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
