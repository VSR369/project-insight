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
  subscriptionTier: string;
  phase1Bypass: boolean;
  isEnterprise: boolean;
  users: { email: string; displayName: string; roles: string[] }[];
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  mp_quick: {
    orgName: "MP Quick Test Org",
    operatingModel: "MP",
    governanceProfile: "QUICK",
    subscriptionTier: "basic",
    phase1Bypass: false,
    isEnterprise: false,
    users: [
      { email: "mp-quick-admin@testsetup.dev", displayName: "MP Quick Admin", roles: ["CR", "CU", "ER", "LC", "FC"] },
    ],
  },
  mp_enterprise_3: {
    orgName: "MP Enterprise Test Org",
    operatingModel: "MP",
    governanceProfile: "CONTROLLED",
    subscriptionTier: "enterprise",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "mp-ent-creator@testsetup.dev", displayName: "MP Ent Creator", roles: ["CR", "CU"] },
      { email: "mp-ent-director@testsetup.dev", displayName: "MP Ent Reviewer", roles: ["CU", "ER"] },
      { email: "mp-ent-ops@testsetup.dev", displayName: "MP Ent Ops", roles: ["LC", "FC"] },
    ],
  },
  agg_enterprise_8: {
    orgName: "AGG Enterprise Test Org",
    operatingModel: "AGG",
    governanceProfile: "CONTROLLED",
    subscriptionTier: "enterprise",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "agg-ent-cr@testsetup.dev", displayName: "AGG Creator", roles: ["CR"] },
      { email: "agg-ent-cu@testsetup.dev", displayName: "AGG Curator", roles: ["CU"] },
      { email: "agg-ent-er1@testsetup.dev", displayName: "AGG Reviewer 1", roles: ["ER"] },
      { email: "agg-ent-er2@testsetup.dev", displayName: "AGG Reviewer 2", roles: ["ER"] },
      { email: "agg-ent-fc@testsetup.dev", displayName: "AGG Finance", roles: ["FC"] },
      { email: "agg-ent-lc@testsetup.dev", displayName: "AGG Legal", roles: ["LC"] },
    ],
  },
  agg_quick_bypass: {
    orgName: "AGG Quick Bypass Org",
    operatingModel: "AGG",
    governanceProfile: "QUICK",
    subscriptionTier: "basic",
    phase1Bypass: true,
    isEnterprise: false,
    users: [
      { email: "agg-quick-admin@testsetup.dev", displayName: "AGG Quick Admin", roles: ["RQ", "CR", "CU", "ID", "ER", "FC"] },
    ],
  },
  new_horizon_demo: {
    orgName: "New Horizon Company",
    operatingModel: "AGG",
    governanceProfile: "CONTROLLED",
    subscriptionTier: "premium",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "nh-cr@testsetup.dev", displayName: "Chris Rivera", roles: ["CR"] },
      { email: "nh-cu@testsetup.dev", displayName: "Casey Underwood", roles: ["CU"] },
      { email: "nh-er1@testsetup.dev", displayName: "Evelyn Rhodes", roles: ["ER"] },
      { email: "nh-er2@testsetup.dev", displayName: "Ethan Russell", roles: ["ER"] },
      { email: "nh-lc@testsetup.dev", displayName: "Leslie Chen", roles: ["LC"] },
      { email: "nh-fc@testsetup.dev", displayName: "Frank Coleman", roles: ["FC"] },
      { email: "nh-solo@testsetup.dev", displayName: "Sam Solo", roles: ["CR", "CU", "ER", "LC", "FC"] },
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

    // ─── Handle sync_operating_model action (fallback for RLS-blocked client updates) ───
    if (body.action === "sync_operating_model") {
      const { orgId, operatingModel } = body;
      if (!orgId || !operatingModel) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "INVALID_PARAMS", message: "orgId and operatingModel required" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error: syncErr } = await supabaseAdmin
        .from("seeker_organizations")
        .update({ operating_model: operatingModel })
        .eq("id", orgId);
      if (syncErr) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "SYNC_FAILED", message: syncErr.message } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, data: { message: `Operating model updated to ${operatingModel}` } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        // Delete dependent rows in correct FK order to avoid constraint violations
        await supabaseAdmin.from("audit_trail").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("sla_timers").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("cogni_notifications").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("challenge_legal_docs").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("challenge_package_versions").delete().in("challenge_id", oldChallengeIds);
        await supabaseAdmin.from("challenge_qa").delete().in("challenge_id", oldChallengeIds);
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
      subscription_tier: config.subscriptionTier,
      phase1_bypass: config.phase1Bypass,
      is_enterprise: config.isEnterprise,
      is_active: true,
      verification_status: "verified",
      registration_step: 5,
    });
    if (orgErr) throw new Error(`Org creation failed: ${orgErr.message}`);
    results.push(`✅ Created org: "${config.orgName}" (${orgId}) — tier: ${config.subscriptionTier}`);

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

    // ─── Step 3: Fetch industry segment IDs for realistic seeding ───
    const { data: segments } = await supabaseAdmin
      .from("industry_segments")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(10);

    const techSegment = segments?.find(s => /technolog/i.test(s.name));
    const healthSegment = segments?.find(s => /health/i.test(s.name));
    const fallbackSegmentId = segments?.[0]?.id ?? null;
    const techSegmentId = techSegment?.id ?? fallbackSegmentId;
    const healthSegmentId = healthSegment?.id ?? fallbackSegmentId;

    if (techSegmentId) {
      results.push(`📌 Industry segments: Tech="${techSegment?.name ?? 'fallback'}", Health="${healthSegment?.name ?? 'fallback'}"`);
    } else {
      results.push(`⚠️ No industry segments found — eligibility will be empty`);
    }

    // ─── Step 4: Create two demo challenges (MP + AGG) ───
    const challengeIds: string[] = [];

    // Helper to find a user by role code
    const findUserByRole = (role: string) => userIds.find(u => u.roles.includes(role));
    const crUser = findUserByRole("CR");
    const cuUser = findUserByRole("CU");

    // Challenge A — MP model (AM-submitted)
    const mpChallengeId = crypto.randomUUID();
    const { error: mpErr } = await supabaseAdmin.from("challenges").insert({
      id: mpChallengeId,
      tenant_id: orgId,
      organization_id: orgId,
      title: "Predictive Maintenance for Smart Manufacturing",
      status: "draft",
      master_status: "IN_PREPARATION",
      current_phase: 2,
      phase_status: "ACTIVE",
      operating_model: "MP",
      governance_profile: config.governanceProfile,
      challenge_model_is_agg: false,
      lc_review_required: config.governanceProfile === "ENTERPRISE",
      is_active: true,
      is_deleted: false,
      is_qa_closed: false,
      solutions_awarded: 0,
      description: "Demo MP challenge — AM intake for CR/CA spec review.",
      problem_statement: "Our manufacturing floor experiences unplanned equipment failures that cost $2.3M annually in downtime. Current preventive maintenance schedules are time-based rather than condition-based, leading to both unexpected breakdowns and unnecessary maintenance on healthy equipment. We need a predictive maintenance solution that uses IoT sensor data and machine learning to forecast equipment failures 48-72 hours in advance.",
      scope: "The solution should: (1) integrate with existing SCADA and PLC systems across 12 production lines, (2) provide a real-time dashboard for maintenance teams, (3) generate automated work orders when failure probability exceeds threshold, (4) reduce unplanned downtime by at least 40% within 6 months of deployment, and (5) include a mobile app for field technicians.",
      reward_structure: { currency: "USD", budget_min: 25000, budget_max: 75000 },
      phase_schedule: { expected_timeline: "3-6" },
      eligibility: JSON.stringify({
        industry_segment_id: techSegmentId,
        domain_tags: ["manufacturing", "IoT", "machine-learning"],
        urgency: "standard",
        constraints: "Must comply with ISO 55000 asset management standards. Solution must run on-premise due to data sovereignty requirements.",
      }),
      extended_brief: {
        am_approval_required: true,
        beneficiaries_mapping: "Primary: Plant Operations Team (45 technicians), Secondary: Production Planning (12 managers), Tertiary: Executive Leadership (quarterly reporting)",
      },
      created_by: crUser?.userId ?? userIds[0]?.userId ?? null,
    });
    if (mpErr) throw new Error(`MP challenge creation failed: ${mpErr.message}`);
    challengeIds.push(mpChallengeId);
    results.push(`✅ Created MP challenge: "Predictive Maintenance for Smart Manufacturing" (Phase 2 — SPEC_REVIEW)`);

    // Challenge B — AGG model (RQ-submitted)
    const aggChallengeId = crypto.randomUUID();
    const { error: aggErr } = await supabaseAdmin.from("challenges").insert({
      id: aggChallengeId,
      tenant_id: orgId,
      organization_id: orgId,
      title: "Healthcare Cost Reduction Through Process Automation",
      status: "draft",
      master_status: "IN_PREPARATION",
      current_phase: 2,
      phase_status: "ACTIVE",
      operating_model: "AGG",
      governance_profile: config.governanceProfile,
      challenge_model_is_agg: true,
      lc_review_required: config.governanceProfile === "ENTERPRISE",
      is_active: true,
      is_deleted: false,
      is_qa_closed: false,
      solutions_awarded: 0,
      description: "Demo AGG challenge — RQ intake for CR/CA spec review.",
      problem_statement: "Administrative overhead in our patient intake and claims processing workflows consumes 35% of staff time. Manual data entry errors result in a 12% claims rejection rate, and average processing time is 14 business days. We believe automation and AI-assisted document processing could significantly reduce costs and improve accuracy, but we need expert guidance on the best approach.",
      scope: null,
      reward_structure: {},
      phase_schedule: { expected_timeline: "6-12" },
      eligibility: JSON.stringify({
        industry_segment_id: healthSegmentId,
        domain_tags: ["healthcare", "process-automation", "AI"],
        urgency: "standard",
      }),
      extended_brief: {
        beneficiaries_mapping: "Primary: Revenue Cycle Management team (28 staff), Secondary: Clinical Administration (15 coordinators), Tertiary: Patients (reduced wait times and billing errors)",
        am_approval_required: false,
      },
      created_by: crUser?.userId ?? userIds[0]?.userId ?? null,
    });
    if (aggErr) throw new Error(`AGG challenge creation failed: ${aggErr.message}`);
    challengeIds.push(aggChallengeId);
    results.push(`✅ Created AGG challenge: "Healthcare Cost Reduction Through Process Automation" (Phase 2 — SPEC_REVIEW)`);

    // ─── Step 5: Assign user_challenge_roles per-challenge (model-aware) ───
    // MP roles (AM, CA) → MP challenge only; AGG roles (RQ, CR) → AGG challenge only
    // Shared roles (CU, ID, ER, LC, FC) → both challenges
    // All modern roles are shared across both challenges
    const SHARED_ROLES = new Set(["CR", "CU", "ER", "LC", "FC"]);

    for (const u of userIds) {
      for (const roleCode of u.roles) {
        const targetChallengeIds: string[] = [];

        // All modern roles are assigned to both challenges
        targetChallengeIds.push(mpChallengeId, aggChallengeId);

        for (const cId of targetChallengeIds) {
          const { error: ucrErr } = await supabaseAdmin.from("user_challenge_roles").insert({
            user_id: u.userId,
            challenge_id: cId,
            role_code: roleCode,
            is_active: true,
            auto_assigned: false,
          });
          if (ucrErr) throw new Error(`user_challenge_roles insert failed for ${u.displayName}/${roleCode}: ${ucrErr.message}`);
        }
      }
      results.push(`✅ Assigned challenge roles for ${u.displayName}: ${u.roles.join(", ")} (model-aware)`);
    }

    results.push("");
    results.push("═══════════════════════════════════════");
    results.push(`🎉 Scenario "${scenario}" setup complete!`);
    results.push(`   Org: ${config.orgName}`);
    results.push(`   Model: ${config.operatingModel} | Governance: ${config.governanceProfile}`);
    results.push(`   MP Challenge: ${mpChallengeId}`);
    results.push(`   AGG Challenge: ${aggChallengeId}`);
    if (config.phase1Bypass) results.push("   ⚡ Phase 1 bypass enabled");
    results.push("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ success: true, data: { results, credentials, orgId, orgName: config.orgName, challengeIds } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
