/**
 * deactivate-delegated-admin Edge Function (EF-SOA-04)
 *
 * Deactivates a delegated seeking org admin:
 * 1. Updates seeking_org_admins.status to 'deactivated'
 * 2. Deactivates the org_users record
 * 3. Logs audit trail
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
    const { admin_id, reason } = await req.json();

    if (!admin_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "admin_id is required" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Get the admin record
    const { data: adminRecord, error: fetchError } = await supabaseAdmin
      .from("seeking_org_admins")
      .select("id, user_id, organization_id, admin_tier, status")
      .eq("id", admin_id)
      .single();

    if (fetchError || !adminRecord) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Admin record not found" } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Prevent deactivating PRIMARY admins
    if (adminRecord.admin_tier === "PRIMARY") {
      return new Response(
        JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Cannot deactivate PRIMARY admin" } }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    // 3. Deactivate seeking_org_admins record
    const { error: deactError } = await supabaseAdmin
      .from("seeking_org_admins")
      .update({ status: "deactivated", updated_at: now })
      .eq("id", admin_id);

    if (deactError) throw new Error(deactError.message);

    // 4. Deactivate org_users record if user exists
    if (adminRecord.user_id) {
      await supabaseAdmin
        .from("org_users")
        .update({ is_active: false })
        .eq("user_id", adminRecord.user_id)
        .eq("organization_id", adminRecord.organization_id);
    }

    return new Response(
      JSON.stringify({ success: true, data: { deactivated_admin_id: admin_id } }),
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
