import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectRequest {
  reviewer_id: string;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has platform_admin role
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin");

    if (rolesError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { reviewer_id, reason }: RejectRequest = await req.json();

    if (!reviewer_id) {
      return new Response(
        JSON.stringify({ success: false, error: "reviewer_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reason || reason.trim().length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "A rejection reason of at least 10 characters is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the reviewer
    const { data: reviewer, error: fetchError } = await supabase
      .from("panel_reviewers")
      .select("*")
      .eq("id", reviewer_id)
      .single();

    if (fetchError || !reviewer) {
      return new Response(
        JSON.stringify({ success: false, error: "Reviewer not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify reviewer is pending approval
    if (reviewer.approval_status !== "pending") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot reject: reviewer status is '${reviewer.approval_status}', expected 'pending'` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the reviewer
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        approval_status: "rejected",
        is_active: false,
        approval_notes: reason.trim(),
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", reviewer_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to reject reviewer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send rejection email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey && reviewer.email) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CogniBlend <onboarding@resend.dev>",
            to: [reviewer.email],
            subject: "Update on Your Reviewer Application",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1f2937;">Application Update</h1>
                <p>Dear ${reviewer.name},</p>
                <p>Thank you for your interest in becoming a panel reviewer.</p>
                <p>After careful review, we are unable to approve your application at this time.</p>
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #4b5563;"><strong>Reason:</strong></p>
                  <p style="margin: 8px 0 0 0; color: #1f2937;">${reason}</p>
                </div>
                <p>If you believe this was in error or would like to discuss further, please contact our support team.</p>
                <p style="color: #6b7280; font-size: 14px;">Best regards,<br/>The CogniBlend Team</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Don't fail the rejection if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reviewer application rejected",
        data: { reviewer_id }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
