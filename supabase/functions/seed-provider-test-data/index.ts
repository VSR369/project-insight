import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedResult {
  success: boolean;
  summary: {
    provider: { id: string; email: string; name: string };
    enrollments: { count: number; industries: string[] };
    proofPoints: { total: number; general: number; specialty: number };
    assessments: { count: number; avgScore: number };
    reviewers: { count: number; names: string[] };
    interviewSlots: { total: number; open: number };
    bookings: { count: number };
  };
  phases: string[];
  error?: string;
}

// Test provider constants
const TEST_PROVIDER_ID = "ce00180c-1ff5-4e48-8d79-d4eb7ada8070";
const TEST_PROVIDER_EMAIL = "provider@test.local";

// Proof point templates
const GENERAL_PROOF_POINTS = [
  { type: "project", category: "general", titleTemplate: "{industry} Process Optimization Project", descTemplate: "Led end-to-end implementation of process optimization initiative, resulting in 30% efficiency improvement and significant cost savings." },
  { type: "certification", category: "general", titleTemplate: "{industry} Professional Certification", descTemplate: "Industry-recognized credential demonstrating expertise in {industry} domain best practices and standards." },
];

const SPECIALTY_PROOF_POINTS = [
  { type: "case_study", category: "specialty", titleTemplate: "{speciality} Implementation Case Study", descTemplate: "Domain-specific solution deployment showcasing successful implementation of {speciality} practices with measurable business outcomes." },
  { type: "portfolio", category: "specialty", titleTemplate: "{speciality} Best Practices Framework", descTemplate: "Proven methodology for {speciality} implementations, developed through multiple successful client engagements." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const phases: string[] = [];
  const result: SeedResult = {
    success: false,
    summary: {
      provider: { id: TEST_PROVIDER_ID, email: TEST_PROVIDER_EMAIL, name: "" },
      enrollments: { count: 0, industries: [] },
      proofPoints: { total: 0, general: 0, specialty: 0 },
      assessments: { count: 0, avgScore: 0 },
      reviewers: { count: 0, names: [] },
      interviewSlots: { total: 0, open: 0 },
      bookings: { count: 0 },
    },
    phases,
  };

  try {
    // =========================================
    // PHASE 1: Clean existing test data
    // =========================================
    phases.push("Phase 1: Cleaning existing test data...");

    // Delete interview bookings
    await supabase.from("booking_reviewers").delete().eq("booking_id", 
      supabase.from("interview_bookings").select("id").eq("provider_id", TEST_PROVIDER_ID)
    );
    await supabase.from("interview_bookings").delete().eq("provider_id", TEST_PROVIDER_ID);

    // Delete assessment responses and attempts
    const { data: attempts } = await supabase
      .from("assessment_attempts")
      .select("id")
      .eq("provider_id", TEST_PROVIDER_ID);
    
    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map(a => a.id);
      await supabase.from("assessment_attempt_responses").delete().in("attempt_id", attemptIds);
      await supabase.from("assessment_results_rollup").delete().in("attempt_id", attemptIds);
    }
    await supabase.from("assessment_attempts").delete().eq("provider_id", TEST_PROVIDER_ID);

    // Delete proof points and related data
    const { data: proofPoints } = await supabase
      .from("proof_points")
      .select("id")
      .eq("provider_id", TEST_PROVIDER_ID);
    
    if (proofPoints && proofPoints.length > 0) {
      const ppIds = proofPoints.map(pp => pp.id);
      await supabase.from("proof_point_speciality_tags").delete().in("proof_point_id", ppIds);
      await supabase.from("proof_point_links").delete().in("proof_point_id", ppIds);
      await supabase.from("proof_point_files").delete().in("proof_point_id", ppIds);
    }
    await supabase.from("proof_points").delete().eq("provider_id", TEST_PROVIDER_ID);

    // Delete proficiency areas and specialities
    await supabase.from("provider_proficiency_areas").delete().eq("provider_id", TEST_PROVIDER_ID);
    await supabase.from("provider_specialities").delete().eq("provider_id", TEST_PROVIDER_ID);

    // Delete enrollments
    await supabase.from("provider_industry_enrollments").delete().eq("provider_id", TEST_PROVIDER_ID);

    phases.push("✓ Phase 1 complete: Cleaned existing test data");

    // =========================================
    // PHASE 2: Fetch reference data
    // =========================================
    phases.push("Phase 2: Fetching reference data...");

    // Get industries
    const { data: industries } = await supabase
      .from("industry_segments")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (!industries || industries.length < 4) {
      throw new Error("Need at least 4 active industry segments");
    }

    // Get expertise levels
    const { data: expertiseLevels } = await supabase
      .from("expertise_levels")
      .select("*")
      .eq("is_active", true)
      .order("level_number");

    if (!expertiseLevels || expertiseLevels.length < 3) {
      throw new Error("Need at least 3 active expertise levels");
    }

    // Get participation modes (find End-to-End)
    const { data: participationModes } = await supabase
      .from("participation_modes")
      .select("*")
      .eq("is_active", true);

    const endToEndMode = participationModes?.find(m => 
      m.code?.toLowerCase().includes("e2e") || 
      m.name?.toLowerCase().includes("end-to-end") ||
      m.name?.toLowerCase().includes("end to end")
    ) || participationModes?.[0];

    if (!endToEndMode) {
      throw new Error("No participation mode found");
    }

    // Get proficiency areas
    const { data: proficiencyAreas } = await supabase
      .from("proficiency_areas")
      .select("*")
      .eq("is_active", true);

    // Get specialities
    const { data: allSpecialities } = await supabase
      .from("specialities")
      .select("*, sub_domains(*, proficiency_areas(*))")
      .eq("is_active", true);

    phases.push(`✓ Phase 2 complete: Found ${industries.length} industries, ${expertiseLevels.length} expertise levels`);

    // =========================================
    // PHASE 3: Reset provider profile
    // =========================================
    phases.push("Phase 3: Resetting provider profile...");

    const { data: updatedProvider, error: providerError } = await supabase
      .from("solution_providers")
      .update({
        first_name: "John",
        last_name: "Provider",
        lifecycle_status: "registered",
        lifecycle_rank: 10,
        participation_mode_id: null,
        expertise_level_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", TEST_PROVIDER_ID)
      .select()
      .single();

    if (providerError) {
      throw new Error(`Failed to update provider: ${providerError.message}`);
    }

    result.summary.provider.name = `${updatedProvider.first_name} ${updatedProvider.last_name}`;
    phases.push("✓ Phase 3 complete: Reset provider to John Provider");

    // =========================================
    // PHASE 4: Create 4 industry enrollments
    // =========================================
    phases.push("Phase 4: Creating industry enrollments...");

    const enrollmentConfigs = [
      { industry: industries[0], expertiseLevel: expertiseLevels[0], isPrimary: true },
      { industry: industries[1], expertiseLevel: expertiseLevels[1], isPrimary: false },
      { industry: industries[2], expertiseLevel: expertiseLevels[0], isPrimary: false },
      { industry: industries[3], expertiseLevel: expertiseLevels[2], isPrimary: false },
    ];

    const createdEnrollments: any[] = [];

    for (const config of enrollmentConfigs) {
      const { data: enrollment, error: enrollError } = await supabase
        .from("provider_industry_enrollments")
        .insert({
          provider_id: TEST_PROVIDER_ID,
          industry_segment_id: config.industry.id,
          expertise_level_id: config.expertiseLevel.id,
          participation_mode_id: endToEndMode.id,
          lifecycle_status: "panel_scheduled",
          lifecycle_rank: 120,
          is_primary: config.isPrimary,
          organization: {
            name: `Test Organization - ${config.industry.name}`,
            type: "Corporate",
            employee_count: "100-500",
          },
          org_approval_status: "approved",
        })
        .select()
        .single();

      if (enrollError) {
        throw new Error(`Failed to create enrollment: ${enrollError.message}`);
      }

      createdEnrollments.push({
        ...enrollment,
        industryName: config.industry.name,
        expertiseLevelName: config.expertiseLevel.name,
      });
    }

    result.summary.enrollments.count = createdEnrollments.length;
    result.summary.enrollments.industries = createdEnrollments.map(e => e.industryName);
    phases.push(`✓ Phase 4 complete: Created ${createdEnrollments.length} enrollments`);

    // =========================================
    // PHASE 5: Assign proficiency areas
    // =========================================
    phases.push("Phase 5: Assigning proficiency areas...");

    for (const enrollment of createdEnrollments) {
      // Find proficiency areas matching industry + expertise
      const matchingAreas = proficiencyAreas?.filter(pa => 
        pa.industry_segment_id === enrollment.industry_segment_id &&
        pa.expertise_level_id === enrollment.expertise_level_id
      ) || [];

      // Take up to 2 proficiency areas
      const areasToAssign = matchingAreas.slice(0, 2);

      for (const area of areasToAssign) {
        await supabase.from("provider_proficiency_areas").insert({
          provider_id: TEST_PROVIDER_ID,
          enrollment_id: enrollment.id,
          proficiency_area_id: area.id,
        });
      }
    }

    phases.push("✓ Phase 5 complete: Assigned proficiency areas");

    // =========================================
    // PHASE 6: Create proof points
    // =========================================
    phases.push("Phase 6: Creating proof points...");

    let generalCount = 0;
    let specialtyCount = 0;

    for (const enrollment of createdEnrollments) {
      // Find specialities for this enrollment's industry
      const enrollmentSpecialities = allSpecialities?.filter(s => {
        const profArea = s.sub_domains?.proficiency_areas;
        return profArea?.industry_segment_id === enrollment.industry_segment_id;
      }) || [];

      // Create 2 general proof points
      for (const template of GENERAL_PROOF_POINTS) {
        const { data: pp } = await supabase
          .from("proof_points")
          .insert({
            provider_id: TEST_PROVIDER_ID,
            enrollment_id: enrollment.id,
            industry_segment_id: enrollment.industry_segment_id,
            title: template.titleTemplate.replace("{industry}", enrollment.industryName),
            description: template.descTemplate.replace("{industry}", enrollment.industryName),
            type: template.type,
            category: template.category,
            is_deleted: false,
          })
          .select()
          .single();

        if (pp) generalCount++;
      }

      // Create 2 specialty proof points
      for (let i = 0; i < SPECIALTY_PROOF_POINTS.length; i++) {
        const template = SPECIALTY_PROOF_POINTS[i];
        const speciality = enrollmentSpecialities[i] || enrollmentSpecialities[0];
        const specialityName = speciality?.name || enrollment.industryName;

        const { data: pp } = await supabase
          .from("proof_points")
          .insert({
            provider_id: TEST_PROVIDER_ID,
            enrollment_id: enrollment.id,
            industry_segment_id: enrollment.industry_segment_id,
            title: template.titleTemplate.replace("{speciality}", specialityName),
            description: template.descTemplate.replace("{speciality}", specialityName),
            type: template.type,
            category: "specialty",
            is_deleted: false,
          })
          .select()
          .single();

        if (pp && speciality) {
          // Tag with speciality
          await supabase.from("proof_point_speciality_tags").insert({
            proof_point_id: pp.id,
            speciality_id: speciality.id,
          });
          specialtyCount++;
        } else if (pp) {
          specialtyCount++;
        }
      }
    }

    result.summary.proofPoints = { total: generalCount + specialtyCount, general: generalCount, specialty: specialtyCount };
    phases.push(`✓ Phase 6 complete: Created ${generalCount + specialtyCount} proof points`);

    // =========================================
    // PHASE 7: Create assessment attempts
    // =========================================
    phases.push("Phase 7: Creating assessment attempts...");

    // Get questions from question bank
    const { data: questions } = await supabase
      .from("question_bank")
      .select("id, correct_option, speciality_id")
      .eq("is_active", true)
      .limit(100);

    if (!questions || questions.length < 20) {
      phases.push("⚠ Phase 7 skipped: Not enough questions in question bank");
    } else {
      let totalScore = 0;

      for (const enrollment of createdEnrollments) {
        // Create assessment attempt
        const { data: attempt, error: attemptError } = await supabase
          .from("assessment_attempts")
          .insert({
            provider_id: TEST_PROVIDER_ID,
            enrollment_id: enrollment.id,
            started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            submitted_at: new Date().toISOString(),
            time_limit_minutes: 60,
            total_questions: 20,
            answered_questions: 20,
            score_percentage: 85,
            is_passed: true,
          })
          .select()
          .single();

        if (attemptError) {
          console.error("Assessment attempt error:", attemptError);
          continue;
        }

        // Select 20 random questions
        const shuffledQuestions = [...questions].sort(() => Math.random() - 0.5).slice(0, 20);

        // Create responses (17 correct, 3 incorrect)
        for (let i = 0; i < shuffledQuestions.length; i++) {
          const q = shuffledQuestions[i];
          const isCorrect = i < 17; // First 17 are correct
          const selectedOption = isCorrect ? q.correct_option : ((q.correct_option % 4) + 1);

          await supabase.from("assessment_attempt_responses").insert({
            attempt_id: attempt.id,
            question_id: q.id,
            selected_option: selectedOption,
            is_correct: isCorrect,
            answered_at: new Date().toISOString(),
          });
        }

        totalScore += 85;
        result.summary.assessments.count++;
      }

      result.summary.assessments.avgScore = result.summary.assessments.count > 0 
        ? Math.round(totalScore / result.summary.assessments.count) 
        : 0;

      phases.push(`✓ Phase 7 complete: Created ${result.summary.assessments.count} assessments with avg score ${result.summary.assessments.avgScore}%`);
    }

    // =========================================
    // PHASE 8: Verify/create review panel members
    // =========================================
    phases.push("Phase 8: Verifying review panel members...");

    const { data: existingReviewers } = await supabase
      .from("panel_reviewers")
      .select("*")
      .eq("is_active", true)
      .eq("approval_status", "approved");

    if (!existingReviewers || existingReviewers.length === 0) {
      phases.push("⚠ Phase 8: No active reviewers found - creating test reviewer");

      // Create a test reviewer using the existing seed function
      const { data: seedResult } = await supabase.functions.invoke("seed-test-reviewer");
      
      if (seedResult?.success) {
        result.summary.reviewers.count = 1;
        result.summary.reviewers.names = ["Test Reviewer"];
      }
    } else {
      result.summary.reviewers.count = existingReviewers.length;
      result.summary.reviewers.names = existingReviewers.map(r => r.name);
    }

    phases.push(`✓ Phase 8 complete: ${result.summary.reviewers.count} active reviewers available`);

    // =========================================
    // PHASE 9: Create interview slots
    // =========================================
    phases.push("Phase 9: Creating interview slots...");

    const { data: reviewersForSlots } = await supabase
      .from("panel_reviewers")
      .select("id, name")
      .eq("is_active", true)
      .eq("approval_status", "approved");

    if (reviewersForSlots && reviewersForSlots.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      dayAfter.setHours(10, 0, 0, 0);

      for (const reviewer of reviewersForSlots) {
        // Delete existing future slots for this reviewer
        await supabase
          .from("interview_slots")
          .delete()
          .eq("reviewer_id", reviewer.id)
          .gt("start_at", new Date().toISOString());

        // Create 3 slots per reviewer
        const slots = [
          { start: new Date(tomorrow), end: new Date(new Date(tomorrow).setHours(10)) },
          { start: new Date(new Date(tomorrow).setHours(14)), end: new Date(new Date(tomorrow).setHours(15)) },
          { start: new Date(dayAfter), end: new Date(new Date(dayAfter).setHours(11)) },
        ];

        for (const slot of slots) {
          await supabase.from("interview_slots").insert({
            reviewer_id: reviewer.id,
            start_at: slot.start.toISOString(),
            end_at: slot.end.toISOString(),
            status: "open",
          });
        }

        result.summary.interviewSlots.total += 3;
        result.summary.interviewSlots.open += 3;
      }
    }

    phases.push(`✓ Phase 9 complete: Created ${result.summary.interviewSlots.total} interview slots`);

    // =========================================
    // PHASE 10: Create composite slots and bookings
    // =========================================
    phases.push("Phase 10: Creating composite slots and bookings...");

    // Track which slots are already booked to prevent double-booking
    const bookedSlotIds = new Set<string>();
    const bookedReviewerTimes = new Map<string, Set<string>>(); // reviewerId -> Set of start_at times

    // Get all open slots with reviewer industry/expertise info
    const { data: openSlots } = await supabase
      .from("interview_slots")
      .select(`
        id, start_at, end_at, status,
        panel_reviewers!inner(id, industry_segment_ids, expertise_level_ids)
      `)
      .eq("status", "open")
      .gt("start_at", new Date().toISOString());

    if (openSlots && openSlots.length > 0) {
      // Create composite slots and bookings for each enrollment
      for (const enrollment of createdEnrollments) {
        // Find matching slots (reviewer covers this industry + expertise)
        // AND slot is not already booked AND reviewer doesn't have another booking at this time
        const matchingSlots = openSlots.filter(slot => {
          // Skip if slot already booked
          if (bookedSlotIds.has(slot.id)) {
            return false;
          }

          const reviewer = slot.panel_reviewers as unknown as { 
            id: string; 
            industry_segment_ids: string[] | null; 
            expertise_level_ids: string[] | null 
          };

          // Skip if reviewer already has a booking at this time
          const reviewerBookedTimes = bookedReviewerTimes.get(reviewer.id);
          if (reviewerBookedTimes?.has(slot.start_at)) {
            return false;
          }

          return reviewer?.industry_segment_ids?.includes(enrollment.industry_segment_id) &&
                 reviewer?.expertise_level_ids?.includes(enrollment.expertise_level_id);
        });

        if (matchingSlots.length > 0) {
          // Use the first available matching slot
          const slotToBook = matchingSlots[0];
          const reviewer = slotToBook.panel_reviewers as unknown as { 
            id: string; 
            industry_segment_ids: string[] | null; 
            expertise_level_ids: string[] | null 
          };

          // Mark slot as booked in our tracking
          bookedSlotIds.add(slotToBook.id);
          if (!bookedReviewerTimes.has(reviewer.id)) {
            bookedReviewerTimes.set(reviewer.id, new Set());
          }
          bookedReviewerTimes.get(reviewer.id)!.add(slotToBook.start_at);

          // Create composite slot
          const { data: compositeSlot } = await supabase
            .from("composite_interview_slots")
            .insert({
              industry_segment_id: enrollment.industry_segment_id,
              expertise_level_id: enrollment.expertise_level_id,
              start_at: slotToBook.start_at,
              end_at: slotToBook.end_at,
              available_reviewer_count: 1,
              backing_slot_ids: [slotToBook.id],
              status: "booked",
            })
            .select()
            .single();

          if (compositeSlot) {
            // Create interview booking
            const { data: booking } = await supabase
              .from("interview_bookings")
              .insert({
                provider_id: TEST_PROVIDER_ID,
                enrollment_id: enrollment.id,
                composite_slot_id: compositeSlot.id,
                scheduled_at: slotToBook.start_at,
                status: "scheduled",
              })
              .select()
              .single();

            if (booking) {
              // Link booking to reviewer
              await supabase.from("booking_reviewers").insert({
                booking_id: booking.id,
                reviewer_id: reviewer.id,
                slot_id: slotToBook.id,
                status: "assigned",
              });

              // Update slot status
              await supabase
                .from("interview_slots")
                .update({ status: "booked" })
                .eq("id", slotToBook.id);

              result.summary.bookings.count++;
              result.summary.interviewSlots.open--;
            }
          }
        } else {
          phases.push(`⚠ No available slot for ${enrollment.industryName} - all matching reviewers are booked`);
        }
      }
    }

    phases.push(`✓ Phase 10 complete: Created ${result.summary.bookings.count} interview bookings`);

    // =========================================
    // COMPLETE
    // =========================================
    result.success = true;
    phases.push("🎉 All phases complete! Test data seeded successfully.");

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Seed error:", error);
    result.error = error instanceof Error ? error.message : "Unknown error";
    phases.push(`❌ Error: ${result.error}`);

    return new Response(JSON.stringify(result, null, 2), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
