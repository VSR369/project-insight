import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "CogniTest2026!";

// ═══════════════════════════════════════════
// User definitions per org
// ═══════════════════════════════════════════

interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  orgRoles: string[];          // role_assignments codes (R2, R3, etc.)
  challengeRoles: string[];    // user_challenge_roles codes (AM, CR, etc.)
}

const MP_USERS: TestUser[] = [
  { email: "mp-solo@cognitest.dev",      firstName: "MP",  lastName: "Solo Founder",  orgRoles: ["R2","R3","R5_MP","R6_MP","R7_MP","R8","R9"], challengeRoles: ["CR","CU","ER","LC","FC"] },
  { email: "mp-architect@cognitest.dev",  firstName: "MP",  lastName: "Architect",     orgRoles: ["R3"],       challengeRoles: ["CR"] },
  { email: "mp-curator@cognitest.dev",    firstName: "MP",  lastName: "Curator",       orgRoles: ["R5_MP"],    challengeRoles: ["CU"] },
  { email: "mp-director@cognitest.dev",   firstName: "MP",  lastName: "Curator 2",     orgRoles: ["R6_MP"],    challengeRoles: ["CU"] },
  { email: "mp-reviewer@cognitest.dev",   firstName: "MP",  lastName: "Reviewer",      orgRoles: ["R7_MP"],    challengeRoles: ["ER"] },
  { email: "mp-finance@cognitest.dev",    firstName: "MP",  lastName: "Finance",       orgRoles: ["R8"],       challengeRoles: ["FC"] },
  { email: "mp-legal@cognitest.dev",      firstName: "MP",  lastName: "Legal",         orgRoles: ["R9"],       challengeRoles: ["LC"] },
];

const AGG_USERS: TestUser[] = [
  { email: "agg-solo@cognitest.dev",     firstName: "AGG", lastName: "Solo Founder",  orgRoles: ["R2","R4","R5_AGG","R6_AGG","R7_AGG","R8","R9","R10_CR"], challengeRoles: ["RQ","CR","CU","ID","ER","LC","FC"] },
  { email: "agg-creator@cognitest.dev",  firstName: "AGG", lastName: "Creator",       orgRoles: ["R4"],        challengeRoles: ["CR"] },
  { email: "agg-curator@cognitest.dev",  firstName: "AGG", lastName: "Curator",       orgRoles: ["R5_AGG"],    challengeRoles: ["CU"] },
  { email: "agg-director@cognitest.dev", firstName: "AGG", lastName: "Director",      orgRoles: ["R6_AGG"],    challengeRoles: ["ID"] },
  { email: "agg-reviewer@cognitest.dev", firstName: "AGG", lastName: "Reviewer",      orgRoles: ["R7_AGG"],    challengeRoles: ["ER"] },
  { email: "agg-finance@cognitest.dev",  firstName: "AGG", lastName: "Finance",       orgRoles: ["R8"],        challengeRoles: ["FC"] },
  { email: "agg-legal@cognitest.dev",    firstName: "AGG", lastName: "Legal",         orgRoles: ["R9"],        challengeRoles: ["LC"] },
];

// Model applicability for role_assignments
function getModelApplicability(roleCode: string): string {
  if (["R3","R5_MP","R6_MP","R7_MP"].includes(roleCode)) return "mp";
  if (["R4","R5_AGG","R6_AGG","R7_AGG","R10_CR"].includes(roleCode)) return "agg";
  return "both"; // R2, R8, R9
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: string[] = [];
    const allUsers = [...MP_USERS, ...AGG_USERS];

    // ─── Step 1: Create/update auth users + profiles ───
    const userIdMap = new Map<string, string>();

    for (const u of allUsers) {
      // Try to find existing user
      const { data: { users: existing } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const found = (existing ?? []).find((eu: { email?: string }) => eu.email === u.email);

      let userId: string;
      if (found) {
        userId = found.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: TEST_PASSWORD });
        results.push(`♻️ Reset password: ${u.email}`);
      } else {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: TEST_PASSWORD,
          email_confirm: true,
        });
        if (createErr) throw new Error(`Failed to create user ${u.email}: ${createErr.message}`);
        userId = created.user.id;
        results.push(`✅ Created user: ${u.email}`);
      }
      userIdMap.set(u.email, userId);

      // Upsert profile
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          user_id: userId,
          email: u.email,
          first_name: u.firstName,
          last_name: u.lastName,
        }, { onConflict: "user_id" });
      if (profileErr) results.push(`⚠️ Profile upsert for ${u.email}: ${profileErr.message}`);
    }

    // ─── Step 2: Create organizations ───
    const mpOrgId = crypto.randomUUID();
    const aggOrgId = crypto.randomUUID();

    // MP Org
    const { error: mpOrgErr } = await supabaseAdmin.from("seeker_organizations").upsert({
      id: mpOrgId,
      tenant_id: mpOrgId,
      organization_name: "CogniTest Marketplace Corp",
      operating_model: "MP",
      governance_profile: "QUICK",
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      is_active: true,
      registration_step: 5,
      max_concurrent_active: 10,
      max_cumulative_quota: 50,
    }, { onConflict: "id" });
    if (mpOrgErr) throw new Error(`MP org creation failed: ${mpOrgErr.message}`);
    results.push(`🏢 Created MP Org: CogniTest Marketplace Corp`);

    // AGG Org
    const { error: aggOrgErr } = await supabaseAdmin.from("seeker_organizations").upsert({
      id: aggOrgId,
      tenant_id: aggOrgId,
      organization_name: "CogniTest Aggregator Corp",
      operating_model: "AGG",
      governance_profile: "STRUCTURED",
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      is_active: true,
      is_enterprise: true,
      registration_step: 5,
      max_concurrent_active: 20,
      max_cumulative_quota: 100,
    }, { onConflict: "id" });
    if (aggOrgErr) throw new Error(`AGG org creation failed: ${aggOrgErr.message}`);
    results.push(`🏢 Created AGG Org: CogniTest Aggregator Corp`);

    // ─── Step 3: Create org_users ───
    for (const u of MP_USERS) {
      const userId = userIdMap.get(u.email)!;
      const { error } = await supabaseAdmin.from("org_users").upsert({
        user_id: userId,
        organization_id: mpOrgId,
        tenant_id: mpOrgId,
        role: "member",
        is_active: true,
        joined_at: new Date().toISOString(),
      }, { onConflict: "user_id,organization_id", ignoreDuplicates: true });
      if (error) results.push(`⚠️ org_users MP ${u.email}: ${error.message}`);
    }

    for (const u of AGG_USERS) {
      const userId = userIdMap.get(u.email)!;
      const { error } = await supabaseAdmin.from("org_users").upsert({
        user_id: userId,
        organization_id: aggOrgId,
        tenant_id: aggOrgId,
        role: "member",
        is_active: true,
        joined_at: new Date().toISOString(),
      }, { onConflict: "user_id,organization_id", ignoreDuplicates: true });
      if (error) results.push(`⚠️ org_users AGG ${u.email}: ${error.message}`);
    }
    results.push(`👥 Created org_users for both orgs`);

    // ─── Step 4: Create seeking_org_admins (primary admin = solo user) ───
    const mpSoloId = userIdMap.get("mp-solo@cognitest.dev")!;
    const aggSoloId = userIdMap.get("agg-solo@cognitest.dev")!;

    const { error: mpAdminErr } = await supabaseAdmin.from("seeking_org_admins").upsert({
      organization_id: mpOrgId,
      user_id: mpSoloId,
      email: "mp-solo@cognitest.dev",
      full_name: "MP Solo Founder",
      admin_tier: "PRIMARY",
      status: "active",
      activated_at: new Date().toISOString(),
      designation_method: "SELF",
      domain_scope: {},
    }, { onConflict: "organization_id,user_id", ignoreDuplicates: true });
    if (mpAdminErr) results.push(`⚠️ MP admin: ${mpAdminErr.message}`);

    const { error: aggAdminErr } = await supabaseAdmin.from("seeking_org_admins").upsert({
      organization_id: aggOrgId,
      user_id: aggSoloId,
      email: "agg-solo@cognitest.dev",
      full_name: "AGG Solo Founder",
      admin_tier: "PRIMARY",
      status: "active",
      activated_at: new Date().toISOString(),
      designation_method: "SELF",
      domain_scope: {},
    }, { onConflict: "organization_id,user_id", ignoreDuplicates: true });
    if (aggAdminErr) results.push(`⚠️ AGG admin: ${aggAdminErr.message}`);
    results.push(`🔑 Created seeking_org_admins for both orgs`);

    // ─── Step 5: Create role_assignments (Layer 1) ───
    // MP roles: created by Platform Admin
    for (const u of MP_USERS) {
      const userId = userIdMap.get(u.email)!;
      for (const roleCode of u.orgRoles) {
        const { error } = await supabaseAdmin.from("role_assignments").upsert({
          org_id: mpOrgId,
          user_id: userId,
          user_email: u.email,
          user_name: `${u.firstName} ${u.lastName}`,
          role_code: roleCode,
          model_applicability: getModelApplicability(roleCode),
          status: "active",
          activated_at: new Date().toISOString(),
          domain_tags: {},
        }, { onConflict: "org_id,user_email,role_code", ignoreDuplicates: true });
        if (error) results.push(`⚠️ role_assign MP ${u.email}/${roleCode}: ${error.message}`);
      }
    }
    results.push(`📋 Created MP role_assignments (Platform Admin)`);

    // AGG roles: created by Seeking Org Admin
    for (const u of AGG_USERS) {
      const userId = userIdMap.get(u.email)!;
      for (const roleCode of u.orgRoles) {
        const { error } = await supabaseAdmin.from("role_assignments").upsert({
          org_id: aggOrgId,
          user_id: userId,
          user_email: u.email,
          user_name: `${u.firstName} ${u.lastName}`,
          role_code: roleCode,
          model_applicability: getModelApplicability(roleCode),
          status: "active",
          activated_at: new Date().toISOString(),
          domain_tags: {},
        }, { onConflict: "org_id,user_email,role_code", ignoreDuplicates: true });
        if (error) results.push(`⚠️ role_assign AGG ${u.email}/${roleCode}: ${error.message}`);
      }
    }
    results.push(`📋 Created AGG role_assignments (Seeking Org Admin)`);

    // ─── Step 6: Create challenges (3 per org) ───
    const challengeIds: { mp: string[]; agg: string[] } = { mp: [], agg: [] };
    const phases = [
      { phase: 1, status: "draft",    masterStatus: "DRAFT",  title: "Phase 1 – Draft" },
      { phase: 2, status: "active",   masterStatus: "ACTIVE", title: "Phase 2 – Active" },
      { phase: 3, status: "active",   masterStatus: "ACTIVE", title: "Phase 3 – Curation" },
    ];

    for (const model of ["MP", "AGG"] as const) {
      const orgId = model === "MP" ? mpOrgId : aggOrgId;
      const orgName = model === "MP" ? "Marketplace" : "Aggregator";

      for (const p of phases) {
        const chId = crypto.randomUUID();
        (model === "MP" ? challengeIds.mp : challengeIds.agg).push(chId);

        const { error } = await supabaseAdmin.from("challenges").insert({
          id: chId,
          organization_id: orgId,
          tenant_id: orgId,
          title: `${orgName} Test Challenge – ${p.title}`,
          description: `Auto-seeded ${orgName} challenge for testing at phase ${p.phase}.`,
          status: p.status,
          master_status: p.masterStatus,
          current_phase: p.phase,
          operating_model: model,
          governance_profile: model === "MP" ? "QUICK" : "STRUCTURED",
          maturity_level: model === "MP" ? "QUICK_STANDARD" : "STRUCTURED_STANDARD",
          ip_model: "SHARED",
          visibility: "PRIVATE",
          is_active: true,
          is_deleted: false,
          problem_statement: `This is a test problem statement for ${orgName} model at phase ${p.phase}.`,
          scope: `Test scope for phase ${p.phase} challenge.`,
          eligibility: "OPEN",
          complexity_level: "MODERATE",
        });
        if (error) results.push(`⚠️ Challenge ${orgName} P${p.phase}: ${error.message}`);
      }
      results.push(`🏆 Created 3 challenges for ${orgName}`);
    }

    // ─── Step 7: Create user_challenge_roles (Layer 2) ───
    for (const u of MP_USERS) {
      const userId = userIdMap.get(u.email)!;
      for (const chId of challengeIds.mp) {
        for (const roleCode of u.challengeRoles) {
          const { error } = await supabaseAdmin.from("user_challenge_roles").upsert({
            user_id: userId,
            challenge_id: chId,
            role_code: roleCode,
            is_active: true,
            auto_assigned: false,
            assigned_by: mpSoloId,
          }, { onConflict: "user_id,challenge_id,role_code", ignoreDuplicates: true });
          if (error) results.push(`⚠️ ucr MP ${u.email}/${roleCode}: ${error.message}`);
        }
      }
    }

    for (const u of AGG_USERS) {
      const userId = userIdMap.get(u.email)!;
      for (const chId of challengeIds.agg) {
        for (const roleCode of u.challengeRoles) {
          const { error } = await supabaseAdmin.from("user_challenge_roles").upsert({
            user_id: userId,
            challenge_id: chId,
            role_code: roleCode,
            is_active: true,
            auto_assigned: false,
            assigned_by: aggSoloId,
          }, { onConflict: "user_id,challenge_id,role_code", ignoreDuplicates: true });
          if (error) results.push(`⚠️ ucr AGG ${u.email}/${roleCode}: ${error.message}`);
        }
      }
    }
    results.push(`🎭 Created user_challenge_roles for all challenges`);

    // ─── Step 8: Legal docs for phase 2+ challenges ───
    const legalDocs = [
      { document_type: "NDA", tier: "TIER_1" },
      { document_type: "TERMS_OF_ENGAGEMENT", tier: "TIER_1" },
      { document_type: "IP_ASSIGNMENT", tier: "TIER_2" },
    ];

    for (const model of ["mp", "agg"] as const) {
      const chIds = challengeIds[model];
      for (let i = 1; i < chIds.length; i++) { // skip phase 1 (draft)
        for (const doc of legalDocs) {
          const { error } = await supabaseAdmin.from("challenge_legal_docs").insert({
            challenge_id: chIds[i],
            document_type: doc.document_type,
            tier: doc.tier,
            status: "Default Applied",
            maturity_level: model === "mp" ? "QUICK_STANDARD" : "STRUCTURED_STANDARD",
          });
          if (error) results.push(`⚠️ legal doc ${model}/${doc.document_type}: ${error.message}`);
        }
      }
    }
    results.push(`📄 Created legal docs for active challenges`);

    // ─── Step 9: Audit trail entries ───
    for (const model of ["mp", "agg"] as const) {
      const chIds = challengeIds[model];
      const actorId = model === "mp" ? mpSoloId : aggSoloId;
      for (let i = 0; i < chIds.length; i++) {
        const { error } = await supabaseAdmin.from("audit_trail").insert({
          challenge_id: chIds[i],
          user_id: actorId,
          action: i === 0 ? "CHALLENGE_CREATED" : `PHASE_ADVANCED_TO_${i + 1}`,
          method: "seed-cogni-master",
          phase_from: i === 0 ? null : i,
          phase_to: i + 1,
          details: { seeded: true, model: model.toUpperCase() },
        });
        if (error) results.push(`⚠️ audit ${model} ch${i}: ${error.message}`);
      }
    }
    results.push(`📝 Created audit trail entries`);

    // ─── Step 10: Q&A on phase 3 challenges ───
    for (const model of ["mp", "agg"] as const) {
      const chId = challengeIds[model][2]; // phase 3
      const askerId = model === "mp"
        ? userIdMap.get("mp-architect@cognitest.dev")!
        : userIdMap.get("agg-creator@cognitest.dev")!;
      const answererId = model === "mp" ? mpSoloId : aggSoloId;

      const { error } = await supabaseAdmin.from("challenge_qa").insert({
        challenge_id: chId,
        asked_by: askerId,
        question_text: `Test question for ${model.toUpperCase()} phase 3 challenge – What are the submission guidelines?`,
        answered_by: answererId,
        answer_text: "Please follow the standard submission template provided in the challenge package.",
        answered_at: new Date().toISOString(),
        is_published: true,
        is_closed: false,
      });
      if (error) results.push(`⚠️ Q&A ${model}: ${error.message}`);
    }
    results.push(`❓ Created Q&A entries for phase 3 challenges`);

    // ─── Step 11: Amendment record on phase 3 challenges ───
    for (const model of ["mp", "agg"] as const) {
      const chId = challengeIds[model][2];
      const { error } = await supabaseAdmin.from("amendment_records").insert({
        challenge_id: chId,
        amendment_number: 1,
        reason: "Updated evaluation criteria based on curator feedback",
        scope_of_change: "EVALUATION_CRITERIA",
        status: "approved",
        version_before: 1,
        version_after: 2,
        initiated_by: model === "mp" ? mpSoloId : aggSoloId,
      });
      if (error) results.push(`⚠️ amendment ${model}: ${error.message}`);
    }
    results.push(`📝 Created amendment records for phase 3 challenges`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results,
          orgs: {
            mp: { id: mpOrgId, name: "CogniTest Marketplace Corp" },
            agg: { id: aggOrgId, name: "CogniTest Aggregator Corp" },
          },
          userCount: allUsers.length,
          challengeCount: 6,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
