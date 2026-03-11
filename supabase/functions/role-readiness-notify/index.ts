import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller authentication
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

    const { org_id, model, transition_type } = await req.json();

    if (!org_id || !model || !transition_type) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "org_id, model, and transition_type are required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["not_ready", "ready"].includes(transition_type)) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "transition_type must be 'not_ready' or 'ready'" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get org info
    const { data: org } = await adminClient
      .from("seeker_organizations")
      .select("id, organization_name")
      .eq("id", org_id)
      .single();

    if (!org) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Organization not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get missing roles if NOT_READY
    let missingRoleNames: string[] = [];
    if (transition_type === "not_ready") {
      const { data: cache } = await adminClient
        .from("role_readiness_cache")
        .select("missing_roles")
        .eq("org_id", org_id)
        .eq("engagement_model", model)
        .maybeSingle();

      if (cache?.missing_roles) {
        // Resolve codes to display names
        const { data: roles } = await adminClient
          .from("md_slm_role_codes")
          .select("code, display_name")
          .in("code", cache.missing_roles);
        missingRoleNames = (roles ?? []).map((r) => `${r.display_name} (${r.code})`);
      }
    }

    // Determine notification recipients based on model
    const recipients: { user_id: string; admin_type: string }[] = [];

    if (model === "mp") {
      // MP model: notify Platform Admins
      const { data: admins } = await adminClient
        .from("platform_admin_profiles")
        .select("user_id")
        .eq("is_active", true)
        .limit(20);
      for (const a of admins ?? []) {
        recipients.push({ user_id: a.user_id, admin_type: "platform_admin" });
      }
    } else if (model === "agg") {
      // AGG model: notify Primary SOA + in-scope Delegated SOAs
      const { data: soaAdmins } = await adminClient
        .from("seeking_org_admins")
        .select("user_id, admin_tier")
        .eq("organization_id", org_id)
        .eq("status", "active")
        .limit(20);
      for (const a of soaAdmins ?? []) {
        recipients.push({ user_id: a.user_id, admin_type: `soa_${a.admin_tier}` });
      }
    }

    // Create in-app notifications for each recipient
    const modelLabel = model === "mp" ? "Marketplace" : "Aggregator";
    const notificationTitle = transition_type === "ready"
      ? `✅ Role Readiness: READY — ${org.organization_name}`
      : `⚠️ Role Readiness: NOT READY — ${org.organization_name}`;

    const notificationBody = transition_type === "ready"
      ? `All required ${modelLabel} roles have been filled for ${org.organization_name}. Challenges can now proceed.`
      : `Missing roles for ${org.organization_name} (${modelLabel}): ${missingRoleNames.join(", ")}. Please assign the remaining roles.`;

    const notifications = recipients.map((r) => ({
      admin_id: r.user_id,
      type: `role_readiness_${transition_type}`,
      title: notificationTitle,
      body: notificationBody,
      deep_link: "/admin/marketplace/roles",
      metadata: {
        org_id,
        model,
        transition_type,
        admin_type: r.admin_type,
        missing_roles: missingRoleNames,
      },
    }));

    let notificationCount = 0;
    if (notifications.length > 0) {
      const { error: insertError } = await adminClient
        .from("admin_notifications")
        .insert(notifications);
      if (insertError) {
        console.error("Failed to insert notifications:", insertError.message);
      } else {
        notificationCount = notifications.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transition_type,
          org_id,
          model,
          recipients_notified: notificationCount,
          notification_title: notificationTitle,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
