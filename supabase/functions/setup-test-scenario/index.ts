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
    orgName: "Tech Mahindra Limited",
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
      trade_brand_name: "Tech Mahindra",
      legal_entity_name: "Tech Mahindra Limited",
      tagline: "Connected World. Connected Experiences.",
      organization_description: "Tech Mahindra is a leading provider of digital transformation, consulting, and business re-engineering services and solutions. Part of the Mahindra Group, the company is a USD 6.5 billion organization with 150,000+ professionals across 90+ countries, helping 1,350+ global customers including Fortune 500 companies. Tech Mahindra focuses on leveraging next-generation technologies including 5G, blockchain, AI, cybersecurity, and cloud to enable end-to-end digital transformation for its customers.",
      website_url: "https://www.techmahindra.com",
      linkedin_url: "https://www.linkedin.com/company/tech-mahindra",
      logo_url: "https://www.techmahindra.com/themes/custom/starter/logo.svg",
      founding_year: 1986,
      employee_count_range: "100000+",
      annual_revenue_range: "$5B-$10B",
      hq_city: "Pune",
      hq_country_id: "IN",
      hq_address_line1: "Gateway Building, Apollo Bunder",
      hq_postal_code: "411013",
      preferred_currency: "USD",
      timezone: "Asia/Kolkata",
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
    const c1ProblemStatement = "Our pharmaceutical clients spend an average of $41,000 per patient recruited for Phase II/III clinical trials. Current recruitment processes rely on manual chart review by site coordinators, resulting in only 3-5% of screened patients meeting eligibility criteria. The average Phase III trial requires 18-24 months to reach full enrollment, with 80% of trials failing to meet enrollment timelines. We need an AI-powered platform that can: (1) automatically parse and extract structured data from unstructured EHR records across Epic, Cerner, and Meditech systems, (2) match patient profiles against complex multi-criteria trial eligibility protocols in real-time, (3) generate site-level feasibility scores predicting enrollment probability, and (4) provide a HIPAA-compliant physician-facing dashboard for protocol-matched patient outreach. The solution must demonstrate >85% sensitivity and >90% specificity in patient-protocol matching compared to manual gold-standard review, validated on a retrospective dataset of 50,000+ patient records across oncology, cardiology, and rare disease therapeutic areas.";
    const c1Scope = "The solution must integrate with three primary EHR platforms (Epic, Cerner, Meditech) via HL7 FHIR R4 APIs. Geographic scope covers 47 hospital networks across North America, processing 12 million active patient records. The platform must handle 200+ concurrent trial protocols with complex Boolean eligibility logic including lab value ranges, medication histories, comorbidity exclusions, and temporal constraints. Out of scope: direct patient communication, consent management, and randomization. The solution must be deployable on-premise or in a HIPAA-compliant cloud environment (AWS GovCloud or Azure Government). Performance requirement: patient-protocol matching must complete within 30 seconds per patient batch of 1,000 records.";
    const c1Hook = "Reduce clinical trial recruitment time by 60% using AI/NLP on 12M+ electronic health records across 47 hospital networks";
    const c1Context = "Tech Mahindra's Healthcare & Life Sciences division serves 15 of the top 20 global pharmaceutical companies. Our current clinical trial support services are primarily manual, involving teams of 200+ clinical data managers across 5 delivery centers. We have existing FHIR integration frameworks and a proprietary NLP pipeline for medical document processing, but no unified patient-matching platform. Our clients have expressed willingness to commit to pilot programs if matching accuracy exceeds 85%. We have secured IRB approval for retrospective data analysis across 3 partner hospital networks (Mount Sinai, Cleveland Clinic, Mayo Clinic) for validation purposes.";
    const c1EvalCriteria = { weighted_criteria: [
      { name: "Matching Accuracy (sensitivity/specificity on retrospective validation)", weight: 30 },
      { name: "EHR Integration Architecture & FHIR Compliance", weight: 20 },
      { name: "Scalability to 12M+ Records & 200+ Concurrent Protocols", weight: 15 },
      { name: "HIPAA/GDPR Compliance & Security Architecture", weight: 15 },
      { name: "Time-to-Deployment & Implementation Roadmap", weight: 10 },
      { name: "Team Credentials & Domain Experience", weight: 10 },
    ]};
    const c1DomainTags = ["healthcare", "artificial-intelligence", "clinical-trials"];
    const c1ExtendedBrief = {
      creator_approval_required: true,
      context_background: c1Context,
      root_causes: [
        "Manual chart review cannot scale beyond 50 patients/coordinator/day",
        "Eligibility criteria complexity (avg 72 criteria per protocol) exceeds human cognitive capacity for consistent matching",
        "Siloed EHR data across hospital networks prevents cross-site patient identification",
        "No standardized data model for trial eligibility — each sponsor uses different protocol formats",
        "Physician notification of eligible patients relies on ad-hoc email, resulting in 60%+ missed matches",
      ],
      affected_stakeholders: [
        { role: "Clinical Operations Directors", count: 35, impact: "Primary — responsible for enrollment targets" },
        { role: "Site Coordinators", count: 200, impact: "Primary — daily screening workflow" },
        { role: "Principal Investigators", count: 120, impact: "Secondary — patient outreach" },
        { role: "Pharmaceutical Sponsors", count: 15, impact: "Tertiary — trial timeline commitments" },
      ],
      current_deficiencies: [
        "Avg 18-24 months to full trial enrollment (industry benchmark: 12 months)",
        "$41,000 per-patient recruitment cost (3x higher than AI-assisted benchmarks)",
        "3-5% screen-to-enroll ratio (top-quartile sites achieve 12-15% with AI tools)",
        "80% of trials miss enrollment deadlines by 6+ months",
        "No cross-site patient matching — each hospital operates in isolation",
      ],
    };
    const c1Snapshot = {
      title: "AI-Driven Clinical Trial Patient Matching & Recruitment Platform",
      hook: c1Hook,
      problem_statement: c1ProblemStatement,
      scope: c1Scope,
      domain_tags: c1DomainTags,
      maturity_level: "SOLUTION_GROWTH",
      context_background: c1Context,
      evaluation_criteria: c1EvalCriteria,
      currency_code: "USD",
      platinum_award: 500000,
      ip_model: "IP-EL",
      expected_timeline: "6-12",
      extended_brief: { context_background: c1Context },
      reward_structure: { currency: "USD", platinum_award: 500000, budget_min: 300000, budget_max: 750000 },
    };

    const { error: c1Err } = await supabaseAdmin.from("challenges").insert({
      id: controlledId, tenant_id: orgId, organization_id: orgId,
      title: "AI-Driven Clinical Trial Patient Matching & Recruitment Platform",
      hook: c1Hook,
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c1ProblemStatement,
      scope: c1Scope,
      maturity_level: "SOLUTION_GROWTH",
      context_background: c1Context,
      evaluation_criteria: c1EvalCriteria,
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 500000, gold_award: 150000, silver_award: 75000, budget_min: 300000, budget_max: 750000 },
      currency_code: "USD", domain_tags: c1DomainTags,
      ip_model: "IP-EL", phase_schedule: { expected_timeline: "6-12", submission_deadline: "2026-09-30" },
      eligibility: JSON.stringify({ industry_segment_id: healthSegmentId, domain_tags: c1DomainTags, constraints: "Must have prior experience with HIPAA-compliant healthcare AI solutions and HL7 FHIR integration" }),
      extended_brief: c1ExtendedBrief,
      creator_snapshot: c1Snapshot,
      created_by: crUserId,
    });
    if (c1Err) throw new Error(`CONTROLLED challenge: ${c1Err.message}`);
    challengeIds.push(controlledId);
    results.push(`✅ Challenge 1: CONTROLLED+AGG "AI-Driven Clinical Trial Patient Matching" — $500K (Phase 2)`);

    // Challenge 2: STRUCTURED + AGG (8 Creator fields filled)
    const structuredId = crypto.randomUUID();
    const c2ProblemStatement = "Mahindra Insurance Brokers Ltd, a subsidiary of Mahindra Finance, processes over 12,000 motor and health insurance claims monthly across its pan-India network of 1,200+ branch offices. The current manual adjudication workflow averages 8.5 business days per claim, with an 18% first-pass rejection rate primarily caused by ICD-10/CPT coding errors, incomplete documentation, and inconsistent assessor interpretations. This delays policyholder settlements and drives a Net Promoter Score of just 34 in claims experience. The annual cost of rework, re-submissions, and customer escalations is estimated at ₹14 crore. The claims operations team of 340 adjusters spends approximately 60% of their time on data entry and document verification rather than actual adjudication decisions.";
    const c2Scope = "Build an intelligent claims adjudication engine comprising: (1) NLP-based document extraction from scanned claim forms, hospital discharge summaries, and repair estimates using OCR + transformer models; (2) automated ICD-10 and CPT code validation against policy coverage terms; (3) integration with the TCS BaNCS core insurance platform via REST APIs for real-time claim status updates; (4) fraud pattern detection using historical claims data (3 years, 400K+ records) to flag suspicious patterns. The solution must handle both motor (60% volume) and health (40% volume) claim types, support Hindi and English documents, and achieve a minimum 85% straight-through processing rate for standard claims within 12 months of deployment.";
    const c2DomainTags = ["insurance-claims", "document-AI", "NLP", "fraud-detection"];
    const c2EvalCriteria = { weighted_criteria: [
      { name: "Document Extraction Accuracy", weight: 35 },
      { name: "TCS BaNCS Integration Depth", weight: 25 },
      { name: "Scalability to 50K Claims/Month", weight: 20 },
      { name: "Total Cost of Ownership (3-Year)", weight: 20 },
    ]};
    const c2Snapshot = {
      title: "Intelligent Claims Adjudication for Mahindra Insurance",
      problem_statement: c2ProblemStatement,
      scope: c2Scope,
      domain_tags: c2DomainTags,
      maturity_level: "POC",
      evaluation_criteria: c2EvalCriteria,
      currency_code: "USD",
      platinum_award: 40000,
      reward_structure: { currency: "USD", platinum_award: 40000, budget_min: 20000, budget_max: 60000 },
    };

    const { error: c2Err } = await supabaseAdmin.from("challenges").insert({
      id: structuredId, tenant_id: orgId, organization_id: orgId,
      title: "Intelligent Claims Adjudication for Mahindra Insurance",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c2ProblemStatement,
      scope: c2Scope,
      maturity_level: "POC",
      evaluation_criteria: c2EvalCriteria,
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 40000, budget_min: 20000, budget_max: 60000 },
      currency_code: "USD", domain_tags: c2DomainTags,
      ip_model: "IP-NEL", phase_schedule: { expected_timeline: "3-6" },
      eligibility: JSON.stringify({ industry_segment_id: healthSegmentId, domain_tags: c2DomainTags }),
      extended_brief: { creator_approval_required: true },
      creator_snapshot: c2Snapshot,
      created_by: crUserId,
    });
    if (c2Err) throw new Error(`STRUCTURED challenge: ${c2Err.message}`);
    challengeIds.push(structuredId);
    results.push(`✅ Challenge 2: STRUCTURED+AGG "Claims Adjudication — Mahindra Insurance" (Phase 2 — CURATION)`);

    // Challenge 3: QUICK + AGG (5 Creator fields filled — minimal)
    const quickId = crypto.randomUUID();
    const c3ProblemStatement = "Mahindra Electric's last-mile delivery fleet—comprising 2,400+ Treo auto-rickshaws and e-Alfa Mini cargo vehicles deployed across 18 Indian cities—currently lacks a unified telematics platform. Fleet operators manage battery state-of-health monitoring through the OEM app, route optimisation through a third-party logistics tool, and charging schedule coordination through manual spreadsheets. This fragmentation causes an average 22% under-utilisation of vehicle range, 35-minute daily delays per vehicle due to uncoordinated charging queues, and zero visibility into predictive battery degradation. We need a single-pane-of-glass dashboard prototype that aggregates CAN bus telemetry, charging station APIs, and route planning data to give fleet managers real-time operational intelligence and predictive alerts.";
    const c3DomainTags = ["electric-vehicles", "fleet-telematics", "dashboard", "IoT"];
    const c3Snapshot = {
      title: "EV Fleet Telematics Dashboard for Last-Mile Delivery",
      problem_statement: c3ProblemStatement,
      domain_tags: c3DomainTags,
      currency_code: "USD",
      platinum_award: 15000,
      reward_structure: { currency: "USD", platinum_award: 15000, budget_min: 5000, budget_max: 20000 },
    };

    const { error: c3Err } = await supabaseAdmin.from("challenges").insert({
      id: quickId, tenant_id: orgId, organization_id: orgId,
      title: "EV Fleet Telematics Dashboard for Last-Mile Delivery",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: true, is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: c3ProblemStatement,
      maturity_level: "BLUEPRINT",
      evaluation_criteria: { weighted_criteria: [{ name: "UX Quality", weight: 40 },{ name: "Feasibility", weight: 30 },{ name: "Speed", weight: 30 }]},
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 15000, budget_min: 5000, budget_max: 20000 },
      currency_code: "USD", domain_tags: c3DomainTags,
      phase_schedule: { expected_timeline: "1-3" },
      eligibility: JSON.stringify({ industry_segment_id: techSegmentId, domain_tags: c3DomainTags }),
      extended_brief: { creator_approval_required: false },
      creator_snapshot: c3Snapshot,
      created_by: crUserId,
    });
    if (c3Err) throw new Error(`QUICK challenge: ${c3Err.message}`);
    challengeIds.push(quickId);
    results.push(`✅ Challenge 3: QUICK+AGG "EV Fleet Telematics — Mahindra Electric" (Phase 2 — CURATION)`);

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
