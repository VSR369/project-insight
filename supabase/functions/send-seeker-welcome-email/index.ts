import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orgId, adminEmail, orgName, tempPassword } = await req.json();

    if (!orgId || !adminEmail || !orgName || !tempPassword) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve admin email from user_id if needed
    let recipientEmail = adminEmail;
    if (!adminEmail.includes("@")) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: userData } = await adminClient.auth.admin.getUserById(adminEmail);
      recipientEmail = userData?.user?.email;
      if (!recipientEmail) {
        return new Response(JSON.stringify({ success: false, error: "Admin email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const loginUrl = "https://schema-whisperer-72.lovable.app/login";

    const { error: emailError } = await resend.emails.send({
      from: "CogniBlend <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Welcome to CogniBlend — ${orgName} Account Activated`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a2e;">Welcome to CogniBlend!</h1>
          <p>Your organization <strong>${orgName}</strong> has been verified and approved on the CogniBlend platform.</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${recipientEmail}</p>
            <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #666;">Please change your password after first login.</p>
          <p>Best regards,<br/>The CogniBlend Team</p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(JSON.stringify({ success: false, error: emailError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
