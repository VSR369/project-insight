import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CPA_TEMPLATES, PLATFORM_DOC_CONTENT } from "../_shared/legal-seed-content.ts";

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
    orgName: "Mahindra & Mahindra Limited",
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
type SA = any;
interface ResolvedUser { userId: string; roles: string[]; displayName: string; email: string }

function find(users: ResolvedUser[], name: string) {
  return users.find(u => u.displayName === name);
}

async function insertChallenge(sa: SA, payload: Record<string, unknown>, label: string) {
  const { error } = await sa.from("challenges").insert(payload);
  if (error) throw new Error(`${label}: ${error.message}`);
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

    if (body.action === "sync_operating_model") {
      const { orgId, operatingModel } = body;
      if (!orgId || !operatingModel)
        return new Response(JSON.stringify({ success: false, error: { code: "INVALID_PARAMS", message: "orgId and operatingModel required" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error } = await sa.from("seeker_organizations").update({ operating_model: operatingModel }).eq("id", orgId);
      if (error) return new Response(JSON.stringify({ success: false, error: { code: "SYNC_FAILED", message: error.message } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ success: true, data: { message: `Operating model updated to ${operatingModel}` } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scenario = body.scenario as string;
    if (!scenario || !SCENARIOS[scenario])
      return new Response(JSON.stringify({ success: false, error: { code: "INVALID_SCENARIO", message: `Unknown: ${scenario}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const config = SCENARIOS[scenario];
    const results: string[] = [];
    const credentials: { email: string; password: string; roles: string[] }[] = [];

    // ─── Cleanup ───
    const scenarioEmails = config.users.map(u => u.email);
    const { data: allAuthData } = await sa.auth.admin.listUsers({ perPage: 1000 });
    const allAuthUsers = allAuthData?.users ?? [];
    const scenarioUserIds = allAuthUsers
      .filter((u: { email?: string }) => u.email && scenarioEmails.includes(u.email!))
      .map((u: { id: string }) => u.id);
    if (scenarioUserIds.length > 0) {
      await sa.from("org_users").delete().in("user_id", scenarioUserIds);
      await sa.from("user_roles").delete().in("user_id", scenarioUserIds);
      await sa.from("user_challenge_roles").delete().in("user_id", scenarioUserIds);
      results.push(`Cleaned ${scenarioUserIds.length} user records`);
    }
    const { data: oldOrgs } = await sa.from("seeker_organizations").select("id").eq("organization_name", config.orgName);
    if (oldOrgs && oldOrgs.length > 0) {
      const oldOrgIds = oldOrgs.map((o: { id: string }) => o.id);
      const { data: oldCh } = await sa.from("challenges").select("id").in("organization_id", oldOrgIds);
      if (oldCh && oldCh.length > 0) {
        const ids = oldCh.map((c: { id: string }) => c.id);
        const tables = ["audit_trail","sla_timers","cogni_notifications","challenge_legal_docs","challenge_package_versions","challenge_qa","user_challenge_roles","challenge_prize_tiers","challenge_section_approvals","challenge_incentive_selections","challenge_context_digest","challenge_role_assignments","challenge_attachments","escrow_records","curation_progress","curation_quality_metrics","communication_log","amendment_records","challenge_submissions"];
        for (const t of tables) await sa.from(t).delete().in("challenge_id", ids);
        await sa.from("challenges").delete().in("id", ids);
      }
      await sa.from("org_users").delete().in("organization_id", oldOrgIds);
      await sa.from("org_legal_document_templates").delete().in("organization_id", oldOrgIds);
      await sa.from("seeker_organizations").delete().in("id", oldOrgIds);
      results.push(`Cleaned ${oldOrgs.length} old org(s)`);
    }

    // ─── Create org ───
    const { data: indiaRow } = await sa.from("countries").select("id").eq("code", "IN").maybeSingle();
    const orgId = crypto.randomUUID();
    const { error: orgErr } = await sa.from("seeker_organizations").insert({
      id: orgId, tenant_id: orgId, organization_name: config.orgName,
      trade_brand_name: "Mahindra", legal_entity_name: "Mahindra & Mahindra Limited",
      tagline: "Rise.",
      organization_description: "Mahindra & Mahindra Limited is a USD 21 billion multinational conglomerate headquartered in Mumbai, India.",
      website_url: "https://www.mahindra.com",
      founding_year: 1945, employee_count_range: "250000+", annual_revenue_range: "$15B-$25B",
      hq_city: "Mumbai", hq_country_id: indiaRow?.id ?? null, preferred_currency: "USD", timezone: "Asia/Kolkata",
      operating_model: config.operatingModel, governance_profile: config.governanceProfile,
      subscription_tier: config.subscriptionTier, phase1_bypass: config.phase1Bypass,
      is_enterprise: config.isEnterprise, is_active: true, verification_status: "verified", registration_step: 5,
    });
    if (orgErr) throw new Error(`Org: ${orgErr.message}`);
    results.push(`Org: "${config.orgName}"`);

    // ─── Tier governance access ───
    await sa.from("md_tier_governance_access").upsert([
      { tier_code: config.subscriptionTier, governance_mode: "QUICK", is_default: false },
      { tier_code: config.subscriptionTier, governance_mode: "STRUCTURED", is_default: false },
      { tier_code: config.subscriptionTier, governance_mode: "CONTROLLED", is_default: true },
    ], { onConflict: "tier_code,governance_mode", ignoreDuplicates: true });

    // ─── Seed 3 org CPA templates ───
    await sa.from("org_legal_document_templates").delete().eq("organization_id", orgId)
      .in("document_code", ["CPA_QUICK", "CPA_STRUCTURED", "CPA_CONTROLLED"]);
    for (const tpl of CPA_TEMPLATES) {
      const { error } = await sa.from("org_legal_document_templates").insert({
        organization_id: orgId, tenant_id: orgId,
        document_name: tpl.document_name, document_code: tpl.document_code,
        document_type: "challenge_participation_agreement",
        description: `CPA template for ${tpl.applies_to_mode} governance mode`,
        tier: "TIER_1", template_content: tpl.template_content,
        version: "1.0", version_status: "ACTIVE",
        applies_to_mode: tpl.applies_to_mode, is_mandatory: true, is_active: true,
        effective_date: new Date().toISOString().slice(0, 10),
      });
      if (error) results.push(`CPA ${tpl.document_code}: ${error.message}`);
    }
    results.push(`3 CPA templates seeded`);

    // ─── Platform doc content (SPA, SKPA, PWA) ───
    for (const [code, content] of Object.entries(PLATFORM_DOC_CONTENT)) {
      await sa.from("legal_document_templates")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("document_code", code).eq("is_active", true);
    }
    results.push(`Platform doc content updated`);

    // ─── Create users ───
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
        if (error) throw new Error(`User ${u.email}: ${error.message}`);
        userId = nu.user.id;
      }
      return { userId, roles: u.roles, displayName: u.displayName, email: u.email };
    });
    const users = await Promise.all(userPromises);
    results.push(`${users.length} users created/reset`);

    await Promise.all(users.map(async (r, i) => {
      await sa.from("org_users").delete().eq("user_id", r.userId);
      await sa.from("org_users").insert({ tenant_id: orgId, user_id: r.userId, organization_id: orgId, role: "member", is_active: true, invitation_status: "active" });
      await sa.from("user_roles").delete().eq("user_id", r.userId).eq("role", "seeker");
      await sa.from("user_roles").insert({ user_id: r.userId, role: "seeker", tenant_id: orgId });
      const [first, ...rest] = config.users[i].displayName.split(" ");
      await sa.from("profiles").update({ first_name: first, last_name: rest.join(" ") || "" }).eq("user_id", r.userId);
      credentials.push({ email: config.users[i].email, password: TEST_PASSWORD, roles: config.users[i].roles });
    }));

    // ─── Industry segments ───
    const { data: segments } = await sa.from("industry_segments").select("id, name").eq("is_active", true).order("display_order").limit(20);
    const seg = (p: RegExp) => segments?.find((s: { name: string }) => p.test(s.name))?.id ?? segments?.[0]?.id ?? null;
    const techId = seg(/technolog/i); const healthId = seg(/health/i);
    const financeId = seg(/financ/i); const energyId = seg(/energy/i);

    // ─── Helpers ───
    const challengeIds: string[] = [];
    const now = new Date().toISOString();
    const assignRole = async (uid: string, cid: string, rc: string) => {
      const { error } = await sa.from("user_challenge_roles").insert({ user_id: uid, challenge_id: cid, role_code: rc, is_active: true, auto_assigned: true });
      if (error && !error.message.includes("duplicate")) throw error;
    };
    const aggCr = find(users, "Chris Rivera"); const mpCr = find(users, "Maria Chen");
    const casey = find(users, "Casey Underwood"); const leslie = find(users, "Leslie Chen");
    const frank = find(users, "Frank Coleman"); const evelyn = find(users, "Evelyn Rhodes");
    const ethan = find(users, "Ethan Russell"); const paulCu = find(users, "Paul Curtis");
    const patLc = find(users, "Patricia Lee"); const petFc = find(users, "Peter Ford");
    const solo = find(users, "Sam Solo");

    // ═══ C1: CONTROLLED+AGG ═══
    const c1Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c1Id, tenant_id: orgId, organization_id: orgId, title: "AI-Driven Clinical Trial Patient Matching",
      hook: "Reduce clinical trial recruitment by 60% using AI/NLP on 12M+ EHRs",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Our pharmaceutical clients spend $41,000 per patient recruited for Phase II/III clinical trials. Current recruitment relies on manual chart review with only 3-5% of screened patients meeting eligibility. We need an AI platform that can parse EHR records across Epic/Cerner/Meditech, match patients against trial protocols in real-time, and provide a HIPAA-compliant dashboard with >85% sensitivity and >90% specificity.",
      scope: "Integration with Epic, Cerner, Meditech via HL7 FHIR R4. 47 hospital networks, 12M active records.",
      maturity_level: "PROTOTYPE", evaluation_method: "DELPHI", evaluator_count: 3,
      evaluation_criteria: { weighted_criteria: [{ name: "Matching Accuracy", weight: 30 }, { name: "EHR Integration", weight: 20 }, { name: "Scalability", weight: 15 }, { name: "HIPAA Compliance", weight: 15 }, { name: "Deployment Speed", weight: 10 }, { name: "Team Credentials", weight: 10 }] },
      currency_code: "USD", domain_tags: ["healthcare", "artificial-intelligence", "clinical-trials"], ip_model: "IP-EL",
      phase_schedule: { expected_timeline: "6-12" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 500000 },
      extended_brief: { creator_approval_required: true, context_background: "Healthcare division serves 15 of top 20 pharma companies." },
      industry_segment_id: healthId, created_by: aggCr?.userId ?? null,
    }, "C1");
    challengeIds.push(c1Id);
    if (aggCr) await assignRole(aggCr.userId, c1Id, "CR");
    if (casey) await assignRole(casey.userId, c1Id, "CU");
    if (leslie) await assignRole(leslie.userId, c1Id, "LC");
    if (frank) await assignRole(frank.userId, c1Id, "FC");
    if (evelyn) await assignRole(evelyn.userId, c1Id, "ER");
    if (ethan) await assignRole(ethan.userId, c1Id, "ER");

    // ═══ C2: CONTROLLED+MP ═══
    const c2Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c2Id, tenant_id: orgId, organization_id: orgId, title: "Global AML Transaction Monitoring System",
      hook: "Cut AML false positives by 70% across 500M+ daily transactions",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "MP", governance_profile: "CONTROLLED", governance_mode_override: "CONTROLLED",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Global financial institutions face $2.8T in money laundering annually. Our AML system processes 500M+ daily transactions across 40 jurisdictions but has a 95% false-positive rate. We need AI/ML-powered AML that reduces false positives by 70%+, supports real-time SWIFT/SEPA/ACH screening, and adapts to 40+ regulatory frameworks.",
      scope: "500M+ transactions/day, sub-second latency. Oracle FLEXCUBE + Actimize integration. 40+ jurisdictions.",
      maturity_level: "PROTOTYPE", evaluation_method: "DELPHI", evaluator_count: 3,
      evaluation_criteria: { weighted_criteria: [{ name: "False Positive Reduction", weight: 30 }, { name: "Regulatory Coverage", weight: 20 }, { name: "Processing Latency", weight: 20 }, { name: "Graph Analytics", weight: 15 }, { name: "Explainability", weight: 15 }] },
      currency_code: "USD", domain_tags: ["financial-services", "compliance", "machine-learning"], ip_model: "IP-EL",
      phase_schedule: { expected_timeline: "9-12" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 250000 },
      extended_brief: { creator_approval_required: true, context_background: "Financial Services practice supports 12 of top 25 global banks." },
      industry_segment_id: financeId, created_by: mpCr?.userId ?? null,
    }, "C2");
    challengeIds.push(c2Id);
    if (mpCr) await assignRole(mpCr.userId, c2Id, "CR");
    if (paulCu) await assignRole(paulCu.userId, c2Id, "CU");
    if (patLc) await assignRole(patLc.userId, c2Id, "LC");
    if (petFc) await assignRole(petFc.userId, c2Id, "FC");

    // ═══ C3: STRUCTURED+AGG ═══
    const c3Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c3Id, tenant_id: orgId, organization_id: orgId, title: "Predictive Quality Analytics for Automotive",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "AGG", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "We manage QA for 8 automotive OEM clients across 23 plants. Current SPC detects defects only after batch completion — 4.2% defect rate, $18M annual scrap costs. Need predictive analytics ingesting real-time sensor data to predict defects BEFORE completion.",
      scope: "23 plants, 1200+ machines, 50TB/month sensor data. MindSphere + SAP QM mandatory.",
      maturity_level: "POC", evaluation_method: "SINGLE", evaluator_count: 1,
      evaluation_criteria: { weighted_criteria: [{ name: "Prediction Accuracy", weight: 30 }, { name: "Latency", weight: 25 }, { name: "Integration Quality", weight: 20 }, { name: "Scalability", weight: 15 }, { name: "Timeline", weight: 10 }] },
      currency_code: "USD", domain_tags: ["manufacturing", "predictive-analytics", "IoT"], ip_model: "IP-NEL",
      phase_schedule: { expected_timeline: "3-6" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 75000 },
      extended_brief: { creator_approval_required: true },
      industry_segment_id: techId, created_by: aggCr?.userId ?? null,
    }, "C3");
    challengeIds.push(c3Id);
    if (aggCr) await assignRole(aggCr.userId, c3Id, "CR");
    if (casey) await assignRole(casey.userId, c3Id, "CU");

    // ═══ C4: STRUCTURED+MP ═══
    const c4Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c4Id, tenant_id: orgId, organization_id: orgId, title: "Smart Grid Energy Optimization Platform",
      status: "draft", master_status: "IN_PREPARATION", current_phase: 2, phase_status: "ACTIVE",
      operating_model: "MP", governance_profile: "STRUCTURED", governance_mode_override: "STRUCTURED",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Utility companies face increasing demand variability with distributed energy resources. Current static load forecasting has 12-hour lookahead, causing 8-15% energy waste. Need ML-driven platform to reduce waste by 40%+ while maintaining 99.97% reliability.",
      scope: "500K+ smart meter endpoints, 15-min intervals. SCADA + OpenADR 2.0 integration.",
      maturity_level: "POC", evaluation_method: "SINGLE", evaluator_count: 1,
      evaluation_criteria: { weighted_criteria: [{ name: "Waste Reduction", weight: 30 }, { name: "Forecast Accuracy", weight: 25 }, { name: "Reliability", weight: 20 }, { name: "Integration", weight: 15 }, { name: "Scalability", weight: 10 }] },
      currency_code: "USD", domain_tags: ["energy", "optimization", "smart-grid"], ip_model: "IP-NEL",
      phase_schedule: { expected_timeline: "3-6" },
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 50000 },
      extended_brief: { creator_approval_required: true },
      industry_segment_id: energyId, created_by: mpCr?.userId ?? null,
    }, "C4");
    challengeIds.push(c4Id);
    if (mpCr) await assignRole(mpCr.userId, c4Id, "CR");
    if (paulCu) await assignRole(paulCu.userId, c4Id, "CU");

    // ═══ C5: QUICK+AGG ═══
    const c5Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c5Id, tenant_id: orgId, organization_id: orgId, title: "Internal Carbon Footprint Tracker",
      status: "active", master_status: "ACTIVE", current_phase: 5, phase_status: "ACTIVE", published_at: now,
      operating_model: "AGG", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: true, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Mahindra Group committed to net-zero by 2035. Need prototype employee dashboard tracking individual/team carbon footprint using GHG Protocol Scope 1/2/3 factors.",
      currency_code: "USD", domain_tags: ["sustainability", "dashboard", "ESG"], ip_model: "IP-NEL",
      evaluation_method: "SINGLE", evaluator_count: 1,
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 10000 },
      extended_brief: { creator_approval_required: false },
      industry_segment_id: techId, lc_compliance_complete: true, fc_compliance_complete: true,
      created_by: solo?.userId ?? null,
    }, "C5");
    challengeIds.push(c5Id);
    if (solo) for (const r of ["CR","CU","ER","LC","FC"]) await assignRole(solo.userId, c5Id, r);

    // ═══ C6: QUICK+MP ═══
    const c6Id = crypto.randomUUID();
    await insertChallenge(sa, {
      id: c6Id, tenant_id: orgId, organization_id: orgId, title: "Customer Onboarding UX Ideas",
      status: "active", master_status: "ACTIVE", current_phase: 5, phase_status: "ACTIVE", published_at: now,
      operating_model: "MP", governance_profile: "QUICK", governance_mode_override: "QUICK",
      challenge_model_is_agg: false, challenge_visibility: "public", is_active: true, is_deleted: false, is_qa_closed: false, solutions_awarded: 0,
      problem_statement: "Our customer onboarding flow has 34% drop-off between account creation and first action. Need creative UX concepts that reduce drop-off to under 15%.",
      currency_code: "USD", domain_tags: ["ux-design", "onboarding", "customer-experience"], ip_model: "IP-NEL",
      evaluation_method: "SINGLE", evaluator_count: 1,
      reward_structure: { reward_type: "monetary", currency: "USD", platinum_award: 5000 },
      extended_brief: { creator_approval_required: false },
      industry_segment_id: techId, lc_compliance_complete: true, fc_compliance_complete: true,
      created_by: solo?.userId ?? null,
    }, "C6");
    challengeIds.push(c6Id);
    if (solo) for (const r of ["CR","CU","ER","LC","FC"]) await assignRole(solo.userId, c6Id, r);

    // ─── Assemble CPA per challenge ───
    const assembleForChallenge = async (cid: string, uid: string | null, label: string) => {
      if (!uid) return;
      const { error } = await sa.rpc("assemble_cpa", { p_challenge_id: cid, p_user_id: uid });
      if (error) results.push(`CPA assembly ${label}: ${error.message}`);
    };
    await assembleForChallenge(c1Id, aggCr?.userId ?? null, "C1");
    await assembleForChallenge(c2Id, mpCr?.userId ?? null, "C2");
    await assembleForChallenge(c3Id, aggCr?.userId ?? null, "C3");
    await assembleForChallenge(c4Id, mpCr?.userId ?? null, "C4");
    await assembleForChallenge(c5Id, solo?.userId ?? null, "C5");
    await assembleForChallenge(c6Id, solo?.userId ?? null, "C6");
    results.push(`CPA assembled for all 6 challenges`);

    // ─── Escrow (CONTROLLED only) ───
    for (const [cid, amt, lbl, by] of [[c1Id, 500000, "C1", aggCr?.userId], [c2Id, 250000, "C2", mpCr?.userId]] as [string, number, string, string | undefined][]) {
      const { error: eErr } = await sa.from("escrow_records").insert({ challenge_id: cid, deposit_amount: amt, currency: "USD", escrow_status: "PENDING", created_by: by ?? null });
      if (eErr) results.push(`Escrow ${lbl}: ${eErr.message}`);
    }

    // ─── Pool entries ───
    const poolEntries = [
      { name: "Casey Underwood", email: "nh-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
      { name: "Evelyn Rhodes", email: "nh-er1@testsetup.dev", codes: ["R7_MP", "R7_AGG"] },
      { name: "Frank Coleman", email: "nh-fc@testsetup.dev", codes: ["R8"] },
      { name: "Paul Curtis", email: "nh-pp-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
      { name: "Patricia Lee", email: "nh-pp-lc@testsetup.dev", codes: ["R9"] },
      { name: "Peter Ford", email: "nh-pp-fc@testsetup.dev", codes: ["R8"] },
    ];
    for (const e of poolEntries) {
      const uid = users.find(u => u.displayName === e.name)?.userId ?? null;
      const pd = { full_name: e.name, email: e.email, role_codes: e.codes, user_id: uid, max_concurrent: 10, current_assignments: 0, availability_status: "available", is_active: true, domain_scope: { industry_segment_ids: [], proficiency_area_ids: [], sub_domain_ids: [], speciality_ids: [] } };
      const { data: ex } = await sa.from("platform_provider_pool").select("id").eq("email", e.email).maybeSingle();
      if (ex) await sa.from("platform_provider_pool").update({ ...pd, updated_at: now }).eq("id", ex.id);
      else await sa.from("platform_provider_pool").insert(pd);
    }

    // ─── Summary ───
    results.push(`6 challenges seeded: C1=${c1Id.slice(0,8)} C2=${c2Id.slice(0,8)} C3=${c3Id.slice(0,8)} C4=${c4Id.slice(0,8)} C5=${c5Id.slice(0,8)} C6=${c6Id.slice(0,8)}`);

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
