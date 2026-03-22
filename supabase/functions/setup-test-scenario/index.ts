import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_PASSWORD = "TestSetup2026!";

interface ScenarioConfig {
  orgName: string;
  operatingModel: string;
  governanceProfile: string;
  phase1Bypass: boolean;
  isEnterprise: boolean;
  users: { email: string; displayName: string; roles: string[] }[];
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  mp_lightweight: {
    orgName: "MP Light Test Org",
    operatingModel: "MP",
    governanceProfile: "LIGHTWEIGHT",
    phase1Bypass: false,
    isEnterprise: false,
    users: [
      { email: "mp-light-admin@testsetup.dev", displayName: "MP Light Admin", roles: ["AM", "CR", "CU", "ID", "ER", "FC"] },
    ],
  },
  mp_enterprise_3: {
    orgName: "MP Enterprise Test Org",
    operatingModel: "MP",
    governanceProfile: "ENTERPRISE",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "mp-ent-creator@testsetup.dev", displayName: "MP Ent Creator", roles: ["CR", "CU"] },
      { email: "mp-ent-director@testsetup.dev", displayName: "MP Ent Director", roles: ["ID", "ER"] },
      { email: "mp-ent-ops@testsetup.dev", displayName: "MP Ent Ops", roles: ["AM", "FC"] },
    ],
  },
  agg_enterprise_8: {
    orgName: "AGG Enterprise Test Org",
    operatingModel: "AGG",
    governanceProfile: "ENTERPRISE",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "agg-ent-rq@testsetup.dev", displayName: "AGG Requestor", roles: ["RQ"] },
      { email: "agg-ent-cr@testsetup.dev", displayName: "AGG Creator", roles: ["CR"] },
      { email: "agg-ent-cu@testsetup.dev", displayName: "AGG Curator", roles: ["CU"] },
      { email: "agg-ent-id@testsetup.dev", displayName: "AGG Innov Director", roles: ["ID"] },
      { email: "agg-ent-er1@testsetup.dev", displayName: "AGG Reviewer 1", roles: ["ER"] },
      { email: "agg-ent-er2@testsetup.dev", displayName: "AGG Reviewer 2", roles: ["ER"] },
      { email: "agg-ent-fc@testsetup.dev", displayName: "AGG Finance", roles: ["FC"] },
      { email: "agg-ent-lc@testsetup.dev", displayName: "AGG Legal", roles: ["LC"] },
    ],
  },
  agg_lightweight_bypass: {
    orgName: "AGG Light Bypass Org",
    operatingModel: "AGG",
    governanceProfile: "LIGHTWEIGHT",
    phase1Bypass: true,
    isEnterprise: false,
    users: [
      { email: "agg-light-admin@testsetup.dev", displayName: "AGG Light Admin", roles: ["RQ", "CR", "CU", "ID", "ER", "FC"] },
    ],
  },
  new_horizon_demo: {
    orgName: "New Horizon Company",
    operatingModel: "AGG",
    governanceProfile: "ENTERPRISE",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "nh-rq@testsetup.dev", displayName: "Alex Morgan", roles: ["RQ"] },
      { email: "nh-am@testsetup.dev", displayName: "Alex Morgan", roles: ["AM"] },
      { email: "nh-cr@testsetup.dev", displayName: "Chris Rivera", roles: ["CR"] },
      { email: "nh-cu@testsetup.dev", displayName: "Casey Underwood", roles: ["CU"] },
      { email: "nh-id@testsetup.dev", displayName: "Dana Irving", roles: ["ID"] },
      { email: "nh-er1@testsetup.dev", displayName: "Evelyn Rhodes", roles: ["ER"] },
      { email: "nh-er2@testsetup.dev", displayName: "Ethan Russell", roles: ["ER"] },
      { email: "nh-lc@testsetup.dev", displayName: "Leslie Chen", roles: ["LC"] },
      { email: "nh-fc@testsetup.dev", displayName: "Frank Coleman", roles: ["FC"] },
      { email: "nh-solo@testsetup.dev", displayName: "Sam Solo", roles: ["AM", "RQ", "CR", "CU", "ID", "ER", "FC"] },
    ],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const scenario = body.scenario as string;

    if (!scenario || !SCENARIOS[scenario]) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}. Valid: ${Object.keys(SCENARIOS).join(", ")}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = SCENARIOS[scenario];
    const results: string[] = [];
    const credentials: { email: string; password: string; roles: string[] }[] = [];

    // ─── Step 0: Robust cleanup of ALL previous runs for this scenario ───
    // Collect all scenario user emails for orphan cleanup
    const scenarioEmails = config.users.map(u => u.email);

    // Resolve auth user IDs for all scenario emails
    const { data: allAuthUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const scenarioUserIds = (allAuthUsers?.users ?? [])
      .filter(u => u.email && scenarioEmails.includes(u.email))
      .map(u => u.id);

    // 0a. Delete orphaned org_users for scenario users (any org, handles partial runs)
    if (scenarioUserIds.length > 0) {
      await supabaseAdmin.from("org_users").delete().in("user_id", scenarioUserIds);
      // Also clean up user_roles for these users
      await supabaseAdmin.from("user_roles").delete().in("user_id", scenarioUserIds);
      // Clean up user_challenge_roles for these users
      await supabaseAdmin.from("user_challenge_roles").delete().in("user_id", scenarioUserIds);
      results.push(`🧹 Cleaned orphaned records for ${scenarioUserIds.length} scenario user(s)`);
    }

    // 0b. Find and delete old orgs with the same name
    const { data: oldOrgs } = await supabaseAdmin
      .from("seeker_organizations")
      .select("id")
      .eq("organization_name", config.orgName);

    if (oldOrgs && oldOrgs.length > 0) {
      const oldOrgIds = oldOrgs.map((o: { id: string }) => o.id);

      // Delete challenges (and their user_challenge_roles) for these orgs
      const { data: oldChallenges } = await supabaseAdmin
        .from("challenges")
        .select("id")
        .in("organization_id", oldOrgIds);

      if (oldChallenges && oldChallenges.length > 0) {
        const oldChallengeIds = oldChallenges.map((c: { id: string }) => c.id);
        await supabaseAdmin.from("user_challenge_roles").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("challenges").delete().in("id", oldChallengeIds);
      }

      // Delete any remaining org_users for these orgs (non-scenario users)
      await supabaseAdmin.from("org_users").delete().in("organization_id", oldOrgIds);

      // Delete the orgs themselves
      await supabaseAdmin.from("seeker_organizations").delete().in("id", oldOrgIds);

      results.push(`🧹 Cleaned up ${oldOrgs.length} previous "${config.orgName}" org(s)`);
    }

    // ─── Step 1: Create org (self-referencing tenant_id) ───
    const orgId = crypto.randomUUID();
    const { error: orgErr } = await supabaseAdmin.from("seeker_organizations").insert({
      id: orgId,
      tenant_id: orgId,
      organization_name: config.orgName,
      legal_entity_name: config.orgName,
      operating_model: config.operatingModel,
      governance_profile: config.governanceProfile,
      phase1_bypass: config.phase1Bypass,
      is_enterprise: config.isEnterprise,
      is_active: true,
      verification_status: "verified",
      registration_step: 5,
    });
    if (orgErr) throw new Error(`Org creation failed: ${orgErr.message}`);
    results.push(`✅ Created org: "${config.orgName}" (${orgId})`);

    // ─── Step 2: Create users + link to org ───
    const userIds: { userId: string; roles: string[]; displayName: string }[] = [];

    for (const userDef of config.users) {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const existing = existingUsers?.users?.find(u => u.email === userDef.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: TEST_PASSWORD });
        results.push(`🔄 Reset existing user: ${userDef.email}`);
      } else {
        const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
          email: userDef.email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: { full_name: userDef.displayName },
        });
        if (userErr) throw new Error(`User creation failed for ${userDef.email}: ${userErr.message}`);
        userId = newUser.user.id;
        results.push(`✅ Created user: ${userDef.email}`);
      }

      userIds.push({ userId, roles: userDef.roles, displayName: userDef.displayName });

      // ── Insert org_users (link user to org) ──
      // Delete any stale org_users for this user first
      await supabaseAdmin.from("org_users").delete().eq("user_id", userId);
      const { error: orgUserErr } = await supabaseAdmin.from("org_users").insert({
        tenant_id: orgId,
        user_id: userId,
        organization_id: orgId,
        role: "member",
        is_active: true,
        invitation_status: "active",
      });
      if (orgUserErr) throw new Error(`org_users insert failed for ${userDef.email}: ${orgUserErr.message}`);

      // ── Insert user_roles (seeker role) ──
      // Delete old seeker roles for this user, then insert
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "seeker");
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "seeker",
        tenant_id: orgId,
      });
      if (roleErr) throw new Error(`user_roles insert failed for ${userDef.email}: ${roleErr.message}`);

      // ── Update profile with first/last name ──
      const nameParts = userDef.displayName.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";
      await supabaseAdmin.from("profiles").update({
        first_name: firstName,
        last_name: lastName,
      }).eq("user_id", userId);

      credentials.push({
        email: userDef.email,
        password: TEST_PASSWORD,
        roles: userDef.roles,
      });

      results.push(`   ✅ Linked to org + seeker role + profile updated`);
      results.push(`   Roles: ${userDef.roles.join(", ")}`);
    }

    // ─── Step 3: Create a demo challenge ───
    const challengeId = crypto.randomUUID();
    const isAgg = config.operatingModel === "AGG";
    const { error: challengeErr } = await supabaseAdmin.from("challenges").insert({
      id: challengeId,
      tenant_id: orgId,
      organization_id: orgId,
      title: `${config.orgName} — Demo Challenge`,
      status: "draft",
      master_status: "IN_PREPARATION",
      current_phase: 1,
      operating_model: config.operatingModel,
      governance_profile: config.governanceProfile,
      challenge_model_is_agg: isAgg,
      lc_review_required: config.governanceProfile === "ENTERPRISE",
      is_active: true,
      is_deleted: false,
      is_qa_closed: false,
      solutions_awarded: 0,
      description: "This is a demo challenge created by the test scenario setup.",
    });
    if (challengeErr) throw new Error(`Challenge creation failed: ${challengeErr.message}`);
    results.push(`✅ Created demo challenge: "${config.orgName} — Demo Challenge"`);

    // ─── Step 4: Assign user_challenge_roles ───
    for (const u of userIds) {
      for (const roleCode of u.roles) {
        const { error: ucrErr } = await supabaseAdmin.from("user_challenge_roles").insert({
          user_id: u.userId,
          challenge_id: challengeId,
          role_code: roleCode,
          is_active: true,
          auto_assigned: false,
        });
        if (ucrErr) throw new Error(`user_challenge_roles insert failed for ${u.displayName}/${roleCode}: ${ucrErr.message}`);
      }
      results.push(`✅ Assigned challenge roles for ${u.displayName}: ${u.roles.join(", ")}`);
    }

    results.push("");
    results.push("═══════════════════════════════════════");
    results.push(`🎉 Scenario "${scenario}" setup complete!`);
    results.push(`   Org: ${config.orgName}`);
    results.push(`   Model: ${config.operatingModel} | Governance: ${config.governanceProfile}`);
    results.push(`   Demo Challenge: ${challengeId}`);
    if (config.phase1Bypass) results.push("   ⚡ Phase 1 bypass enabled");
    results.push("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ success: true, data: { results, credentials, orgId, orgName: config.orgName, challengeId } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
