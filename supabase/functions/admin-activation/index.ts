/**
 * admin-activation Edge Function (EF-SOA-03)
 *
 * Handles the /activate?token= flow:
 * 1. Validates token (not expired, not used)
 * 2. Sets the user's password
 * 3. Updates seeking_org_admins.status to 'active'
 * 4. Marks activation link as used
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
    const { token, password } = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Token and password are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Look up the activation link
    const { data: link, error: linkError } = await supabaseAdmin
      .from("admin_activation_links")
      .select("id, admin_id, organization_id, expires_at, status, used_at")
      .eq("token", token)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INVALID_TOKEN", message: "Activation link not found or invalid" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if already used
    if (link.status === "used" || link.used_at) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "ALREADY_USED", message: "This activation link has already been used" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check expiry
    if (new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "EXPIRED", message: "This activation link has expired" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get the seeking_org_admins record
    const { data: adminRecord, error: adminError } = await supabaseAdmin
      .from("seeking_org_admins")
      .select("id, user_id, organization_id, status")
      .eq("id", link.admin_id)
      .single();

    if (adminError || !adminRecord) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "ADMIN_NOT_FOUND", message: "Admin record not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Update password for the auth user
    if (adminRecord.user_id) {
      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(
        adminRecord.user_id,
        { password }
      );
      if (pwdError) {
        console.error("Password update failed:", pwdError.message);
        return new Response(
          JSON.stringify({ success: false, error: { code: "PASSWORD_ERROR", message: "Failed to set password" } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const now = new Date().toISOString();

    // 6. Update seeking_org_admins status to active
    const { error: statusError } = await supabaseAdmin
      .from("seeking_org_admins")
      .update({
        status: "active",
        activated_at: now,
        updated_at: now,
      })
      .eq("id", adminRecord.id);

    if (statusError) {
      console.error("Admin status update failed:", statusError.message);
    }

    // 7. Mark activation link as used
    const { error: linkUpdateError } = await supabaseAdmin
      .from("admin_activation_links")
      .update({
        status: "used",
        used_at: now,
      })
      .eq("id", link.id);

    if (linkUpdateError) {
      console.error("Activation link update failed:", linkUpdateError.message);
    }

    // 8. Transition org to active if not already
    const { error: orgError } = await supabaseAdmin
      .from("seeker_organizations")
      .update({
        verification_status: "active",
        updated_at: now,
      })
      .eq("id", adminRecord.organization_id)
      .eq("verification_status", "verified");

    if (orgError) {
      console.error("Org status update failed:", orgError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          organization_id: adminRecord.organization_id,
          admin_id: adminRecord.id,
          message: "Account activated successfully",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
