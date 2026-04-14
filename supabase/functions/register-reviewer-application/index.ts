import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterReviewerRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  industrySegmentIds: string[];
  expertiseLevelIds: string[];
  yearsExperience?: number;
  timezone: string;
  whyJoinStatement: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const data: RegisterReviewerRequest = await req.json();

    // Validate required fields
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.industrySegmentIds || data.industrySegmentIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one industry segment is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.expertiseLevelIds || data.expertiseLevelIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one expertise level is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data.whyJoinStatement || data.whyJoinStatement.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Please provide a detailed statement (at least 50 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: "An account with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm for reviewers (they still need admin approval)
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        role_type: "reviewer",
      },
    });

    if (authError || !authData.user) {
      console.error("Auth user creation error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    // Create panel_reviewers record
    const { error: reviewerError } = await supabase
      .from("panel_reviewers")
      .insert({
        user_id: userId,
        name: fullName,
        email: data.email,
        phone: data.phone || null,
        industry_segment_ids: data.industrySegmentIds,
        expertise_level_ids: data.expertiseLevelIds,
        years_experience: data.yearsExperience || null,
        timezone: data.timezone,
        why_join_statement: data.whyJoinStatement,
        enrollment_source: "self_signup",
        approval_status: "pending",
        invitation_status: null,  // Self-signup applicants don't go through invitation flow
        is_active: false,
        created_at: new Date().toISOString(),
      });

    if (reviewerError) {
      console.error("Panel reviewer creation error:", reviewerError);
      // Try to clean up the auth user if reviewer record fails
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create reviewer application" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send confirmation email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "CogniBlend <onboarding@resend.dev>",
            to: [data.email],
            subject: "Your Reviewer Application Has Been Received",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">Application Received!</h1>
                <p>Dear ${data.firstName},</p>
                <p>Thank you for applying to become a panel reviewer at CogniBlend.</p>
                <p>Your application is now <strong>pending review</strong> by our admin team. We'll notify you once a decision has been made.</p>
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">What's Next?</h3>
                  <ul style="margin-bottom: 0;">
                    <li>Our team will review your application</li>
                    <li>You'll receive an email once approved</li>
                    <li>After approval, you can log in and set your availability</li>
                  </ul>
                </div>
                <p>Thank you for your interest in joining our reviewer panel!</p>
                <p style="color: #6b7280; font-size: 14px;">The CogniBlend Team</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Don't fail registration if email fails
      }
    }

    console.log(`Reviewer application created for ${data.email} (user_id: ${userId})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Application submitted successfully",
        data: { userId }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
