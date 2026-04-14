import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeclineRequest {
  reason?: string;
}

/**
 * Edge function for reviewers to explicitly decline their invitation.
 * Called when a reviewer clicks "Decline Invitation" on the invitation response page.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse optional reason
    let reason: string | undefined;
    try {
      const body: DeclineRequest = await req.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON, that's fine
    }

    console.log("[decline-reviewer-invitation] User declining:", user.id, user.email);

    // Find the reviewer record for this user
    const { data: reviewer, error: fetchError } = await supabase
      .from("panel_reviewers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !reviewer) {
      console.error("[decline-reviewer-invitation] Reviewer not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "No invitation found for this user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[decline-reviewer-invitation] Found reviewer:", {
      id: reviewer.id,
      invitation_status: reviewer.invitation_status,
    });

    // Check if invitation is in a state that can be declined
    if (reviewer.invitation_status === "DECLINED") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Invitation already declined",
          already_declined: true 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (reviewer.invitation_status !== "SENT") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot decline invitation with status '${reviewer.invitation_status}'` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Decline the invitation
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        invitation_status: "DECLINED",
        is_active: false,
        approval_notes: reason ? `Declined by reviewer: ${reason}` : "Declined by reviewer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewer.id);

    if (updateError) {
      console.error("[decline-reviewer-invitation] Update failed:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to decline invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[decline-reviewer-invitation] Invitation declined for reviewer:", reviewer.id);

    // Notify admin via email
    try {
      // Get platform admins to notify
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "platform_admin")
        .limit(5);

      if (admins && admins.length > 0) {
        // Get admin emails from profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("user_id", admins.map(a => a.user_id));

        const adminEmails = profiles?.map(p => p.email).filter(Boolean) || [];

        if (adminEmails.length > 0) {
          await resend.emails.send({
            from: "CogniBlend <onboarding@resend.dev>",
            to: adminEmails,
            subject: `Reviewer Invitation Declined: ${reviewer.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Invitation Declined</h2>
                <p>The following reviewer has declined their invitation:</p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p><strong>Name:</strong> ${reviewer.name}</p>
                  <p><strong>Email:</strong> ${reviewer.email}</p>
                  ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  You can view this in the Reviewer Management dashboard.
                </p>
              </div>
            `,
          });
          console.log("[decline-reviewer-invitation] Admin notification sent");
        }
      }
    } catch (emailErr) {
      console.error("[decline-reviewer-invitation] Email notification failed:", emailErr);
      // Don't fail the decline if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation declined",
        reviewer_id: reviewer.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[decline-reviewer-invitation] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
