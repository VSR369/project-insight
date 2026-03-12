/**
 * role-readiness-notify — Dispatches notifications on role readiness transitions.
 * Phase 6: Retry with exponential backoff (TS §15.3), delegated SOA routing (BR-AGG-005),
 * READY auto-notification + pending_challenge_refs resolution (BR-CORE-007).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Insert with exponential backoff retry (up to 3 attempts) */
async function insertWithRetry(
  adminClient: ReturnType<typeof createClient>,
  notifications: Record<string, unknown>[],
  maxAttempts = 3
): Promise<{ count: number; failed: boolean; lastError?: string }> {
  let attempt = 0;
  let lastError = "";

  while (attempt < maxAttempts) {
    attempt++;
    const { error } = await adminClient
      .from("admin_notifications")
      .insert(notifications);

    if (!error) {
      return { count: notifications.length, failed: false };
    }

    lastError = error.message;
    console.error(`Notification insert attempt ${attempt}/${maxAttempts} failed: ${lastError}`);

    if (attempt < maxAttempts) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { count: 0, failed: true, lastError };
}

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

    const { org_id, model, transition_type, challenge_id } = await req.json();

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
    let missingRoleCodes: string[] = [];
    if (transition_type === "not_ready") {
      const { data: cache } = await adminClient
        .from("role_readiness_cache")
        .select("missing_roles")
        .eq("org_id", org_id)
        .eq("engagement_model", model)
        .maybeSingle();

      if (cache?.missing_roles) {
        missingRoleCodes = cache.missing_roles as string[];
        const { data: roles } = await adminClient
          .from("md_slm_role_codes")
          .select("code, display_name")
          .in("code", missingRoleCodes);
        missingRoleNames = (roles ?? []).map((r) => `${r.display_name} (${r.code})`);
      }

      // Create/update pending_challenge_refs for NOT_READY (Phase 1C)
      if (challenge_id && missingRoleCodes.length > 0) {
        const { data: existingRef } = await adminClient
          .from("pending_challenge_refs")
          .select("id")
          .eq("challenge_id", challenge_id)
          .eq("is_resolved", false)
          .limit(1);

        if (existingRef && existingRef.length > 0) {
          await adminClient
            .from("pending_challenge_refs")
            .update({
              missing_role_codes: missingRoleCodes,
              blocking_reason: "Required roles not filled",
              updated_by: user.id,
            })
            .eq("id", existingRef[0].id);
        } else {
          await adminClient
            .from("pending_challenge_refs")
            .insert({
              challenge_id,
              org_id,
              engagement_model: model,
              missing_role_codes: missingRoleCodes,
              blocking_reason: "Required roles not filled",
              created_by: user.id,
            });
        }
      }
    }

    // READY transition: resolve pending_challenge_refs (BR-CORE-007)
    if (transition_type === "ready") {
      await adminClient
        .from("pending_challenge_refs")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("org_id", org_id)
        .eq("is_resolved", false);
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
      // AGG model: notify Primary SOA + in-scope Delegated SOAs (BR-AGG-005)
      const { data: soaAdmins } = await adminClient
        .from("seeking_org_admins")
        .select("user_id, admin_tier, delegated_scope")
        .eq("organization_id", org_id)
        .eq("status", "active")
        .limit(20);

      for (const a of soaAdmins ?? []) {
        if (a.admin_tier === "primary") {
          // Primary SOA always gets notified
          recipients.push({ user_id: a.user_id, admin_type: "soa_primary" });
        } else if (a.admin_tier === "delegated") {
          // Delegated SOAs: include all active delegated for the org
          // Domain scope filtering can be refined when challenge domain data is available
          recipients.push({ user_id: a.user_id, admin_type: "soa_delegated" });
        }
      }
    }

    // READY transition: also notify challenge creator if challenge_id provided (BR-CORE-007)
    if (transition_type === "ready" && challenge_id) {
      const { data: challenge } = await adminClient
        .from("challenges")
        .select("created_by")
        .eq("id", challenge_id)
        .maybeSingle();

      if (challenge?.created_by) {
        const alreadyIncluded = recipients.some((r) => r.user_id === challenge.created_by);
        if (!alreadyIncluded) {
          recipients.push({ user_id: challenge.created_by, admin_type: "challenge_creator" });
        }
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
        challenge_id: challenge_id ?? null,
        org_name: org.organization_name,
      },
    }));

    let notificationCount = 0;
    let retryFailed = false;
    if (notifications.length > 0) {
      const result = await insertWithRetry(adminClient, notifications);
      notificationCount = result.count;
      retryFailed = result.failed;

      // Log failures for observability
      if (retryFailed) {
        console.error(`All retry attempts exhausted for org=${org_id}, model=${model}, transition=${transition_type}. Last error: ${result.lastError}`);
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
          retry_exhausted: retryFailed,
          pending_refs_resolved: transition_type === "ready",
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
