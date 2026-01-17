import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CancelInvitationRequest {
  reviewer_id: string;
  reason?: string; // Required if invitation was ACCEPTED
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

    const body: CancelInvitationRequest = await req.json();
    const { reviewer_id, reason } = body;

    console.log("[cancel-reviewer-invitation] Request received:", {
      reviewer_id,
      hasReason: !!reason,
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

    const invitationStatus = reviewer.invitation_status;

    // Check if invitation was already accepted - require reason
    if (invitationStatus === "ACCEPTED") {
      if (!reason || reason.trim().length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Reason is required when cancelling an accepted invitation" 
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Send regret email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Hello ${reviewer.name},</h1>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            We regret to inform you that your panel membership has been cancelled.
          </p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ffc107;">
            <h2 style="margin-top: 0; color: #856404; font-size: 16px;">Reason for Cancellation</h2>
            <p style="margin: 0; color: #856404; font-size: 14px;">${reason}</p>
          </div>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            If you believe this was done in error or have any questions, please contact us at 
            <a href="mailto:support@cogniblend.com" style="color: #2563eb;">support@cogniblend.com</a>.
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
        subject: "Panel Membership Cancellation Notice",
        html: emailHtml,
      });

      console.log("[cancel-reviewer-invitation] Regret email sent:", {
        success: !emailResponse.error,
        emailId: emailResponse.data?.id,
        recipient: reviewer.email,
      });

      if (emailResponse.error) {
        console.error("[cancel-reviewer-invitation] Email error:", emailResponse.error);
        // Continue with cancellation even if email fails
      }
    }

    // Update reviewer record - mark as cancelled
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        invitation_status: "CANCELLED",
        is_active: false,
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
        cancelled_by: caller.id,
        updated_by: caller.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewer_id);

    if (updateError) {
      console.error("[cancel-reviewer-invitation] Update failed:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to cancel invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Optionally deactivate the user account if one exists
    if (reviewer.user_id) {
      // Remove the panel_reviewer role
      const { error: roleDeleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", reviewer.user_id)
        .eq("role", "panel_reviewer");

      if (roleDeleteError) {
        console.error("[cancel-reviewer-invitation] Role removal failed:", roleDeleteError);
        // Continue - not critical
      } else {
        console.log("[cancel-reviewer-invitation] Removed panel_reviewer role for user:", reviewer.user_id);
      }
    }

    const wasAccepted = invitationStatus === "ACCEPTED";

    return new Response(
      JSON.stringify({
        success: true,
        message: wasAccepted 
          ? "Invitation cancelled and regret email sent" 
          : "Invitation cancelled successfully",
        was_accepted: wasAccepted,
        regret_email_sent: wasAccepted,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[cancel-reviewer-invitation] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
