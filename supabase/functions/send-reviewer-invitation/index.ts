import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvitationRequest {
  reviewer_id: string;
  channel: "email" | "sms" | "both";
  message?: string;
  expiry_days?: number;
  password?: string; // Only included when coming from create flow
}

// Generate secure invitation token
function generateInvitationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "platform_admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: SendInvitationRequest = await req.json();
    const {
      reviewer_id,
      channel = "email",
      message,
      expiry_days = 14,
      password,
    } = body;

    console.log("[send-reviewer-invitation] Request received:", {
      reviewer_id,
      channel,
      expiry_days,
      hasPassword: !!password,
    });

    // Fetch reviewer details
    const { data: reviewer, error: fetchError } = await supabase
      .from("panel_reviewers")
      .select("*")
      .eq("id", reviewer_id)
      .single();

    if (fetchError || !reviewer) {
      return new Response(
        JSON.stringify({ success: false, error: "Reviewer not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate invitation token
    const invitationToken = generateInvitationToken();
    const tokenHash = await hashToken(invitationToken);
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiry_days);

    // Update reviewer with invitation details
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        invitation_status: "SENT",
        invitation_channel: channel,
        invitation_message: message,
        invitation_token_hash: tokenHash,
        invitation_token_expires_at: expiresAt.toISOString(),
        invitation_sent_at: new Date().toISOString(),
        updated_by: caller.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewer_id);

    if (updateError) {
      console.error("[send-reviewer-invitation] Update failed:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update invitation status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // App URL
    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--850a8bf8-9f37-46d4-bdd1-6ed1d177ac44.lovable.app";

    // Format expiry date
    const expiryFormatted = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Send email if channel includes email
    if (channel === "email" || channel === "both") {
      const defaultMessage = message || 
        `Hello ${reviewer.name}, we are pleased to invite you to join our Review Panel. ` +
        `Your expertise will help us evaluate and qualify solution providers on our platform.`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hello ${reviewer.name},</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            ${defaultMessage}
          </p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
            <h2 style="margin-top: 0; color: #333; font-size: 18px;">Your Login Credentials</h2>
            <p style="margin: 12px 0;"><strong>Portal URL:</strong> 
              <a href="${appUrl}/login" style="color: #2563eb;">${appUrl}/login</a>
            </p>
            <p style="margin: 12px 0;"><strong>Email:</strong> ${reviewer.email}</p>
            ${password ? `<p style="margin: 12px 0;"><strong>Password:</strong> 
              <code style="background: #e0e0e0; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${password}</code>
            </p>` : '<p style="margin: 12px 0;"><em>Use your existing password or reset it if needed.</em></p>'}
            <p style="color: #d32f2f; margin: 16px 0 0 0; font-weight: 500;">
              ⚠️ This invitation expires on ${expiryFormatted}
            </p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">Once logged in, you will be able to:</p>
          <ul style="color: #555; font-size: 16px; line-height: 1.8;">
            <li>View your interview schedule</li>
            <li>Access provider profiles for review</li>
            <li>Submit evaluation feedback</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          
          <p style="color: #888; font-size: 14px;">
            If you have questions, please contact support@cogniblend.com
          </p>
          
          <p style="color: #555; font-size: 16px; margin-top: 24px;">
            Best regards,<br>
            <strong>The CogniBlend Team</strong>
          </p>
        </div>
      `;

      const emailResponse = await resend.emails.send({
        from: "CogniBlend <onboarding@resend.dev>",
        to: [reviewer.email],
        subject: "Invitation to Join CogniBlend Review Panel",
        html: emailHtml,
      });

      console.log("[send-reviewer-invitation] Email sent:", {
        success: !emailResponse.error,
        emailId: emailResponse.data?.id,
        recipient: reviewer.email,
      });

      if (emailResponse.error) {
        console.error("[send-reviewer-invitation] Email error:", emailResponse.error);
      }
    }

    // SMS sending would go here if channel includes sms
    if (channel === "sms" || channel === "both") {
      console.log("[send-reviewer-invitation] SMS sending not implemented yet");
      // TODO: Integrate SMS provider (Twilio, etc.)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent successfully via ${channel}`,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[send-reviewer-invitation] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
