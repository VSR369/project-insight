/**
 * expire-stale-invitations — Edge Function (BR-RL-009)
 * Auto-expires role invitations and delegated admin invitations older than 7 days.
 * Scheduled via pg_cron daily job.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use service_role key for privileged operation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Expire stale delegated admin invitations (seeking_org_admins)
    const { data: expiredAdmins, error: adminError } = await supabaseAdmin
      .from("seeking_org_admins")
      .update({ status: "expired", updated_at: now })
      .eq("status", "pending_activation")
      .eq("admin_tier", "DELEGATED")
      .lt("created_at", sevenDaysAgo)
      .select("id, email, organization_id");

    if (adminError) {
      console.error("Failed to expire delegated admin invitations:", adminError.message);
    }

    // 2. Expire stale activation links
    const { error: linkError } = await supabaseAdmin
      .from("admin_activation_links")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", now);

    if (linkError) {
      console.error("Failed to expire activation links:", linkError.message);
    }

    // 3. Expire stale role_assignments (status = 'invited', invited_at > 7 days)
    const { data: expiredRoles, error: roleError } = await supabaseAdmin
      .from("role_assignments")
      .update({ status: "expired", updated_at: now })
      .eq("status", "invited")
      .lt("invited_at", sevenDaysAgo)
      .select("id, org_id, role_code, user_email");

    if (roleError) {
      console.error("Failed to expire stale role assignments:", roleError.message);
    }

    const expiredRoleCount = expiredRoles?.length ?? 0;

    // 4. Log results
    const expiredCount = expiredAdmins?.length ?? 0;
    console.log(`Expired ${expiredCount} stale delegated admin invitation(s)`);
    console.log(`Expired ${expiredRoleCount} stale role assignment invitation(s)`);

    // 4. Write audit records for expired admins
    if (expiredAdmins && expiredAdmins.length > 0) {
      for (const admin of expiredAdmins) {
        await supabaseAdmin.from("org_state_audit_log").insert({
          organization_id: admin.organization_id,
          previous_status: "pending_activation",
          new_status: "expired",
          change_reason: `Delegated admin invitation expired after 7 days: ${admin.email}`,
          metadata: { admin_id: admin.id, action: "invitation_auto_expired" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          expired_admin_invitations: expiredCount,
          expired_role_assignments: expiredRoleCount,
          timestamp: now,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("expire-stale-invitations error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
