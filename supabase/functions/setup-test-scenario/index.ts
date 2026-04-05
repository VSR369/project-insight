import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEST_PASSWORD = "TestSetup2026!";

interface UserDef { email: string; displayName: string; roles: string[] }
interface ScenarioConfig {
  orgName: string; operatingModel: string; governanceProfile: string;
  subscriptionTier: string; phase1Bypass: boolean; isEnterprise: boolean;
  users: UserDef[];
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  new_horizon_demo: {
    orgName: "Tech Mahindra Limited",
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
      { email: "nh-mp-cr@testsetup.dev", displayName: "Maria Chen", roles: ["CR"] },
      { email: "nh-pp-cu@testsetup.dev", displayName: "Paul Curtis", roles: ["CU"] },
      { email: "nh-pp-lc@testsetup.dev", displayName: "Patricia Lee", roles: ["LC"] },
      { email: "nh-pp-fc@testsetup.dev", displayName: "Peter Ford", roles: ["FC"] },
      { email: "nh-solo@testsetup.dev", displayName: "Sam Solo", roles: ["CR", "CU", "ER", "LC", "FC"] },
    ],
  },
};

// deno-lint-ignore no-explicit-any
type SA = any; // supabaseAdmin shorthand

async function cleanupScenario(sa: SA, config: ScenarioConfig, results: string[]) {
  const scenarioEmails = config.users.map(u => u.email);
  const { data: allAuthUsers } = await sa.auth.admin.listUsers({ perPage: 1000 });
  const scenarioUserIds = (allAuthUsers?.users ?? [])
    .filter((u: { email?: string }) => u.email && scenarioEmails.includes(u.email!))
    .map((u: { id: string }) => u.id);

  if (scenarioUserIds.length > 0) {
    await sa.from("org_users").delete().in("user_id", scenarioUserIds);
    await sa.from("user_roles").delete().in("user_id", scenarioUserIds);
    await sa.from("user_challenge_roles").delete().in("user_id", scenarioUserIds);
    results.push(`🧹 Cleaned orphaned records for ${scenarioUserIds.length} scenario user(s)`);
  }

  const { data: oldOrgs } = await sa.from("seeker_organizations").select("id").eq("organization_name", config.orgName);
  if (oldOrgs && oldOrgs.length > 0) {
    const oldOrgIds = oldOrgs.map((o: { id: string }) => o.id);
    const { data: oldChallenges } = await sa.from("challenges").select("id").in("organization_id", oldOrgIds);
    if (oldChallenges && oldChallenges.length > 0) {
      const ids = oldChallenges.map((c: { id: string }) => c.id);
      const childTables = [
        "audit_trail", "sla_timers", "cogni_notifications", "challenge_legal_docs",
        "challenge_package_versions", "challenge_qa", "user_challenge_roles",
        "challenge_prize_tiers", "challenge_section_approvals", "challenge_incentive_selections",
        "challenge_context_digest", "challenge_role_assignments", "challenge_attachments",
        "escrow_records", "curation_progress", "curation_quality_metrics",
        "communication_log", "amendment_records", "challenge_submissions",
      ];
      for (const t of childTables) {
        await sa.from(t).delete().in("challenge_id", ids);
      }
      await sa.from("challenges").delete().in("id", ids);
    }
    await sa.from("org_users").delete().in("organization_id", oldOrgIds);
    await sa.from("seeker_organizations").delete().in("id", oldOrgIds);
    results.push(`🧹 Cleaned up ${oldOrgs.length} previous "${config.orgName}" org(s)`);
  }
}

interface ResolvedUser { userId: string; roles: string[]; displayName: string; email: string }

async function createUsers(
  sa: SA, config: ScenarioConfig, orgId: string, results: string[],
  credentials: { email: string; password: string; roles: string[] }[]
): Promise<ResolvedUser[]> {
  // Fetch all auth users ONCE
  const { data: allAuthData } = await sa.auth.admin.listUsers({ perPage: 1000 });
  const allAuthUsers = allAuthData?.users ?? [];

  // Create/reset all auth users in parallel
  const userPromises = config.users.map(async (u): Promise<ResolvedUser> => {
    const existing = allAuthUsers.find((x: { email?: string }) => x.email === u.email);
    let userId: string;
    if (existing) {
      userId = existing.id;
      await sa.auth.admin.updateUserById(userId, { password: TEST_PASSWORD });
    } else {
      const { data: nu, error } = await sa.auth.admin.createUser({
        email: u.email, password: TEST_PASSWORD, email_confirm: true,
        user_metadata: { full_name: u.displayName },
      });
      if (error) throw new Error(`User create failed ${u.email}: ${error.message}`);
      userId = nu.user.id;
    }
    return { userId, roles: u.roles, displayName: u.displayName, email: u.email };
  });
  const resolved = await Promise.all(userPromises);
  results.push(`✅ Created/reset ${resolved.length} users`);

  // Link all users to org in parallel
  await Promise.all(resolved.map(async (r, i) => {
    const u = config.users[i];
    await sa.from("org_users").delete().eq("user_id", r.userId);
    await sa.from("org_users").insert({
      tenant_id: orgId, user_id: r.userId, organization_id: orgId,
      role: "member", is_active: true, invitation_status: "active",
    });
    await sa.from("user_roles").delete().eq("user_id", r.userId).eq("role", "seeker");
    await sa.from("user_roles").insert({ user_id: r.userId, role: "seeker", tenant_id: orgId });
    const [first, ...rest] = u.displayName.split(" ");
    await sa.from("profiles").update({ first_name: first, last_name: rest.join(" ") || "" }).eq("user_id", r.userId);
    credentials.push({ email: u.email, password: TEST_PASSWORD, roles: u.roles });
  }));
  results.push(`✅ Linked all users to org + roles + profiles`);
  return resolved;
}

function findUser(users: ResolvedUser[], name: string) {
  return users.find(u => u.displayName === name);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const body = await req.json();

    // ─── sync_operating_model action ───
    if (body.action === "sync_operating_model") {
      const { orgId, operatingModel } = body;
      if (!orgId || !operatingModel) {
        return new Response(JSON.stringify({ success: false, error: { code: "INVALID_PARAMS", message: "orgId and operatingModel required" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await sa.from("seeker_organizations").update({ operating_model: operatingModel }).eq("id", orgId);
      if (error) return new Response(JSON.stringify({ success: false, error: { code: "SYNC_FAILED", message: error.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, data: { message: `Operating model updated to ${operatingModel}` } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scenario = body.scenario as string;
    if (!scenario || !SCENARIOS[scenario]) {
      return new Response(JSON.stringify({ success: false, error: { code: "INVALID_SCENARIO", message: `Unknown scenario: ${scenario}. Valid: ${Object.keys(SCENARIOS).join(", ")}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const config = SCENARIOS[scenario];
    const results: string[] = [];
    const credentials: { email: string; password: string; roles: string[] }[] = [];

    // ─── Step 0: Cleanup ───
    await cleanupScenario(sa, config, results);

    // ─── Step 1: Create org ───
    const { data: indiaRow } = await sa.from("countries").select("id").eq("code", "IN").maybeSingle();
    const orgId = crypto.randomUUID();
    const { error: orgErr } = await sa.from("seeker_organizations").insert({
      id: orgId, tenant_id: orgId, organization_name: config.orgName,
      trade_brand_name: "Tech Mahindra", legal_entity_name: "Tech Mahindra Limited",
      tagline: "Connected World. Connected Experiences.",
      organization_description: "Tech Mahindra is a leading provider of digital transformation, consulting, and business re-engineering services and solutions.",
      website_url: "https://www.techmahindra.com", linkedin_url: "https://www.linkedin.com/company/tech-mahindra",
      logo_url: "https://www.techmahindra.com/themes/custom/starter/logo.svg",
      founding_year: 1986, employee_count_range: "100000+", annual_revenue_range: "$5B-$10B",
      hq_city: "Pune", hq_country_id: indiaRow?.id ?? null, hq_postal_code: "411013",
      preferred_currency: "USD", timezone: "Asia/Kolkata",
      operating_model: config.operatingModel, governance_profile: config.governanceProfile,
      subscription_tier: config.subscriptionTier, phase1_bypass: config.phase1Bypass,
      is_enterprise: config.isEnterprise, is_active: true, verification_status: "verified", registration_step: 5,
    });
    if (orgErr) throw new Error(`Org creation failed: ${orgErr.message}`);
    results.push(`✅ Created org: "${config.orgName}" (${orgId})`);

    // ─── Step 2: Create users ───
    const users = await createUsers(sa, config, orgId, results, credentials);

    // ─── Step 3: Lookup industry segments ───
    const { data: segments } = await sa.from("industry_segments").select("id, name").eq("is_active", true).order("display_order").limit(20);
    const seg = (pattern: RegExp) => segments?.find((s: { name: string }) => pattern.test(s.name))?.id ?? segments?.[0]?.id ?? null;
    const techId = seg(/technolog/i);
    const healthId = seg(/health/i);
    const financeId = seg(/financ/i);
    const energyId = seg(/energy/i);
    results.push(`📌 Segments: tech=${!!techId}, health=${!!healthId}, finance=${!!financeId}, energy=${!!energyId}`);

    // ─── Step 4: Create 6 challenges ───
    const challengeIds: string[] = [];
    const aggCr = findUser(users, "Chris Rivera");
    const mpCr = findUser(users, "Maria Chen");
    const now = new Date().toISOString();

    const assignRole = async (userId: string, challengeId: string, roleCode: string) => {
      const { error } = await sa.from("user_challenge_roles").insert({
        user_id: userId, challenge_id: challengeId, role_code: roleCode, is_active: true, auto_assigned: true,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    };

    // ════════════════════════════════════════════════════════════════
    // C1: CONTROLLED + AGG — AI-Driven Clinical Trial Patient Matching ($500K, Phase 2)
    // ════════════════════════════════════════════════════════════════
    const c1Id = crypto.randomUUID();
    const c1Problem = "Our pharmaceutical clients spend an average of $41,000 per patient recruited for Phase II/III clinical trials. Current recruitment processes rely on manual chart review by site coordinators, resulting in only 3-5% of screened patients meeting eligibility criteria. The average Phase III trial requires 18-24 months to reach full enrollment, with 80% of trials failing to meet enrollment timelines. We need an AI-powered platform that can: (1) automatically parse and extract structured data from unstructured EHR records across Epic, Cerner, and Meditech systems, (2) match patient profiles against complex multi-criteria trial eligibility protocols in real-time, (3) generate site-level feasibility scores predicting enrollment probability, and (4) provide a HIPAA-compliant physician-facing dashboard for protocol-matched patient outreach. The solution must demonstrate >85% sensitivity and >90% specificity in patient-protocol matching compared to manual gold-standard review, validated on a retrospective dataset of 50,000+ patient records across oncology, cardiology, and rare disease therapeutic areas.";
    const c1Scope = "The solution must integrate with three primary EHR platforms (Epic, Cerner, Meditech) via HL7 FHIR R4 APIs. Geographic scope covers 47 hospital networks across North America, processing 12 million active patient records. Performance requirement: patient-protocol matching must complete within 30 seconds per patient batch of 1,000 records.";
    const c1Hook = "Reduce clinical trial recruitment time by 60% using AI/NLP on 12M+ electronic health records across 47 hospital networks";
    const c1Context = "Tech Mahindra's Healthcare & Life Sciences division serves 15 of the top 20 global pharmaceutical companies. Our current clinical trial support services are primarily manual, involving teams of 200+ clinical data managers across 5 delivery centers.";
    const c1Criteria = { weighted_criteria: [
      { name: "Matching Accuracy (sensitivity/specificity)", weight: 30 },
      { name: "EHR Integration Architecture & FHIR Compliance", weight: 20 },
      { name: "Scalability to 12M+ Records", weight: 15 },
      { name: "HIPAA/GDPR Compliance", weight: 15 },
      { name: "Time-to-Deployment", weight: 10 },
      { name: "Team Credentials", weight: 10 },
    ]};
    const c1Tags = ["healthcare", "artificial-intelligence", "clinical-trials"];
    const c1Snapshot = {
      title: "AI-Driven Clinical Trial Patient Matching", hook: c1Hook, problem_statement: c1Problem,
      scope: c1Scope, domain_tags: c1Tags, maturity_level: "PROTOTYPE", context_background: c1Context,
      evaluation_criteria: c1Criteria, currency_code: "USD", platinum_award: 500000,
      ip_model: "IP-EL", expected_timeline: "6-12",
    };
    await sa.from("challenges").insert({
      id: c1Id, tenant_id: orgId, organization_id: orgId,
      title: "AI-Driven Clinical Trial Patient Matching", hook: c1Hook,
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c1Problem, scope: c1Scope, maturity_level: "PROTOTYPE",
      evaluation_criteria: c1Criteria, currency_code: "USD", domain_tags: c1Tags,
      ip_model: "IP-EL", phase_schedule: { expected_timeline: "6-12" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 500000 },
      extended_brief: { creator_approval_required: true, context_background: c1Context },
      creator_snapshot: c1Snapshot, industry_segment_id: healthId,
      created_by: aggCr?.userId ?? null,
    });
    challengeIds.push(c1Id);
    // C1 roles: CR, CU, LC, FC, ER×2
    if (aggCr) await assignRole(aggCr.userId, c1Id, "CR");
    const casey = findUser(users, "Casey Underwood");
    if (casey) await assignRole(casey.userId, c1Id, "CU");
    const leslie = findUser(users, "Leslie Chen");
    if (leslie) await assignRole(leslie.userId, c1Id, "LC");
    const frank = findUser(users, "Frank Coleman");
    if (frank) await assignRole(frank.userId, c1Id, "FC");
    const evelyn = findUser(users, "Evelyn Rhodes");
    if (evelyn) await assignRole(evelyn.userId, c1Id, "ER");
    const ethan = findUser(users, "Ethan Russell");
    if (ethan) await assignRole(ethan.userId, c1Id, "ER");
    results.push(`✅ C1: CTRL+AGG "AI Clinical Trial" $500K Phase2 — CR+CU+LC+FC+ER×2`);

    // ════════════════════════════════════════════════════════════════
    // C2: CONTROLLED + MP — Global AML Transaction Monitoring ($250K, Phase 2)
    // ════════════════════════════════════════════════════════════════
    const c2Id = crypto.randomUUID();
    const c2Problem = "Global financial institutions face $2.8 trillion in money laundering annually. Our current AML transaction monitoring system processes 500M+ daily transactions across 40 jurisdictions but generates a 95% false-positive rate on suspicious activity reports (SARs). Compliance teams spend 85% of their time investigating legitimate transactions flagged incorrectly. We need a next-generation AI/ML-powered AML system that can: (1) reduce false positives by 70%+ while maintaining regulatory detection thresholds, (2) support real-time screening across SWIFT, SEPA, and ACH payment networks, (3) incorporate graph analytics for complex beneficial ownership and network analysis, and (4) adapt to evolving typologies across 40+ regulatory jurisdictions including FATF, FinCEN, FCA, and MAS requirements.";
    const c2Scope = "Must process 500M+ transactions daily with sub-second latency. Integration with existing Oracle FLEXCUBE core banking and Actimize case management. Support for 40+ jurisdictions with configurable rule engines per regulatory framework. Cloud-native deployment on AWS with data residency compliance for EU, US, APAC.";
    const c2Hook = "Cut AML false positives by 70% while monitoring 500M+ daily transactions across 40 jurisdictions";
    const c2Context = "Our Financial Services practice supports 12 of the top 25 global banks. Current AML infrastructure was built 8 years ago on rule-based engines. Regulatory fines in the sector exceeded $10B in 2025.";
    const c2Criteria = { weighted_criteria: [
      { name: "False Positive Reduction Rate", weight: 30 },
      { name: "Regulatory Coverage (40+ jurisdictions)", weight: 20 },
      { name: "Real-time Processing Latency", weight: 20 },
      { name: "Graph Analytics & Network Detection", weight: 15 },
      { name: "Explainability & Audit Trail", weight: 15 },
    ]};
    const c2Tags = ["financial-services", "compliance", "machine-learning"];
    const c2Snapshot = {
      title: "Global AML Transaction Monitoring System", hook: c2Hook, problem_statement: c2Problem,
      scope: c2Scope, domain_tags: c2Tags, maturity_level: "SOLUTION_READY", context_background: c2Context,
      evaluation_criteria: c2Criteria, currency_code: "USD", platinum_award: 250000,
      ip_model: "IP-EL", expected_timeline: "9-12",
    };
    await sa.from("challenges").insert({
      id: c2Id, tenant_id: orgId, organization_id: orgId,
      title: "Global AML Transaction Monitoring System", hook: c2Hook,
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "MP", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c2Problem, scope: c2Scope, maturity_level: "SOLUTION_READY",
      evaluation_criteria: c2Criteria, currency_code: "USD", domain_tags: c2Tags,
      ip_model: "IP-EL", phase_schedule: { expected_timeline: "9-12" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 250000 },
      extended_brief: { creator_approval_required: true, context_background: c2Context },
      creator_snapshot: c2Snapshot, industry_segment_id: financeId,
      created_by: mpCr?.userId ?? null,
    });
    challengeIds.push(c2Id);
    // C2 roles: MP Creator, PP Curator, PP Legal, PP Finance
    if (mpCr) await assignRole(mpCr.userId, c2Id, "CR");
    const paulCu = findUser(users, "Paul Curtis");
    if (paulCu) await assignRole(paulCu.userId, c2Id, "CU");
    const patLc = findUser(users, "Patricia Lee");
    if (patLc) await assignRole(patLc.userId, c2Id, "LC");
    const petFc = findUser(users, "Peter Ford");
    if (petFc) await assignRole(petFc.userId, c2Id, "FC");
    results.push(`✅ C2: CTRL+MP "AML Monitoring" $250K Phase2 — CR+CU+LC+FC`);

    // ════════════════════════════════════════════════════════════════
    // C3: STRUCTURED + AGG — Predictive Quality Analytics ($75K, Phase 2)
    // ════════════════════════════════════════════════════════════════
    const c3Id = crypto.randomUUID();
    const c3Problem = "Tech Mahindra manages quality assurance for 8 automotive OEM clients across 23 manufacturing plants. Current SPC methods detect defects only after production batches are completed, resulting in 4.2% defect rate and $18M annual scrap/rework costs. We need a predictive quality analytics solution that ingests real-time sensor data from CNC machines, injection molding equipment, and assembly line vision systems to predict defect probability BEFORE parts are completed. Must integrate with Siemens MindSphere IoT infrastructure and SAP QM module.";
    const c3Scope = "Scope covers 23 manufacturing plants with 1,200+ connected machines generating 50TB sensor data monthly. Must support CNC machining, injection molding, and assembly processes. Integration with Siemens MindSphere and SAP QM is mandatory.";
    const c3Tags = ["manufacturing", "predictive-analytics", "IoT"];
    const c3Criteria = { weighted_criteria: [
      { name: "Defect Prediction Accuracy", weight: 30 },
      { name: "Real-time Processing Latency", weight: 25 },
      { name: "MindSphere & SAP QM Integration", weight: 20 },
      { name: "Scalability Architecture", weight: 15 },
      { name: "Implementation Timeline", weight: 10 },
    ]};
    const c3Snapshot = {
      title: "Predictive Quality Analytics for Automotive", problem_statement: c3Problem,
      scope: c3Scope, domain_tags: c3Tags, maturity_level: "POC",
      evaluation_criteria: c3Criteria, currency_code: "USD", platinum_award: 75000,
    };
    await sa.from("challenges").insert({
      id: c3Id, tenant_id: orgId, organization_id: orgId,
      title: "Predictive Quality Analytics for Automotive",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c3Problem, scope: c3Scope, maturity_level: "POC",
      evaluation_criteria: c3Criteria, currency_code: "USD", domain_tags: c3Tags,
      ip_model: "IP-NEL", phase_schedule: { expected_timeline: "3-6" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 75000 },
      extended_brief: { creator_approval_required: true },
      creator_snapshot: c3Snapshot, industry_segment_id: techId,
      created_by: aggCr?.userId ?? null,
    });
    challengeIds.push(c3Id);
    // C3 roles: AGG Creator + AGG Curator (Curator does ALL)
    if (aggCr) await assignRole(aggCr.userId, c3Id, "CR");
    if (casey) await assignRole(casey.userId, c3Id, "CU");
    results.push(`✅ C3: STRUCT+AGG "Predictive Quality" $75K Phase2 — CR+CU`);

    // ════════════════════════════════════════════════════════════════
    // C4: STRUCTURED + MP — Smart Grid Energy Optimization ($50K, Phase 2)
    // ════════════════════════════════════════════════════════════════
    const c4Id = crypto.randomUUID();
    const c4Problem = "Utility companies managing smart grid networks face increasing demand variability with the rise of distributed energy resources (solar, wind, EVs). Current grid optimization uses static load forecasting with 12-hour lookahead, resulting in 8-15% energy waste from over-provisioning. We need an ML-driven platform that dynamically optimizes energy distribution across smart grid nodes using real-time demand signals, weather forecasts, and DER availability predictions to reduce waste by 40%+ while maintaining 99.97% grid reliability.";
    const c4Scope = "Platform must handle 500K+ smart meter endpoints with 15-minute interval data. Integration with SCADA systems and OpenADR 2.0 demand response protocols. Cloud deployment with edge computing capability for local grid segments.";
    const c4Tags = ["energy", "optimization", "smart-grid"];
    const c4Criteria = { weighted_criteria: [
      { name: "Energy Waste Reduction %", weight: 30 },
      { name: "Forecast Accuracy (MAPE)", weight: 25 },
      { name: "Grid Reliability Maintenance", weight: 20 },
      { name: "SCADA & OpenADR Integration", weight: 15 },
      { name: "Scalability to 500K endpoints", weight: 10 },
    ]};
    const c4Snapshot = {
      title: "Smart Grid Energy Optimization Platform", problem_statement: c4Problem,
      scope: c4Scope, domain_tags: c4Tags, maturity_level: "POC",
      evaluation_criteria: c4Criteria, currency_code: "USD", platinum_award: 50000,
    };
    await sa.from("challenges").insert({
      id: c4Id, tenant_id: orgId, organization_id: orgId,
      title: "Smart Grid Energy Optimization Platform",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "MP", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c4Problem, scope: c4Scope, maturity_level: "POC",
      evaluation_criteria: c4Criteria, currency_code: "USD", domain_tags: c4Tags,
      ip_model: "IP-NEL", phase_schedule: { expected_timeline: "3-6" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 50000 },
      extended_brief: { creator_approval_required: true },
      creator_snapshot: c4Snapshot, industry_segment_id: energyId,
      created_by: mpCr?.userId ?? null,
    });
    challengeIds.push(c4Id);
    // C4 roles: MP Creator + PP Curator (Curator does ALL)
    if (mpCr) await assignRole(mpCr.userId, c4Id, "CR");
    if (paulCu) await assignRole(paulCu.userId, c4Id, "CU");
    results.push(`✅ C4: STRUCT+MP "Smart Grid" $50K Phase2 — CR+CU`);

    // ════════════════════════════════════════════════════════════════
    // C5: QUICK + AGG — Internal Carbon Footprint Tracker ($10K, Phase 5)
    // ════════════════════════════════════════════════════════════════
    const c5Id = crypto.randomUUID();
    const c5Problem = "Tech Mahindra has committed to net-zero carbon emissions by 2035 as part of our ESG goals. We need a prototype employee-facing dashboard that tracks individual and team carbon footprint from work-related activities including office energy consumption, business travel, data center usage, and commute patterns. The prototype should calculate estimated CO2 equivalents using GHG Protocol Scope 1/2/3 emission factors and display actionable insights with monthly trends and reduction targets.";
    const c5Tags = ["sustainability", "dashboard", "ESG"];
    const c5Snapshot = {
      title: "Internal Carbon Footprint Tracker", problem_statement: c5Problem,
      domain_tags: c5Tags, currency_code: "USD", platinum_award: 10000,
    };
    await sa.from("challenges").insert({
      id: c5Id, tenant_id: orgId, organization_id: orgId,
      title: "Internal Carbon Footprint Tracker",
      status: "active", master_status: "ACTIVE", current_phase: 5, phase_status: "ACTIVE",
      published_at: now,
      operating_model: "AGG", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c5Problem, currency_code: "USD", domain_tags: c5Tags,
      ip_model: "IP-NEL",
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 10000 },
      extended_brief: { creator_approval_required: false },
      creator_snapshot: c5Snapshot, industry_segment_id: techId,
      lc_compliance_complete: true, fc_compliance_complete: true,
      created_by: findUser(users, "Sam Solo")?.userId ?? null,
    });
    challengeIds.push(c5Id);
    // C5: Sam Solo = all roles
    const solo = findUser(users, "Sam Solo");
    if (solo) { for (const r of ["CR","CU","ER","LC","FC"]) await assignRole(solo.userId, c5Id, r); }
    results.push(`✅ C5: QUICK+AGG "Carbon Tracker" $10K Phase5 — Solo=ALL`);

    // ════════════════════════════════════════════════════════════════
    // C6: QUICK + MP — Customer Onboarding UX Ideas ($5K, Phase 5)
    // ════════════════════════════════════════════════════════════════
    const c6Id = crypto.randomUUID();
    const c6Problem = "Our customer onboarding flow has a 34% drop-off rate between account creation and first meaningful action. User research indicates confusion around navigation, unclear value proposition presentation, and too many required steps before users can experience core functionality. We need creative UX concepts and interactive prototypes that reduce onboarding drop-off to under 15% while maintaining compliance data collection requirements.";
    const c6Tags = ["ux-design", "onboarding", "customer-experience"];
    const c6Snapshot = {
      title: "Customer Onboarding UX Ideas", problem_statement: c6Problem,
      domain_tags: c6Tags, currency_code: "USD", platinum_award: 5000,
    };
    await sa.from("challenges").insert({
      id: c6Id, tenant_id: orgId, organization_id: orgId,
      title: "Customer Onboarding UX Ideas",
      status: "active", master_status: "ACTIVE", current_phase: 5, phase_status: "ACTIVE",
      published_at: now,
      operating_model: "MP", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false,
      is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c6Problem, currency_code: "USD", domain_tags: c6Tags,
      ip_model: "IP-NEL",
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 5000 },
      extended_brief: { creator_approval_required: false },
      creator_snapshot: c6Snapshot, industry_segment_id: techId,
      lc_compliance_complete: true, fc_compliance_complete: true,
      created_by: solo?.userId ?? null,
    });
    challengeIds.push(c6Id);
    // C6: Sam Solo = all roles
    if (solo) { for (const r of ["CR","CU","ER","LC","FC"]) await assignRole(solo.userId, c6Id, r); }
    results.push(`✅ C6: QUICK+MP "Onboarding UX" $5K Phase5 — Solo=ALL`);

    // ─── Step 5c: Legal docs ───
    // AGG challenges: source from org_legal_document_templates
    const { data: orgLegalTmpls } = await sa.from("org_legal_document_templates")
      .select("id, document_code, document_name, tier").eq("is_active", true).limit(20);
    // MP challenges: source from legal_document_templates (platform)
    const { data: platformLegalTmpls } = await sa.from("legal_document_templates")
      .select("template_id, document_code, document_name, tier").eq("is_active", true).eq("version_status", "ACTIVE").limit(20);

    const attachLegal = async (
      challengeId: string, templates: { document_code?: string; document_name?: string; tier?: string }[] | null,
      status: string, lcStatus: string, createdBy: string | null,
    ) => {
      if (!templates || templates.length === 0) return 0;
      for (const t of templates) {
        await sa.from("challenge_legal_docs").insert({
          challenge_id: challengeId, document_type: t.document_code ?? t.document_name ?? "UNKNOWN",
          document_name: t.document_name, tier: t.tier ?? "TIER_1",
          status, lc_status: lcStatus, created_by: createdBy,
        });
      }
      return templates.length;
    };

    // C1 CTRL+AGG: pending_review / pending (from org templates)
    const c1Legal = await attachLegal(c1Id, orgLegalTmpls, "pending_review", "pending", aggCr?.userId ?? null);
    // C2 CTRL+MP: pending_review / pending (from platform templates)
    const c2Legal = await attachLegal(c2Id, platformLegalTmpls, "pending_review", "pending", mpCr?.userId ?? null);
    // C3 STRUCT+AGG: curator_reviewed / approved (from org templates)
    const c3Legal = await attachLegal(c3Id, orgLegalTmpls, "curator_reviewed", "approved", aggCr?.userId ?? null);
    // C4 STRUCT+MP: curator_reviewed / approved (from platform templates)
    const c4Legal = await attachLegal(c4Id, platformLegalTmpls, "curator_reviewed", "approved", mpCr?.userId ?? null);
    // C5 QUICK+AGG: auto_accepted / approved (from platform templates)
    const c5Legal = await attachLegal(c5Id, platformLegalTmpls, "auto_accepted", "approved", solo?.userId ?? null);
    // C6 QUICK+MP: auto_accepted / approved (from platform templates)
    const c6Legal = await attachLegal(c6Id, platformLegalTmpls, "auto_accepted", "approved", solo?.userId ?? null);
    results.push(`✅ Legal docs: C1=${c1Legal}, C2=${c2Legal}, C3=${c3Legal}, C4=${c4Legal}, C5=${c5Legal}, C6=${c6Legal}`);

    // ─── Step 5d: Escrow records (CONTROLLED only) ───
    for (const [cId, prize, label] of [[c1Id, 500000, "C1"], [c2Id, 250000, "C2"]] as [string, number, string][]) {
      await sa.from("escrow_records").insert({
        challenge_id: cId, tenant_id: orgId, amount: prize, currency_code: "USD",
        status: "PENDING", escrow_type: "challenge_prize",
        created_by: cId === c1Id ? aggCr?.userId : mpCr?.userId,
      });
      results.push(`✅ Escrow: ${label} PENDING $${(prize / 1000).toFixed(0)}K`);
    }

    // ─── Step 5e: Pool entries for platform provider users ───
    const poolEntries = [
      { name: "Casey Underwood", email: "nh-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
      { name: "Evelyn Rhodes", email: "nh-er1@testsetup.dev", codes: ["R7_MP", "R7_AGG"] },
      { name: "Frank Coleman", email: "nh-fc@testsetup.dev", codes: ["R8"] },
      { name: "Paul Curtis", email: "nh-pp-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
      { name: "Patricia Lee", email: "nh-pp-lc@testsetup.dev", codes: ["R9"] },
      { name: "Peter Ford", email: "nh-pp-fc@testsetup.dev", codes: ["R8"] },
    ];
    for (const entry of poolEntries) {
      const linkedUserId = users.find(u => u.displayName === entry.name)?.userId ?? null;
      const poolData = {
        full_name: entry.name, email: entry.email, role_codes: entry.codes,
        user_id: linkedUserId, max_concurrent: 10, current_assignments: 0,
        availability_status: "available", is_active: true,
        domain_scope: { industry_segment_ids: [], proficiency_area_ids: [], sub_domain_ids: [], speciality_ids: [] },
      };
      const { data: existing } = await sa.from("platform_provider_pool").select("id").eq("email", entry.email).maybeSingle();
      if (existing) {
        await sa.from("platform_provider_pool").update({ ...poolData, updated_at: now }).eq("id", existing.id);
      } else {
        await sa.from("platform_provider_pool").insert(poolData);
      }
      results.push(`✅ Pool: ${entry.name} (${entry.codes.join(",")})`);
    }

    // ─── Summary ───
    results.push("");
    results.push("═══════════════════════════════════════");
    results.push(`🎉 Scenario "${scenario}" — 6 challenges seeded!`);
    results.push(`   Org: ${config.orgName} (${orgId})`);
    results.push(`   C1: CTRL+AGG ${c1Id}`);
    results.push(`   C2: CTRL+MP  ${c2Id}`);
    results.push(`   C3: STRUCT+AGG ${c3Id}`);
    results.push(`   C4: STRUCT+MP  ${c4Id}`);
    results.push(`   C5: QUICK+AGG ${c5Id}`);
    results.push(`   C6: QUICK+MP  ${c6Id}`);
    results.push("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ success: true, data: { results, credentials, orgId, orgName: config.orgName, challengeIds } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
