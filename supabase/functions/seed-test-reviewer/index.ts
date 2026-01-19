import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const testReviewerEmail = "reviewer@test.local";
    const testReviewerPassword = "Reviewer123!";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingReviewer = existingUsers?.users?.find(
      (u) => u.email === testReviewerEmail
    );

    let userId: string;

    if (existingReviewer) {
      console.log("Test reviewer already exists:", existingReviewer.id);
      userId = existingReviewer.id;
    } else {
      // Create the test reviewer user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testReviewerEmail,
        password: testReviewerPassword,
        email_confirm: true,
        user_metadata: {
          first_name: "Test",
          last_name: "Reviewer",
        },
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log("Created test reviewer user:", userId);
    }

    // Check if role already exists
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "panel_reviewer")
      .single();

    if (!existingRole) {
      // Assign panel_reviewer role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "panel_reviewer",
        });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        throw new Error(`Failed to assign role: ${roleError.message}`);
      }
      console.log("Assigned panel_reviewer role to user:", userId);
    } else {
      console.log("Role already assigned");
    }

    // Get industry segments and expertise levels for assignment
    const { data: industrySegments } = await supabaseAdmin
      .from("industry_segments")
      .select("id")
      .eq("is_active", true);

    const { data: expertiseLevels } = await supabaseAdmin
      .from("expertise_levels")
      .select("id")
      .eq("is_active", true);

    const industrySegmentIds = industrySegments?.map((s) => s.id) || [];
    const expertiseLevelIds = expertiseLevels?.map((l) => l.id) || [];

    // Check if panel_reviewers record exists
    const { data: existingPanelReviewer } = await supabaseAdmin
      .from("panel_reviewers")
      .select("id")
      .eq("email", testReviewerEmail)
      .single();

    if (!existingPanelReviewer) {
      // Create panel_reviewers record with industry/expertise assignments
      const { error: panelError } = await supabaseAdmin
        .from("panel_reviewers")
        .insert({
          user_id: userId,
          email: testReviewerEmail,
          name: "Test Reviewer",
          is_active: true,
          industry_segment_ids: industrySegmentIds,
          expertise_level_ids: expertiseLevelIds,
          timezone: "Asia/Calcutta",
          max_interviews_per_day: 4,
          invitation_status: "accepted",
          invitation_accepted_at: new Date().toISOString(),
        });

      if (panelError) {
        console.error("Error creating panel reviewer record:", panelError);
      } else {
        console.log("Created panel_reviewers record with", industrySegmentIds.length, "industries and", expertiseLevelIds.length, "levels");
      }
    } else {
      // Update existing panel reviewer with industry/expertise assignments
      const { error: updateError } = await supabaseAdmin
        .from("panel_reviewers")
        .update({
          industry_segment_ids: industrySegmentIds,
          expertise_level_ids: expertiseLevelIds,
          updated_at: new Date().toISOString(),
        })
        .eq("email", testReviewerEmail);

      if (updateError) {
        console.error("Error updating panel reviewer:", updateError);
      } else {
        console.log("Updated panel_reviewers with", industrySegmentIds.length, "industries and", expertiseLevelIds.length, "levels");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test reviewer account created/verified",
        userId,
        email: testReviewerEmail,
        password: testReviewerPassword,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Seed error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
