import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function for reviewers to explicitly accept their invitation.
 * Called when a reviewer clicks "Accept Invitation" on the invitation response page.
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

    console.log("[accept-reviewer-invitation] User requesting acceptance:", user.id, user.email);

    // Find the reviewer record for this user
    const { data: reviewer, error: fetchError } = await supabase
      .from("panel_reviewers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !reviewer) {
      console.error("[accept-reviewer-invitation] Reviewer not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "No invitation found for this user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[accept-reviewer-invitation] Found reviewer:", {
      id: reviewer.id,
      invitation_status: reviewer.invitation_status,
      enrollment_source: reviewer.enrollment_source,
    });

    // Check if invitation is in a state that can be accepted
    if (reviewer.invitation_status === "ACCEPTED") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Invitation already accepted",
          already_accepted: true 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (reviewer.invitation_status !== "SENT") {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Cannot accept invitation with status '${reviewer.invitation_status}'` 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invitation has expired
    if (reviewer.invitation_token_expires_at) {
      const expiresAt = new Date(reviewer.invitation_token_expires_at);
      if (expiresAt < new Date()) {
        // Mark as expired
        await supabase
          .from("panel_reviewers")
          .update({ invitation_status: "EXPIRED" })
          .eq("id", reviewer.id);

        return new Response(
          JSON.stringify({ success: false, error: "Invitation has expired" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Accept the invitation
    const { error: updateError } = await supabase
      .from("panel_reviewers")
      .update({
        invitation_status: "ACCEPTED",
        invitation_accepted_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewer.id);

    if (updateError) {
      console.error("[accept-reviewer-invitation] Update failed:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to accept invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Assign panel_reviewer role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(
        { user_id: user.id, role: "panel_reviewer" },
        { onConflict: "user_id,role", ignoreDuplicates: true }
      );

    if (roleError) {
      console.error("[accept-reviewer-invitation] Role assignment failed:", roleError);
      // Don't fail the acceptance, role might already exist
    } else {
      console.log("[accept-reviewer-invitation] Assigned panel_reviewer role to:", user.id);
    }

    console.log("[accept-reviewer-invitation] Invitation accepted for reviewer:", reviewer.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation accepted successfully",
        reviewer_id: reviewer.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[accept-reviewer-invitation] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
