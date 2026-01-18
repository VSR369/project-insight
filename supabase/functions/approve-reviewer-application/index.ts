import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveRequest {
  reviewer_id: string;
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
    const { reviewer_id }: ApproveRequest = await req.json();

    if (!reviewer_id) {
      return new Response(
        JSON.stringify({ success: false, error: "reviewer_id is required" }),
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
          error: `Cannot approve: reviewer status is '${reviewer.approval_status}', expected 'pending'` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the reviewer
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        approval_status: "approved",
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq("id", reviewer_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to approve reviewer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign panel_reviewer role if reviewer has a user_id
    if (reviewer.user_id) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: reviewer.user_id,
          role: "panel_reviewer",
        }, { 
          onConflict: "user_id,role",
          ignoreDuplicates: true 
        });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        // Don't fail the approval, but log the error
      } else {
        console.log(`Assigned panel_reviewer role to user ${reviewer.user_id}`);
      }
    }

    // Send welcome email via Resend
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
            from: "CogniBlend <noreply@cogniblend.com>",
            to: [reviewer.email],
            subject: "Your Reviewer Application Has Been Approved!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #059669;">Welcome to the Review Panel!</h1>
                <p>Dear ${reviewer.name},</p>
                <p>Great news! Your application to become a panel reviewer has been <strong>approved</strong>.</p>
                <p>You can now log in to the Reviewer Portal and start managing your availability for interview sessions.</p>
                <div style="margin: 30px 0;">
                  <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/reviewer/dashboard" 
                     style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    Login to Reviewer Portal
                  </a>
                </div>
                <p>Welcome to the team!</p>
                <p style="color: #6b7280; font-size: 14px;">The CogniBlend Team</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Don't fail the approval if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reviewer approved successfully",
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
