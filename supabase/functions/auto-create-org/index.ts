/**
 * auto-create-org — Edge function for auto-onboarding.
 * Creates a default organization for new signups without an org.
 * Sets: QUICK governance, AGG model, BASIC tier.
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
    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for creating org
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user already has an org
    const { data: existingMembership } = await adminClient
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (existingMembership) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            organization_id: existingMembership.organization_id,
            already_existed: true,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive org name from user email or metadata
    const userEmail = user.email ?? "unknown";
    const userName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? userEmail.split("@")[0];
    const orgName = `${userName}'s Organization`;

    // Create the organization
    const { data: newOrg, error: orgErr } = await adminClient
      .from("seeker_organizations")
      .insert({
        name: orgName,
        operating_model: "AGG",
        governance_profile: "QUICK",
        verification_status: "auto_created",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (orgErr) {
      console.error("Failed to create org:", orgErr);
      throw new Error(`Failed to create organization: ${orgErr.message}`);
    }

    // Create membership (owner role)
    const { error: memberErr } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: "owner",
        is_active: true,
        created_by: user.id,
      });

    if (memberErr) {
      console.error("Failed to create membership:", memberErr);
      // Cleanup org if membership fails
      await adminClient.from("seeker_organizations").delete().eq("id", newOrg.id);
      throw new Error(`Failed to create membership: ${memberErr.message}`);
    }

    // Log audit
    await adminClient.from("audit_trail").insert({
      user_id: user.id,
      action: "AUTO_ONBOARD",
      method: "SYSTEM",
      details: {
        organization_id: newOrg.id,
        org_name: orgName,
        governance_profile: "QUICK",
        operating_model: "AGG",
      },
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          organization_id: newOrg.id,
          already_existed: false,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("auto-create-org error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
