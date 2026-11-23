import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createServiceClient, errorStatus, issueTestSession, requireSupervisor } from "../_shared/test-function-auth.ts";
import { ensureCoreTestEnvironment } from "../_shared/test-environment.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceClient = createServiceClient();
    await requireSupervisor(request, serviceClient);
    const body = await request.json().catch(() => ({})) as { action?: string; email?: string };
    if (body.action === "create_test_session") {
      if (!body.email) return json({ success: false, error: { code: "EMAIL_REQUIRED", message: "Test email is required" } }, 400);
      const session = await issueTestSession(serviceClient, body.email);
      return json({ success: true, data: session });
    }

    const environment = await ensureCoreTestEnvironment(serviceClient);
    return json({
      success: true,
      data: {
        accounts: environment.accounts.map(({ userId, definition }) => ({
          userId, email: definition.email, role: definition.roleLabel, passwordSecret: definition.secretName,
        })),
        organizations: environment.organizations,
      },
    });
  } catch (error) {
    return json({ success: false, error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }, errorStatus(error));
  }
});
