import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { member_name, member_email, role_names, added_by_name } = await req.json();

    if (!member_email) throw new Error("member_email is required");
    if (!member_name) throw new Error("member_name is required");

    const rolesText = role_names?.length
      ? role_names.join(", ")
      : "Resource Pool Member";

    const siteUrl = Deno.env.get("SITE_URL") || "https://schema-whisperer-72.lovable.app";

    // Determine from address and recipient based on domain verification
    const verifiedFromAddress = Deno.env.get("RESEND_FROM_ADDRESS");
    const sandboxRecipient = Deno.env.get("RESEND_VERIFIED_EMAIL") || "vsr0001@gmail.com";

    const isSandboxMode = !verifiedFromAddress;
    const fromAddress = isSandboxMode ? "onboarding@resend.dev" : verifiedFromAddress;
    const toAddress = isSandboxMode ? sandboxRecipient : member_email;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject: `You've been added to the SLM Resource Pool`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="color:#1a1a1a;">Welcome to the Resource Pool</h2>
            <p>Hello ${member_name},</p>
            <p>You have been added to the <strong>SLM Marketplace Resource Pool</strong> as <strong>${rolesText}</strong>${added_by_name ? ` by ${added_by_name}` : ""}.</p>
            ${isSandboxMode ? `<p style="color:#b45309;font-size:12px;background:#fef3c7;padding:8px 12px;border-radius:6px;">⚠️ Sandbox mode: This email was redirected to ${sandboxRecipient}. Original recipient: ${member_email}. To send to actual recipients, verify a domain at resend.com/domains.</p>` : ""}
            <p>As a pool member, you may be assigned to Marketplace challenges based on your domain expertise and availability.</p>
            <p style="margin:24px 0;">
              <a href="${siteUrl}" style="background-color:hsl(222.2,47.4%,11.2%);color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
                Visit Platform
              </a>
            </p>
            <p style="color:#666;font-size:13px;">This is an informational email. No action is required at this time. If you did not expect this, please contact the platform administrator.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend error [${emailRes.status}]: ${errBody}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-pool-member-welcome error:", message);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
