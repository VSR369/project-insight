/**
 * role-readiness-api — Phase 7 (API-18)
 * Formal GET endpoint for CLM consumption of role readiness status.
 * Returns readiness data for a given org + optional model filter.
 */

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
    // Authenticate the caller
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

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    const model = url.searchParams.get("model");

    if (!orgId) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "org_id query parameter is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch readiness cache
    let query = adminClient
      .from("role_readiness_cache")
      .select("id, org_id, engagement_model, overall_status, missing_roles, total_required, total_filled, responsible_admin_contact, last_computed_at")
      .eq("org_id", orgId);

    if (model) {
      query = query.eq("engagement_model", model);
    }

    const { data: readinessData, error: readinessError } = await query;
    if (readinessError) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "QUERY_ERROR", message: readinessError.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!readinessData || readinessData.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve missing role codes to display names
    const allMissingCodes = [...new Set(readinessData.flatMap((r) => r.missing_roles ?? []))];
    let roleMap: Record<string, string> = {};

    if (allMissingCodes.length > 0) {
      const { data: roles } = await adminClient
        .from("md_slm_role_codes")
        .select("code, display_name")
        .in("code", allMissingCodes);
      roleMap = Object.fromEntries((roles ?? []).map((r) => [r.code, r.display_name]));
    }

    // Fetch pending challenge refs for this org
    const { data: pendingRefs } = await adminClient
      .from("pending_challenge_refs")
      .select("id, challenge_id, engagement_model, missing_role_codes, blocking_reason, created_at")
      .eq("org_id", orgId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    // Build enriched response
    const enrichedData = readinessData.map((entry) => ({
      ...entry,
      missing_roles_detail: (entry.missing_roles ?? []).map((code: string) => ({
        code,
        display_name: roleMap[code] ?? code,
      })),
      fill_percentage: entry.total_required > 0
        ? Math.round((entry.total_filled / entry.total_required) * 100)
        : 100,
      blocked_challenges: (pendingRefs ?? [])
        .filter((ref) => ref.engagement_model === entry.engagement_model)
        .map((ref) => ({
          challenge_id: ref.challenge_id,
          blocking_reason: ref.blocking_reason,
          created_at: ref.created_at,
        })),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedData,
        meta: { total: enrichedData.length, org_id: orgId },
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
