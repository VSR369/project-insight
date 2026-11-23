import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createServiceClient, errorStatus, requireSupervisor } from "../_shared/test-function-auth.ts";
import { ensureTestAccount } from "../_shared/test-environment.ts";

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const serviceClient = createServiceClient();
    const supervisorId = await requireSupervisor(request, serviceClient);
    const account = await ensureTestAccount(serviceClient, "provider@test.local");
    const [{ data: industry, error: industryError }, { data: level, error: levelError }, { data: modes, error: modeError }] = await Promise.all([
      serviceClient.from("industry_segments").select("id, name").eq("is_active", true).order("display_order").limit(1).single(),
      serviceClient.from("expertise_levels").select("id, name").eq("is_active", true).order("level_number").limit(1).single(),
      serviceClient.from("participation_modes").select("id, code, name").eq("is_active", true),
    ]);
    if (industryError || levelError || modeError) throw new Error(industryError?.message ?? levelError?.message ?? modeError?.message);
    const participationMode = modes?.[0];
    if (!participationMode) throw new Error("No active participation mode");

    const { data: provider, error: providerError } = await serviceClient.from("solution_providers").upsert({
      user_id: account.userId,
      first_name: account.definition.firstName,
      last_name: account.definition.lastName,
      industry_segment_id: industry.id,
      expertise_level_id: level.id,
      participation_mode_id: participationMode.id,
      lifecycle_status: "certified",
      lifecycle_rank: 150,
      onboarding_status: "completed",
      verification_status: "verified",
      profile_completion_percentage: 100,
      profile_strength: 100,
      phone: account.definition.phone,
      updated_by: supervisorId,
    }, { onConflict: "user_id" }).select("id, user_id, first_name, last_name, lifecycle_status, lifecycle_rank").single();
    if (providerError) throw new Error(`Provider profile: ${providerError.message}`);

    const { data: existingEnrollment, error: enrollmentLookupError } = await serviceClient
      .from("provider_industry_enrollments").select("id").eq("provider_id", provider.id).eq("is_primary", true).maybeSingle();
    if (enrollmentLookupError) throw new Error(`Enrollment lookup: ${enrollmentLookupError.message}`);
    let enrollmentId = existingEnrollment?.id as string | undefined;
    if (!enrollmentId) {
      const { data: enrollment, error } = await serviceClient.from("provider_industry_enrollments").insert({
        provider_id: provider.id,
        industry_segment_id: industry.id,
        expertise_level_id: level.id,
        participation_mode_id: participationMode.id,
        lifecycle_status: "certified",
        lifecycle_rank: 150,
        is_primary: true,
        organization: { name: "CogniTest Provider Experience", type: "Corporate" },
        org_approval_status: "approved",
        expertise_review_status: "verified",
        proof_points_review_status: "completed",
        certification_level: "proven",
        star_rating: 1,
        certified_at: new Date().toISOString(),
        certified_by: supervisorId,
        created_by: account.userId,
        updated_by: supervisorId,
      }).select("id").single();
      if (error) throw new Error(`Enrollment: ${error.message}`);
      enrollmentId = enrollment.id;
    }

    const { data: area } = await serviceClient.from("proficiency_areas").select("id")
      .eq("industry_segment_id", industry.id).eq("expertise_level_id", level.id).eq("is_active", true).limit(1).maybeSingle();
    if (area) {
      await serviceClient.from("provider_proficiency_areas").upsert({
        provider_id: provider.id, enrollment_id: enrollmentId, proficiency_area_id: area.id,
      }, { onConflict: "provider_id,enrollment_id,proficiency_area_id" });
    }
    const { data: speciality } = await serviceClient.from("specialities").select("id, name, sub_domains!inner(proficiency_area_id)")
      .eq("sub_domains.proficiency_area_id", area?.id ?? "").eq("is_active", true).limit(1).maybeSingle();

    const { data: existingProofPoints, error: proofLookupError } = await serviceClient
      .from("proof_points").select("id, category").eq("provider_id", provider.id).eq("is_deleted", false);
    if (proofLookupError) throw new Error(`Proof point lookup: ${proofLookupError.message}`);
    const categories = new Set((existingProofPoints ?? []).map((row) => row.category));
    const proofPointIds: string[] = [];
    if (!categories.has("general")) {
      const { data, error } = await serviceClient.from("proof_points").insert({
        provider_id: provider.id, enrollment_id: enrollmentId, industry_segment_id: industry.id,
        title: `${industry.name} delivery experience`, description: "Verified test evidence of end-to-end solution delivery.",
        type: "project", category: "general", is_deleted: false,
      }).select("id").single();
      if (error) throw new Error(`General proof point: ${error.message}`);
      proofPointIds.push(data.id);
    }
    if (!categories.has("specialty_specific")) {
      const { data, error } = await serviceClient.from("proof_points").insert({
        provider_id: provider.id, enrollment_id: enrollmentId, industry_segment_id: industry.id,
        title: `${speciality?.name ?? industry.name} specialist case`, description: "Verified specialty-specific test evidence with measurable outcomes.",
        type: "case_study", category: "specialty_specific", is_deleted: false,
      }).select("id").single();
      if (error) throw new Error(`Specialty proof point: ${error.message}`);
      proofPointIds.push(data.id);
      if (speciality) {
        await serviceClient.from("proof_point_speciality_tags").upsert({
          proof_point_id: data.id, speciality_id: speciality.id,
        }, { onConflict: "proof_point_id,speciality_id" });
        await serviceClient.from("provider_specialities").upsert({
          provider_id: provider.id, enrollment_id: enrollmentId, speciality_id: speciality.id,
        }, { onConflict: "provider_id,enrollment_id,speciality_id" });
      }
    }

    const { data: assessment, error: assessmentLookupError } = await serviceClient
      .from("assessment_attempts").select("id").eq("provider_id", provider.id).not("submitted_at", "is", null).limit(1).maybeSingle();
    if (assessmentLookupError) throw new Error(`Assessment lookup: ${assessmentLookupError.message}`);
    if (!assessment) {
      const { error } = await serviceClient.from("assessment_attempts").insert({
        provider_id: provider.id, enrollment_id: enrollmentId, started_at: new Date(Date.now() - 3600000).toISOString(),
        submitted_at: new Date().toISOString(), time_limit_minutes: 60, total_questions: 20,
        answered_questions: 20, score_percentage: 85, is_passed: true,
      });
      if (error) throw new Error(`Assessment: ${error.message}`);
    }

    const { data: certification, error: certificationError } = await serviceClient.from("provider_certifications").upsert({
      provider_id: provider.id, enrollment_id: enrollmentId, cert_path: "experience", star_tier: 1,
      cert_label: "proven", composite_score: 85, status: "active", awarded_at: new Date().toISOString(), awarded_by: supervisorId,
    }, { onConflict: "provider_id,cert_path,status" }).select("id, status, cert_label, star_tier").single();
    if (certificationError) throw new Error(`Certification: ${certificationError.message}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        provider: { id: provider.id, email: account.definition.email, lifecycleStatus: provider.lifecycle_status },
        enrollmentId,
        proofPointsCreated: proofPointIds.length,
        certification,
        credentialPolicy: "Password remains only in its project secret.",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: { code: "SEED_ERROR", message: error instanceof Error ? error.message : "Unknown error" } }), {
      status: errorStatus(error), headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
