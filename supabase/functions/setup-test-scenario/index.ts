import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { CPA_TEMPLATES } from "../_shared/legal-seed-content.ts";
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

    for (const org of environment.organizations) {
      for (const template of CPA_TEMPLATES) {
        const { data: existing, error: lookupError } = await serviceClient
          .from("org_legal_document_templates").select("id")
          .eq("organization_id", org.id).eq("document_code", template.document_code).maybeSingle();
        if (lookupError) throw new Error(`Template lookup ${template.document_code}: ${lookupError.message}`);
        if (existing) continue;
        const { error } = await serviceClient.from("org_legal_document_templates").insert({
          organization_id: org.id, tenant_id: org.id,
          document_name: template.document_name, document_code: template.document_code,
          document_type: "challenge_participation_agreement",
          description: `CPA template for ${template.applies_to_mode} governance mode`,
          tier: "TIER_1", template_content: template.template_content,
          version: "1.0", version_status: "ACTIVE", applies_to_mode: template.applies_to_mode,
          is_mandatory: true, is_active: true, effective_date: new Date().toISOString().slice(0, 10),
        });
        if (error) throw new Error(`Template ${template.document_code}: ${error.message}`);
      }
    }

    const assembly: { challengeId: string; success: boolean; message?: string }[] = [];
    for (const challenge of challenges) {
      const org = environment.organizations.find((candidate) => candidate.name === challenge.organisation)!;
      const creator = environment.accountByEmail.get(org.model === "AGG" ? "creator-r4@test.local" : "mp-decision@test.local")!;
      const { error } = await serviceClient.rpc("assemble_cpa", { p_challenge_id: challenge.id, p_user_id: creator.userId });
      assembly.push({ challengeId: challenge.id, success: !error, message: error?.message });
    }

    return new Response(JSON.stringify({ success: true, data: { challenges, cpaAssembly: assembly } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }), {
      status: errorStatus(error), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
