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
    const { departing_admin_id, trigger } = await req.json();

    if (!departing_admin_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing departing_admin_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Call bulk_reassign_admin RPC
    const { data: result, error: rpcErr } = await supabase.rpc("bulk_reassign_admin", {
      p_departing_admin_id: departing_admin_id,
      p_trigger: trigger ?? "LEAVE",
    });

    if (rpcErr) {
      console.error("bulk_reassign_admin RPC error:", rpcErr);
      return new Response(
        JSON.stringify({ success: false, error: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bulkResult = result as {
      success: boolean;
      total: number;
      assigned: number;
      queued: number;
      results: Array<{ verification_id: string; outcome: string }>;
    };

    if (!bulkResult.success) {
      return new Response(
        JSON.stringify(bulkResult),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get departing admin info
    const { data: departingAdmin } = await supabase
      .from("platform_admin_profiles")
      .select("id, full_name")
      .eq("id", departing_admin_id)
      .single();

    // BR-MPA-044: Notify departing admin with batch summary
    if (bulkResult.total > 0 && departingAdmin) {
      await supabase.from("admin_notifications").insert({
        admin_id: departingAdmin.id,
        type: "REASSIGNMENT_OUT",
        title: "Verifications Reassigned",
        body: `${bulkResult.total} verification(s) were reassigned: ${bulkResult.assigned} to admins, ${bulkResult.queued} to open queue.`,
        deep_link: "/admin/verifications",
        metadata: { trigger, total: bulkResult.total, assigned: bulkResult.assigned, queued: bulkResult.queued },
      });
    }

    // Notify supervisors if any went to queue
    if (bulkResult.queued > 0) {
      const { data: supervisors } = await supabase
        .from("platform_admin_profiles")
        .select("id")
        .eq("admin_tier", "supervisor");

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map((sup) => ({
          admin_id: sup.id,
          type: "QUEUE_ESCALATION",
          title: "Bulk Reassignment — Queue Entries",
          body: `${bulkResult.queued} verification(s) from ${departingAdmin?.full_name ?? "departing admin"} could not be auto-assigned and were placed in the Open Queue.`,
          deep_link: "/admin/verifications",
          metadata: { trigger, departing_admin_id, queued: bulkResult.queued },
        }));
        await supabase.from("admin_notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: bulkResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("bulk-reassign error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
