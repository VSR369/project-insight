import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createServiceClient, errorStatus, requireSupervisor } from "../_shared/test-function-auth.ts";
import { ensureCoreTestEnvironment } from "../_shared/test-environment.ts";
import { ensureChallengeFixtures } from "../_shared/test-challenge-fixtures.ts";

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceClient = createServiceClient();
    const supervisorId = await requireSupervisor(request, serviceClient);
    const environment = await ensureCoreTestEnvironment(serviceClient);
    const challenges = await ensureChallengeFixtures(serviceClient, environment, supervisorId);
    return new Response(JSON.stringify({
      success: true,
      data: {
        accountCount: environment.accounts.length,
        organizationCount: environment.organizations.length,
        challengeCount: challenges.length,
        challenges,
        credentialPolicy: "Passwords remain in project secrets and are never returned.",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }), {
      status: errorStatus(error), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
