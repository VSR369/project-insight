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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse org_id and model from request body
    const { org_id, model } = await req.json();

    if (!org_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "org_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role to bypass RLS for cross-org readiness checks
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get role requirements from master data
    let rolesQuery = adminClient
      .from("md_slm_role_codes")
      .select("code, display_name, model_applicability, is_core, min_required")
      .eq("is_active", true);

    if (model) {
      rolesQuery = rolesQuery.or(`model_applicability.eq.${model},model_applicability.eq.both`);
    }

    const { data: roles, error: rolesError } = await rolesQuery.order("display_order", { ascending: true });
    if (rolesError) throw rolesError;

    // 2. Get active assignments for the org
    const { data: assignments, error: assignError } = await adminClient
      .from("role_assignments")
      .select("role_code, status")
      .eq("org_id", org_id)
      .eq("status", "active");
    if (assignError) throw assignError;

    // 3. Compute readiness per role
    const roleReadiness = (roles ?? []).map((role) => {
      const activeCount = (assignments ?? []).filter(
        (a) => a.role_code === role.code
      ).length;
      return {
        role_code: role.code,
        display_name: role.display_name,
        model_applicability: role.model_applicability,
        is_core: role.is_core,
        min_required: role.min_required,
        active_count: activeCount,
        is_filled: activeCount >= role.min_required,
      };
    });

    const totalRequired = roleReadiness.length;
    const totalFilled = roleReadiness.filter((r) => r.is_filled).length;
    const missingRoles = roleReadiness.filter((r) => !r.is_filled);
    const overallStatus = missingRoles.length === 0 ? "ready" : "not_ready";

    // 4. Get admin contact
    const { data: adminContact } = await adminClient
      .from("rbac_admin_contact")
      .select("name, email, phone_intl")
      .limit(1)
      .maybeSingle();

    // 5. Get cached readiness for comparison (to detect transitions)
    let cachedQuery = adminClient
      .from("role_readiness_cache")
      .select("overall_status, engagement_model")
      .eq("org_id", org_id);
    if (model) cachedQuery = cachedQuery.eq("engagement_model", model);
    const { data: cached } = await cachedQuery;

    const previousStatus = cached?.[0]?.overall_status ?? null;
    const statusTransition = previousStatus && previousStatus !== overallStatus
      ? { from: previousStatus, to: overallStatus }
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          org_id,
          model: model ?? "all",
          overall_status: overallStatus,
          total_required: totalRequired,
          total_filled: totalFilled,
          missing_roles: missingRoles,
          role_details: roleReadiness,
          responsible_admin_contact: adminContact ?? null,
          status_transition: statusTransition,
          computed_at: new Date().toISOString(),
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
