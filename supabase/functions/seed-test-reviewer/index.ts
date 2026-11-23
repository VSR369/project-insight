import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createServiceClient, errorStatus, requireSupervisor } from "../_shared/test-function-auth.ts";
import { ensureTestAccount } from "../_shared/test-environment.ts";

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceClient = createServiceClient();
    const supervisorId = await requireSupervisor(request, serviceClient);
    const account = await ensureTestAccount(serviceClient, "reviewer@test.local");
    const [{ data: industries, error: industryError }, { data: levels, error: levelError }] = await Promise.all([
      serviceClient.from("industry_segments").select("id").eq("is_active", true),
      serviceClient.from("expertise_levels").select("id").eq("is_active", true),
    ]);
    if (industryError || levelError) throw new Error(industryError?.message ?? levelError?.message);
    const { data: reviewer, error } = await serviceClient.from("panel_reviewers").upsert({
      user_id: account.userId,
      email: account.definition.email,
      name: `${account.definition.firstName} ${account.definition.lastName}`,
      is_active: true,
      industry_segment_ids: (industries ?? []).map((row) => row.id),
      expertise_level_ids: (levels ?? []).map((row) => row.id),
      timezone: "UTC",
      max_interviews_per_day: 4,
      enrollment_source: "invitation",
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: supervisorId,
      invitation_status: "ACCEPTED",
      invitation_accepted_at: new Date().toISOString(),
      invitation_channel: "email",
    }, { onConflict: "email" }).select("id, user_id, email, approval_status, invitation_status, is_active").single();
    if (error) throw new Error(`Panel reviewer: ${error.message}`);
    return new Response(JSON.stringify({ success: true, data: { reviewer, role: account.definition.roleLabel } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }), {
      status: errorStatus(error), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
