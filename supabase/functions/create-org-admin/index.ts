/**
 * create-org-admin Edge Function
 *
 * Atomically creates a Supabase Auth user and maps them as tenant_admin
 * in org_users. Uses service_role to bypass RLS.
 *
 * Idempotent: if the email already exists in auth.users, looks up the
 * existing user and creates the org_users mapping for the new org.
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

    let userId: string;
    let isExistingUser = false;

    // 1. Try to create auth user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name ?? "",
          last_name: last_name ?? "",
          role_type: "seeker",
        },
      });

    if (authError) {
      // Handle "already registered" — look up existing user
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        console.log("User already exists, looking up by email:", email);

        const { data: listData, error: listError } =
          await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

        if (listError) {
          console.error("Failed to list users:", listError.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "AUTH_LOOKUP_ERROR", message: "Failed to look up existing user" },
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // listUsers doesn't filter by email; use getUserByEmail via admin API workaround
        // Supabase admin API: look up user by iterating or use a different approach
        // The most reliable way: query auth.users table directly via service_role
        const { data: existingUsers, error: lookupError } = await supabaseAdmin
          .from("auth_user_lookup")
          .select("id")
          .eq("email", email)
          .limit(1);

        // Fallback: if the view doesn't exist, use admin.listUsers with filter
        let foundUserId: string | null = null;

        if (lookupError || !existingUsers?.length) {
          // Fallback: iterate through admin users (paginated search)
          let page = 1;
          const perPage = 50;
          let found = false;
          while (!found) {
            const { data: pageData, error: pageError } =
              await supabaseAdmin.auth.admin.listUsers({ page, perPage });
            if (pageError || !pageData?.users?.length) break;
            const match = pageData.users.find(
              (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
            );
            if (match) {
              foundUserId = match.id;
              found = true;
            }
            if (pageData.users.length < perPage) break;
            page++;
          }
        } else {
          foundUserId = existingUsers[0].id;
        }

        if (!foundUserId) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: "USER_NOT_FOUND", message: "Email is registered but user could not be located" },
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = foundUserId;
        isExistingUser = true;

        // Update password to the one they just provided during org registration
        const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(
          foundUserId,
          { password }
        );
        if (pwdError) {
          console.warn("Password update for existing user failed:", pwdError.message);
        }

        // Update user metadata with seeker role_type
        const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
          foundUserId,
          {
            user_metadata: {
              first_name: first_name ?? undefined,
              last_name: last_name ?? undefined,
              role_type: "seeker",
            },
          }
        );
        if (metaError) {
          console.warn("Metadata update for existing user failed:", metaError.message);
        }
      } else {
        console.error("Auth user creation failed:", authError.message);
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "AUTH_ERROR", message: authError.message },
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      userId = authData.user.id;
    }

    // 2. Check if org_users mapping already exists for this user + org
    const { data: existingMapping, error: mappingCheckError } = await supabaseAdmin
      .from("org_users")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organization_id)
      .limit(1);

    if (mappingCheckError) {
      console.error("org_users check failed:", mappingCheckError.message);
    }

    if (existingMapping && existingMapping.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "ALREADY_MAPPED", message: "You are already registered with this organization" },
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Insert org_users record — map user as tenant_admin
    const { error: orgUserError } = await supabaseAdmin
      .from("org_users")
      .insert({
        user_id: userId,
        organization_id,
        tenant_id,
        role: "tenant_admin",
        is_active: true,
        invitation_status: "active",
        joined_at: new Date().toISOString(),
        created_by: userId,
      });

    if (orgUserError) {
      console.error("org_users insert failed:", orgUserError.message);
      // Cleanup auth user only if we just created it
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "ORG_USER_ERROR", message: orgUserError.message },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Update seeker_organizations.created_by for audit trail
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
        data: { user_id: userId, is_existing_user: isExistingUser },
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
