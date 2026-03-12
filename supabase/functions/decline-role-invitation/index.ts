/**
 * decline-role-invitation — Edge Function
 * Validates acceptance_token and declines the role assignment.
 * Requires authenticated user whose email matches the invitation.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, reason } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Token is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role for privileged update
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch invitation by token
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from("role_assignments")
      .select("id, org_id, role_code, user_email, user_name, status")
      .eq("acceptance_token", token)
      .single();

    if (fetchError || !assignment) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Invalid or expired invitation token" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (assignment.user_email.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "This invitation is for a different email address" } }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify status is invited
    if (assignment.status !== "invited") {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INVALID_STATE", message: `Invitation is already ${assignment.status}` },
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    // Decline the assignment
    const { error: updateError } = await supabaseAdmin
      .from("role_assignments")
      .update({
        status: "declined",
        declined_at: now,
        decline_reason: reason || null,
        updated_at: now,
        updated_by: user.id,
      })
      .eq("id", assignment.id);

    if (updateError) {
      console.error("Failed to decline role invitation:", updateError.message);
      return new Response(
        JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to decline invitation" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          assignment_id: assignment.id,
          role_code: assignment.role_code,
          org_id: assignment.org_id,
          status: "declined",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("decline-role-invitation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
