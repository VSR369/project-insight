import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use service_role to bypass RLS and manage auth users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const TEST_PASSWORD = "CogniTest123!";
    const results: string[] = [];

    // ─── Step 1: Find existing @cogniblend.com users ───
    const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 100 });
    if (usersErr) throw new Error(`Failed to list users: ${usersErr.message}`);

    const cogniblendUsers = (users ?? []).filter(u => u.email?.endsWith("@cogniblend.com"));
    if (cogniblendUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "NO_USERS", message: "No @cogniblend.com users found. Create them first in Supabase Auth." } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const robertUser = cogniblendUsers.find(u => u.email === "robert@cogniblend.com");
    const rajeshUser = cogniblendUsers.find(u => u.email === "rajesh@cogniblend.com");
    const panelUser  = cogniblendUsers.find(u => u.email === "panel@cogniblend.com");

    if (!robertUser || !rajeshUser || !panelUser) {
      const missing = [
        !robertUser && "robert@cogniblend.com",
        !rajeshUser && "rajesh@cogniblend.com",
        !panelUser  && "panel@cogniblend.com",
      ].filter(Boolean);
      return new Response(
        JSON.stringify({ success: false, error: { code: "MISSING_USERS", message: `Missing users: ${missing.join(", ")}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Step 2: Reset passwords ───
    for (const user of [robertUser, rajeshUser, panelUser]) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: TEST_PASSWORD });
      if (error) throw new Error(`Password reset failed for ${user.email}: ${error.message}`);
      results.push(`✅ Password reset: ${user.email}`);
    }

    // ─── Step 3: Find 3 existing challenges ───
    const { data: challenges, error: chErr } = await supabaseAdmin
      .from("challenges")
      .select("id, title, organization_id, tenant_id")
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(3);

    if (chErr) throw new Error(`Failed to fetch challenges: ${chErr.message}`);
    if (!challenges || challenges.length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: { code: "INSUFFICIENT_CHALLENGES", message: `Need 3 challenges, found ${challenges?.length ?? 0}` } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [chDraft, chPhase2, chPhase3] = challenges;
    results.push(`📋 Using challenges: "${chDraft.title}", "${chPhase2.title}", "${chPhase3.title}"`);

    // ─── Step 4: Clean existing role assignments for these challenges ───
    for (const ch of challenges) {
      await supabaseAdmin.from("user_challenge_roles")
        .delete()
        .eq("challenge_id", ch.id);
    }
    results.push("🧹 Cleared existing role assignments");

    // ─── Step 5: Assign roles ───
    const roleAssignments = [
      // Robert: CR + CU on all 3
      ...challenges.map(ch => ({ user_id: robertUser.id, challenge_id: ch.id, role_code: "CR", is_active: true, auto_assigned: false })),
      ...challenges.map(ch => ({ user_id: robertUser.id, challenge_id: ch.id, role_code: "CU", is_active: true, auto_assigned: false })),
      // Rajesh: ID + ER on all 3
      ...challenges.map(ch => ({ user_id: rajeshUser.id, challenge_id: ch.id, role_code: "ID", is_active: true, auto_assigned: false })),
      ...challenges.map(ch => ({ user_id: rajeshUser.id, challenge_id: ch.id, role_code: "ER", is_active: true, auto_assigned: false })),
      // Panel: AM + FC on all 3
      ...challenges.map(ch => ({ user_id: panelUser.id, challenge_id: ch.id, role_code: "AM", is_active: true, auto_assigned: false })),
      ...challenges.map(ch => ({ user_id: panelUser.id, challenge_id: ch.id, role_code: "FC", is_active: true, auto_assigned: false })),
    ];

    const { error: roleErr } = await supabaseAdmin.from("user_challenge_roles").upsert(roleAssignments, {
      onConflict: "user_id,challenge_id,role_code",
    });
    if (roleErr) throw new Error(`Role assignment failed: ${roleErr.message}`);
    results.push(`👥 Assigned ${roleAssignments.length} role assignments across 3 challenges`);

    // ─── Step 6: Challenge content & phase advancement ───
    const sampleContent = {
      problem_statement: "How can we reduce energy consumption in commercial buildings by 30% using IoT sensor networks and predictive analytics?",
      scope: "Solutions must address HVAC optimization, lighting automation, and real-time monitoring dashboards for building managers.",
      deliverables: JSON.stringify(["Technical architecture document", "Proof of concept with 3-month pilot data", "Cost-benefit analysis", "Implementation roadmap"]),
      evaluation_criteria: JSON.stringify([
        { criterion: "Technical Innovation", weight: 30 },
        { criterion: "Feasibility", weight: 25 },
        { criterion: "Cost Effectiveness", weight: 20 },
        { criterion: "Scalability", weight: 15 },
        { criterion: "Environmental Impact", weight: 10 },
      ]),
      reward_structure: JSON.stringify({ first_place: 50000, second_place: 25000, third_place: 10000, currency: "USD" }),
      phase_schedule: JSON.stringify({
        phase_1: { duration_days: 14, label: "Draft & Setup" },
        phase_2: { duration_days: 21, label: "Content Development" },
        phase_3: { duration_days: 7, label: "Curation Review" },
        phase_4: { duration_days: 5, label: "ID Approval" },
      }),
      complexity_level: "MODERATE",
      complexity_score: 65,
      complexity_parameters: JSON.stringify({ technical_depth: "HIGH", domain_breadth: "MEDIUM", timeline_pressure: "LOW" }),
      maturity_level: "GROWTH",
      ip_model: "SHARED",
      eligibility: "Open to all registered solution providers with verified credentials in energy or IoT domains.",
    };

    // Challenge 1 stays in Phase 1 (Draft) — just fill content
    await supabaseAdmin.from("challenges").update({
      ...sampleContent,
      current_phase: 1,
      phase_status: "DRAFT",
      master_status: "ACTIVE",
    }).eq("id", chDraft.id);
    results.push(`📝 Challenge 1 (Draft): "${chDraft.title}"`);

    // Challenge 2 → Phase 2 (Creator active)
    await supabaseAdmin.from("challenges").update({
      ...sampleContent,
      current_phase: 2,
      phase_status: "ACTIVE",
      master_status: "ACTIVE",
    }).eq("id", chPhase2.id);
    results.push(`🚀 Challenge 2 (Phase 2): "${chPhase2.title}"`);

    // Challenge 3 → Phase 3 (Curation)
    await supabaseAdmin.from("challenges").update({
      ...sampleContent,
      current_phase: 3,
      phase_status: "ACTIVE",
      master_status: "ACTIVE",
    }).eq("id", chPhase3.id);
    results.push(`🔍 Challenge 3 (Phase 3): "${chPhase3.title}"`);

    // ─── Step 7: Legal docs for each challenge ───
    const legalDocs = challenges.flatMap(ch => [
      { challenge_id: ch.id, document_type: "NDA", tier: "TIER_1", status: "ATTACHED", template_version: "1.0", document_name: "Standard NDA" },
      { challenge_id: ch.id, document_type: "TERMS_OF_PARTICIPATION", tier: "TIER_1", status: "ATTACHED", template_version: "1.0", document_name: "Terms of Participation" },
      { challenge_id: ch.id, document_type: "IP_ASSIGNMENT", tier: "TIER_2", status: "ATTACHED", template_version: "1.0", document_name: "IP Assignment Agreement" },
    ]);

    // Delete existing legal docs first
    for (const ch of challenges) {
      await supabaseAdmin.from("challenge_legal_docs").delete().eq("challenge_id", ch.id);
    }
    const { error: legalErr } = await supabaseAdmin.from("challenge_legal_docs").insert(legalDocs);
    if (legalErr) results.push(`⚠️ Legal docs insert warning: ${legalErr.message}`);
    else results.push(`📄 Inserted ${legalDocs.length} legal document records`);

    // ─── Step 8: Amendment record for Phase 3 challenge ───
    await supabaseAdmin.from("amendment_records").delete().eq("challenge_id", chPhase3.id);
    const { error: amendErr } = await supabaseAdmin.from("amendment_records").insert({
      challenge_id: chPhase3.id,
      amendment_number: 1,
      reason: "Initial curation review — minor scope clarification requested",
      scope_of_change: "Scope and deliverables sections updated for clarity",
      status: "APPLIED",
      initiated_by: robertUser.id,
      version_before: 1,
      version_after: 2,
    });
    if (amendErr) results.push(`⚠️ Amendment record warning: ${amendErr.message}`);
    else results.push(`📝 Amendment record added for Phase 3 challenge`);

    // ─── Step 9: Audit trail entries ───
    const auditEntries = [
      { user_id: robertUser.id, challenge_id: chPhase2.id, action: "PHASE_ADVANCED", method: "SYSTEM", phase_from: 1, phase_to: 2, details: JSON.stringify({ reason: "Seeder: advanced to Phase 2" }) },
      { user_id: robertUser.id, challenge_id: chPhase3.id, action: "PHASE_ADVANCED", method: "SYSTEM", phase_from: 2, phase_to: 3, details: JSON.stringify({ reason: "Seeder: advanced to Phase 3" }) },
    ];
    const { error: auditErr } = await supabaseAdmin.from("audit_trail").insert(auditEntries);
    if (auditErr) results.push(`⚠️ Audit trail warning: ${auditErr.message}`);
    else results.push(`📊 Audit trail entries created`);

    results.push("");
    results.push("═══════════════════════════════════════");
    results.push("🎉 Seeding complete! Login credentials:");
    results.push(`  robert@cogniblend.com / ${TEST_PASSWORD}  (CR, CU)`);
    results.push(`  rajesh@cogniblend.com / ${TEST_PASSWORD}  (ID, ER)`);
    results.push(`  panel@cogniblend.com  / ${TEST_PASSWORD}  (AM, FC)`);
    results.push("═══════════════════════════════════════");

    return new Response(
      JSON.stringify({ success: true, data: { results } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: error.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
