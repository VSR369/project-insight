import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteReviewerRequest {
  reviewer_id: string;
  reason?: string; // Required if reviewer was ACCEPTED
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { reviewer_id, reason }: DeleteReviewerRequest = await req.json();

    if (!reviewer_id) {
      return new Response(
        JSON.stringify({ success: false, error: "reviewer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-panel-reviewer] Processing deletion for reviewer: ${reviewer_id}`);

    // Fetch reviewer details
    const { data: reviewer, error: fetchError } = await supabaseClient
      .from("panel_reviewers")
      .select("*")
      .eq("id", reviewer_id)
      .single();

    if (fetchError || !reviewer) {
      console.error(`[delete-panel-reviewer] Reviewer not found:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Reviewer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wasAccepted = reviewer.invitation_status === "ACCEPTED";

    // If accepted, reason is required
    if (wasAccepted && (!reason || reason.trim().length < 10)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Reason is required for accepted reviewers (minimum 10 characters)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send regret email if the reviewer was ACCEPTED
    if (wasAccepted) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        try {
          await resend.emails.send({
            from: "CogniBlend <onboarding@resend.dev>",
            to: [reviewer.email],
            subject: "Panel Membership Removal Notice - CogniBlend",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1f2937;">Panel Membership Removal Notice</h2>
                
                <p>Dear ${reviewer.name},</p>
                
                <p>We regret to inform you that your panel membership has been permanently removed from our platform.</p>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0;">
                  <strong>Reason:</strong>
                  <p style="margin: 8px 0 0 0;">${reason}</p>
                </div>
                
                <p>We sincerely appreciate the time and contributions you have made to our review panel. Your expertise has been valuable to our community.</p>
                
                <p>If you have any questions or believe this decision was made in error, please contact us at <a href="mailto:support@cogniblend.com">support@cogniblend.com</a>.</p>
                
                <p style="margin-top: 30px;">
                  Best regards,<br>
                  <strong>The CogniBlend Team</strong>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="font-size: 12px; color: #6b7280;">
                  This is an automated message from CogniBlend. Please do not reply directly to this email.
                </p>
              </div>
            `,
          });
          console.log(`[delete-panel-reviewer] Regret email sent to ${reviewer.email}`);
        } catch (emailError) {
          console.error(`[delete-panel-reviewer] Failed to send regret email:`, emailError);
          // Continue with deletion even if email fails
        }
      } else {
        console.warn("[delete-panel-reviewer] RESEND_API_KEY not configured, skipping email");
      }
    }

    // Remove user_roles entry if user_id exists
    if (reviewer.user_id) {
      console.log(`[delete-panel-reviewer] Removing user_roles for user: ${reviewer.user_id}`);
      const { error: rolesError } = await supabaseClient
        .from("user_roles")
        .delete()
        .eq("user_id", reviewer.user_id)
        .eq("role", "panel_reviewer");

      if (rolesError) {
        console.error(`[delete-panel-reviewer] Failed to remove user_roles:`, rolesError);
        // Continue anyway
      }

      // Optionally disable the auth user (soft disable, not delete)
      // We'll just mark the reviewer as deleted, the auth user remains but is orphaned
      // In production, you might want to actually delete the auth user
    }

    // Hard delete the panel_reviewers record
    console.log(`[delete-panel-reviewer] Hard deleting reviewer record: ${reviewer_id}`);
    const { error: deleteError } = await supabaseClient
      .from("panel_reviewers")
      .delete()
      .eq("id", reviewer_id);

    if (deleteError) {
      console.error(`[delete-panel-reviewer] Failed to delete reviewer:`, deleteError);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-panel-reviewer] Successfully deleted reviewer: ${reviewer_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        was_accepted: wasAccepted,
        email_sent: wasAccepted,
        message: wasAccepted 
          ? "Reviewer deleted and regret email sent" 
          : "Reviewer permanently deleted"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[delete-panel-reviewer] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
