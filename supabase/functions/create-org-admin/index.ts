/**
 * create-org-admin Edge Function
 *
 * Atomically creates a Supabase Auth user and maps them as tenant_admin
 * in org_users. Uses service_role to bypass RLS.
 *
 * Called at the end of Seeker Registration (Step 5).
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
    const {
      email,
      password,
      first_name,
      last_name,
      organization_id,
      tenant_id,
    } = await req.json();

    // Validate required fields
    if (!email || !password || !organization_id || !tenant_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing required fields: email, password, organization_id, tenant_id" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Pre-confirm — OTP already verified the email
        user_metadata: {
          first_name: first_name ?? "",
          last_name: last_name ?? "",
          role_type: "seeker",
        },
      });

    if (authError) {
      console.error("Auth user creation failed:", authError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "AUTH_ERROR", message: authError.message },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 2. Insert org_users record — map user as tenant_admin
    const { error: orgUserError } = await supabaseAdmin
      .from("org_users")
      .insert({
        user_id: userId,
        organization_id,
        tenant_id,
        role: "tenant_admin",
        is_active: true,
        invitation_status: "accepted",
        joined_at: new Date().toISOString(),
        created_by: userId,
      });

    if (orgUserError) {
      console.error("org_users insert failed:", orgUserError.message);
      // Attempt cleanup — delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "ORG_USER_ERROR", message: orgUserError.message },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Update seeker_organizations.created_by for audit trail
    const { error: orgUpdateError } = await supabaseAdmin
      .from("seeker_organizations")
      .update({ created_by: userId, updated_by: userId })
      .eq("id", organization_id);

    if (orgUpdateError) {
      console.error("org created_by update failed:", orgUpdateError.message);
      // Non-fatal — user and org_users record are already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { user_id: userId },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
