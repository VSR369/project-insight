import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { OrgModel } from "./test-account-catalog.ts";
import type { TestEnvironment, ResolvedAccount, ResolvedOrg } from "./test-environment.ts";

interface ChallengeFixture {
  id: string;
  model: OrgModel;
  targetPhase: number;
  title: string;
}

const FIXTURES: readonly ChallengeFixture[] = [
  { id: "20000000-0000-4000-8000-000000000001", model: "AGG", targetPhase: 1, title: "CogniTest Aggregator Draft Challenge" },
  { id: "20000000-0000-4000-8000-000000000002", model: "AGG", targetPhase: 2, title: "CogniTest Aggregator Curation Challenge" },
  { id: "20000000-0000-4000-8000-000000000003", model: "AGG", targetPhase: 3, title: "CogniTest Aggregator Compliance Challenge" },
  { id: "20000000-0000-4000-8000-000000000004", model: "MP", targetPhase: 1, title: "CogniTest Marketplace Draft Challenge" },
  { id: "20000000-0000-4000-8000-000000000005", model: "MP", targetPhase: 2, title: "CogniTest Marketplace Curation Challenge" },
  { id: "20000000-0000-4000-8000-000000000006", model: "MP", targetPhase: 3, title: "CogniTest Marketplace Compliance Challenge" },
];

async function assignChallengeRole(
  serviceClient: SupabaseClient,
  challengeId: string,
  account: ResolvedAccount,
  roleCode: string,
  assignedBy: string,
): Promise<void> {
  const { data: existing, error: lookupError } = await serviceClient
    .from("user_challenge_roles").select("user_id")
    .eq("challenge_id", challengeId).eq("user_id", account.userId).eq("role_code", roleCode).maybeSingle();
  if (lookupError) throw new Error(`Challenge role lookup ${roleCode}: ${lookupError.message}`);
  if (existing) return;
  const { error } = await serviceClient.rpc("assign_role_to_challenge", {
    p_user_id: account.userId,
    p_challenge_id: challengeId,
    p_role_code: roleCode,
    p_assigned_by: assignedBy,
  });
  if (error) throw new Error(`Assign ${roleCode} to ${account.definition.email}: ${error.message}`);
}

export async function ensureChallengeFixtures(
  serviceClient: SupabaseClient,
  environment: TestEnvironment,
  supervisorId: string,
) {
  const { data: segment, error: segmentError } = await serviceClient
    .from("industry_segments").select("id").eq("is_active", true).order("display_order").limit(1).single();
  if (segmentError) throw new Error(`Industry segment: ${segmentError.message}`);
  const results: { id: string; title: string; organisation: string; currentPhase: number }[] = [];

  for (const fixture of FIXTURES) {
    const org = environment.orgByModel.get(fixture.model) as ResolvedOrg;
    const creator = environment.accountByEmail.get(fixture.model === "AGG" ? "creator-r4@test.local" : "mp-decision@test.local")!;
    const curator = environment.accountByEmail.get("curator@test.local")!;
    const legal = environment.accountByEmail.get("legal@test.local")!;
    const finance = environment.accountByEmail.get("finance@test.local")!;
    const expert = environment.accountByEmail.get("expert@test.local")!;
    const decision = environment.accountByEmail.get(fixture.model === "AGG" ? "agg-decision@test.local" : "mp-decision@test.local")!;

    const { data: existing, error: existingError } = await serviceClient
      .from("challenges").select("id").eq("id", fixture.id).maybeSingle();
    if (existingError) throw new Error(`Challenge lookup ${fixture.title}: ${existingError.message}`);
    if (!existing) {
      const { error } = await serviceClient.from("challenges").insert({
        id: fixture.id, tenant_id: org.id, organization_id: org.id, title: fixture.title,
        hook: "Signed-in integration fixture",
        problem_statement: "A controlled test problem used to verify signed-in role behaviour without affecting production data.",
        scope: "Test scope for role, lifecycle, legal, finance, review, and provider verification.",
        deliverables: ["Test solution"],
        evaluation_method: "SINGLE", evaluation_criteria: { weighted_criteria: [{ name: "Quality", weight: 100 }] },
        operating_model: fixture.model, governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
        challenge_model_is_agg: fixture.model === "AGG", visibility: "public", challenge_visibility: "public",
        maturity_level: "PROTOTYPE", ip_model: "IP-NEL", currency_code: "USD", reward_structure: {},
        current_phase: 1, phase_status: "ACTIVE", status: "draft", master_status: "IN_PREPARATION", is_active: true, is_deleted: false,
        industry_segment_id: segment.id, created_by: creator.userId,
      });
      if (error) throw new Error(`Create ${fixture.title}: ${error.message}`);
    }

    for (const [account, role] of [
      [creator, "CR"], [curator, "CU"], [legal, "LC"], [finance, "FC"], [expert, "ER"], [decision, "AM"],
    ] as const) await assignChallengeRole(serviceClient, fixture.id, account, role, supervisorId);

    let { data: challenge, error: phaseLookupError } = await serviceClient
      .from("challenges").select("current_phase").eq("id", fixture.id).single();
    if (phaseLookupError) throw new Error(`Phase lookup ${fixture.title}: ${phaseLookupError.message}`);
    while (challenge.current_phase < fixture.targetPhase) {
      const actor = challenge.current_phase === 1 ? creator : curator;
      const { error } = await serviceClient.rpc("complete_phase", {
        p_challenge_id: fixture.id,
        p_user_id: actor.userId,
      });
      if (error) throw new Error(`Advance ${fixture.title} from phase ${challenge.current_phase}: ${error.message}`);
      const { data: advanced, error: advancedError } = await serviceClient
        .from("challenges").select("current_phase").eq("id", fixture.id).single();
      if (advancedError) throw new Error(`Phase verification ${fixture.title}: ${advancedError.message}`);
      challenge = advanced;
    }
    results.push({ id: fixture.id, title: fixture.title, organisation: org.name, currentPhase: challenge.current_phase });
  }
  return results;
}
