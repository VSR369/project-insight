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
      { email: "agg-quick-admin@testsetup.dev", displayName: "AGG Quick Admin", roles: ["CR", "CU", "ER", "LC", "FC"] },
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

    // ─── Step 4: Create 3 demo challenges — one per governance mode (all AGG) ───
    const challengeIds: string[] = [];
    const crUser = userIds.find(u => u.roles.includes("CR"));
    const crUserId = crUser?.userId ?? userIds[0]?.userId ?? null;

    // Challenge 1: CONTROLLED + AGG (12 Creator fields filled)
    const controlledId = crypto.randomUUID();
    const { error: c1Err } = await supabaseAdmin.from("challenges").insert({
      id: controlledId, tenant_id: orgId, organization_id: orgId,
      title: "AI-Powered Predictive Maintenance for Smart Manufacturing",
      hook: "Reduce $2.3M annual downtime through IoT-driven failure prediction",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Our manufacturing floor experiences unplanned equipment failures costing $2.3M annually. Current preventive maintenance is time-based, causing both unexpected breakdowns and unnecessary maintenance. We need condition-based predictive maintenance using IoT and ML to forecast failures 48-72 hours in advance.",
      scope: "Integrate with existing SCADA/PLC systems across 12 production lines. Provide real-time dashboard, automated work orders, mobile app. Must reduce unplanned downtime by 40% within 6 months.",
      maturity_level: "PROTOTYPE",
      evaluation_criteria: { weighted_criteria: [{ name: "Technical Approach", weight: 30 },{ name: "Prediction Accuracy", weight: 25 },{ name: "Integration Feasibility", weight: 20 },{ name: "ROI", weight: 15 },{ name: "Team Experience", weight: 10 }]},
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 75000, budget_min: 50000, budget_max: 150000 },
      ip_model: "exclusive_license", phase_schedule: { expected_timeline: "6-12" },
      eligibility: JSON.stringify({ industry_segment_id: techSegmentId, domain_tags: ["manufacturing","IoT","machine-learning"] }),
      extended_brief: { creator_approval_required: true, context_background: "Facility operates 24/7, 12 production lines.", root_causes: ["Reactive maintenance culture","No sensor-to-failure correlation","Siloed data"], affected_stakeholders: [{ role: "Plant Operations", count: 45 },{ role: "Production Planning", count: 12 }], current_deficiencies: ["12% unplanned downtime","No prediction capability","200+ manual inspection hours/month"] },
      creator_snapshot: { title: "AI-Powered Predictive Maintenance for Smart Manufacturing", hook: "Reduce $2.3M annual downtime", problem_statement: "Equipment failures costing $2.3M annually...", scope: "Integrate with SCADA/PLC across 12 lines...", context_background: "Facility operates 24/7...", budget_min: 50000, budget_max: 150000, currency: "USD", expected_timeline: "6-12", ip_model: "exclusive_license" },
      created_by: crUserId,
    });
    if (c1Err) throw new Error(`CONTROLLED challenge: ${c1Err.message}`);
    challengeIds.push(controlledId);
    results.push(`✅ Challenge 1: CONTROLLED+AGG "AI Predictive Maintenance" (Phase 2 — CURATION)`);

    // Challenge 2: STRUCTURED + AGG (8 Creator fields filled)
    const structuredId = crypto.randomUUID();
    const { error: c2Err } = await supabaseAdmin.from("challenges").insert({
      id: structuredId, tenant_id: orgId, organization_id: orgId,
      title: "Healthcare Claims Processing Automation",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Administrative overhead in patient intake and claims processing consumes 35% of staff time. Manual errors cause 12% rejection rate. Need automation for 50% faster processing.",
      scope: "Automate intake forms, claims extraction, coding validation. Integrate with Epic EHR. Target: 50% time reduction, 5% rejection rate.",
      maturity_level: "POC",
      evaluation_criteria: { weighted_criteria: [{ name: "Accuracy", weight: 35 },{ name: "Integration", weight: 25 },{ name: "Scalability", weight: 20 },{ name: "Cost", weight: 20 }]},
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 40000, budget_min: 20000, budget_max: 60000 },
      ip_model: "non_exclusive_license", phase_schedule: { expected_timeline: "3-6" },
      eligibility: JSON.stringify({ industry_segment_id: healthSegmentId, domain_tags: ["healthcare","automation","NLP"] }),
      extended_brief: { creator_approval_required: true },
      creator_snapshot: { title: "Healthcare Claims Processing Automation", problem_statement: "Admin overhead consumes 35% of staff time...", scope: "Automate intake, extraction, validation...", budget_min: 20000, budget_max: 60000, currency: "USD", expected_timeline: "3-6", ip_model: "non_exclusive_license" },
      created_by: crUserId,
    });
    if (c2Err) throw new Error(`STRUCTURED challenge: ${c2Err.message}`);
    challengeIds.push(structuredId);
    results.push(`✅ Challenge 2: STRUCTURED+AGG "Healthcare Claims" (Phase 2 — CURATION)`);

    // Challenge 3: QUICK + AGG (5 Creator fields filled — minimal)
    const quickId = crypto.randomUUID();
    const { error: c3Err } = await supabaseAdmin.from("challenges").insert({
      id: quickId, tenant_id: orgId, organization_id: orgId,
      title: "Supply Chain Visibility Dashboard Prototype",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "We lack real-time visibility into our multi-tier supply chain. Need a dashboard prototype aggregating data from 3 ERP systems with shipment tracking and risk alerts.",
      maturity_level: "concept",
      evaluation_criteria: { weighted_criteria: [{ name: "UX Quality", weight: 40 },{ name: "Feasibility", weight: 30 },{ name: "Speed", weight: 30 }]},
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 15000, budget_min: 5000, budget_max: 20000 },
      phase_schedule: { expected_timeline: "1-3" },
      eligibility: JSON.stringify({ industry_segment_id: techSegmentId, domain_tags: ["supply-chain","dashboard"] }),
      extended_brief: { creator_approval_required: false },
      creator_snapshot: { title: "Supply Chain Visibility Dashboard Prototype", problem_statement: "Lack real-time supply chain visibility...", budget_min: 5000, budget_max: 20000, currency: "USD", expected_timeline: "1-3" },
      created_by: crUserId,
    });
    if (c3Err) throw new Error(`QUICK challenge: ${c3Err.message}`);
    challengeIds.push(quickId);
    results.push(`✅ Challenge 3: QUICK+AGG "Supply Chain Dashboard" (Phase 2 — CURATION)`);

    // ─── Step 5: Assign roles per GOVERNANCE CONVERGENCE RULES ───
    const soloUser = userIds.find(u => u.displayName === "Sam Solo");
    const cuUser = userIds.find(u => u.roles.includes("CU") && !u.roles.includes("CR"));
    const erUser = userIds.find(u => u.roles.includes("ER") && u.displayName !== "Ethan Russell");
    const er2User = userIds.find(u => u.displayName === "Ethan Russell");
    const lcUser = userIds.find(u => u.roles.includes("LC") && !u.roles.includes("CR"));
    const fcUser = userIds.find(u => u.roles.includes("FC") && !u.roles.includes("CR"));

    const assignRole = async (userId: string, challengeId: string, roleCode: string) => {
      const { error } = await supabaseAdmin.from("user_challenge_roles").insert({
        user_id: userId, challenge_id: challengeId, role_code: roleCode, is_active: true, auto_assigned: true,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    };

    // CONTROLLED: strict separation
    if (crUser) await assignRole(crUser.userId, controlledId, "CR");
    if (cuUser) await assignRole(cuUser.userId, controlledId, "CU");
    if (erUser) await assignRole(erUser.userId, controlledId, "ER");
    if (er2User) await assignRole(er2User.userId, controlledId, "ER");
    if (lcUser) await assignRole(lcUser.userId, controlledId, "LC");
    if (fcUser) await assignRole(fcUser.userId, controlledId, "FC");
    results.push(`✅ CONTROLLED: Chris=CR, Casey=CU, Evelyn+Ethan=ER, Leslie=LC, Frank=FC`);

    // STRUCTURED: CR+LC converged, CU+ER converged
    if (crUser) { await assignRole(crUser.userId, structuredId, "CR"); await assignRole(crUser.userId, structuredId, "LC"); }
    if (cuUser) { await assignRole(cuUser.userId, structuredId, "CU"); await assignRole(cuUser.userId, structuredId, "ER"); }
    results.push(`✅ STRUCTURED: Chris=CR+LC, Casey=CU+ER`);

    // QUICK: Sam Solo = all roles
    if (soloUser) { for (const r of ["CR","CU","ER","LC","FC"]) await assignRole(soloUser.userId, quickId, r); }
    results.push(`✅ QUICK: Sam Solo=CR+CU+ER+LC+FC`);

    // ─── Step 5c: Attach legal docs to STRUCTURED + CONTROLLED ───
    const { data: legalTemplates } = await supabaseAdmin
      .from("legal_document_templates").select("template_id, document_code, document_name, tier")
      .eq("is_active", true).eq("version_status", "ACTIVE");

    if (legalTemplates && legalTemplates.length > 0) {
      for (const cId of [controlledId, structuredId]) {
        for (const tmpl of legalTemplates) {
          await supabaseAdmin.from("challenge_legal_docs").insert({
            challenge_id: cId, document_type: tmpl.document_code ?? tmpl.document_name,
            document_name: tmpl.document_name, tier: tmpl.tier ?? "TIER_1",
            status: "pending_review", lc_status: "pending", created_by: crUserId,
          });
        }
      }
      results.push(`✅ Legal docs: ${legalTemplates.length} templates → CONTROLLED + STRUCTURED`);
    } else {
      results.push(`⚠️ No active legal templates — skipping legal attachment`);
    }

    // ─── Step 5b: Pool entries for demo CU/ER/FC users ───
    const poolEntries = [
      { name: "Casey Underwood", email: "nh-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"], role: "CU" },
      { name: "Evelyn Rhodes", email: "nh-er1@testsetup.dev", codes: ["R7_MP", "R7_AGG"], role: "ER" },
      { name: "Frank Coleman", email: "nh-fc@testsetup.dev", codes: ["R8"], role: "FC" },
    ];

    for (const entry of poolEntries) {
      let linkedUserId = userIds.find((u) => u.displayName === entry.name)?.userId ?? null;

      if (!linkedUserId) {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
        const found = authList?.users?.find((u: { email?: string }) => u.email === entry.email);
        linkedUserId = found?.id ?? null;
      }

      const poolData = {
        full_name: entry.name,
        email: entry.email,
        role_codes: entry.codes,
        user_id: linkedUserId,
        domain_scope: {
          industry_segment_ids: [],
          proficiency_area_ids: [],
          sub_domain_ids: [],
          speciality_ids: [],
        },
        max_concurrent: 10,
        current_assignments: 0,
        availability_status: "available",
        is_active: true,
      };

      const { data: existing } = await supabaseAdmin
        .from("platform_provider_pool")
        .select("id")
        .eq("email", entry.email)
        .maybeSingle();

      let poolErr: { message: string } | null = null;
      if (existing) {
        const { error } = await supabaseAdmin
          .from("platform_provider_pool")
          .update({ ...poolData, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        poolErr = error;
      } else {
        const { error } = await supabaseAdmin
          .from("platform_provider_pool")
          .insert(poolData);
        poolErr = error;
      }

      if (poolErr) {
        results.push(`⚠️ Pool: ${entry.name}: ${poolErr.message}`);
      } else {
        results.push(`✅ Pool: ${entry.name} (${entry.codes.join(",")}) user_id=${linkedUserId ? 'linked' : 'UNLINKED'}`);
      }
    }

    results.push("");
    results.push("═══════════════════════════════════════");
    results.push(`🎉 Scenario "${scenario}" setup complete!`);
    results.push(`   Org: ${config.orgName}`);
    results.push(`   Model: ${config.operatingModel} | Governance: ${config.governanceProfile}`);
    results.push(`   CONTROLLED Challenge: ${controlledId}`);
    results.push(`   STRUCTURED Challenge: ${structuredId}`);
    results.push(`   QUICK Challenge: ${quickId}`);
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
