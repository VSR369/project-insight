/**
 * admin-activation Edge Function (EF-SOA-03)
 *
 * Handles the /activate?token= flow:
 * 1. Validates token (SHA-256 hashed, not expired, not used)
 * 2. Sets the user's password
 * 3. Updates seeking_org_admins.status to 'active'
 * 4. Marks activation link as used
 * 5. Inserts tc_acceptances record with IP address
 * 6. Logs audit trail
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // Hash the incoming token for lookup (supports both plain UUID tokens and SHA-256 hashed tokens)
    const tokenHash = await sha256(token);

    // 1. Look up the activation link — try hashed first, then plain for backward compatibility
    let link: any = null;
    const { data: hashedLink, error: hashLinkError } = await supabaseAdmin
      .from("admin_activation_links")
      .select("id, admin_id, organization_id, expires_at, status, used_at")
      .eq("token", tokenHash)
      .single();

    if (!hashLinkError && hashedLink) {
      link = hashedLink;
    } else {
      // Fallback: try plain token for backward compatibility
      const { data: plainLink } = await supabaseAdmin
        .from("admin_activation_links")
        .select("id, admin_id, organization_id, expires_at, status, used_at")
        .eq("token", token)
        .single();
      link = plainLink;
    }

    if (!link) {
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
    const clientIP = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

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

    // 9. Insert tc_acceptances record
    if (adminRecord.user_id) {
      // Get current active platform terms
      const { data: activeTerm } = await supabaseAdmin
        .from("platform_terms")
        .select("id")
        .eq("is_active", true)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeTerm) {
        // Generate acceptance hash
        const acceptanceData = `${adminRecord.user_id}:${activeTerm.id}:${now}`;
        const acceptanceHash = await sha256(acceptanceData);

        await supabaseAdmin.from("tc_acceptances").insert({
          user_id: adminRecord.user_id,
          platform_terms_id: activeTerm.id,
          accepted_at: now,
          ip_address: clientIP,
          acceptance_hash: acceptanceHash,
        });
      }
    }

    // 10. Write audit log
    await supabaseAdmin.from("org_state_audit_log").insert({
      organization_id: adminRecord.organization_id,
      previous_status: "pending_activation",
      new_status: "active",
      changed_by: adminRecord.user_id,
      change_reason: "Admin account activated via activation link",
      metadata: {
        action: "admin_activated",
        admin_id: adminRecord.id,
        ip_address: clientIP,
      },
    });

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
