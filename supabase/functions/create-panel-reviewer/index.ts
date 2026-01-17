import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateReviewerRequest {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  industry_segment_ids: string[];
  expertise_level_ids: string[];
  years_experience?: number;
  timezone?: string;
  languages?: string[];
  max_interviews_per_day?: number;
  is_active?: boolean;
  notes?: string;
}

// Generate secure 12-character password
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the calling user's ID from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the caller is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if caller is platform_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "platform_admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: CreateReviewerRequest = await req.json();
    const {
      name,
      email,
      phone,
      password,
      industry_segment_ids,
      expertise_level_ids,
      years_experience,
      timezone = "Asia/Calcutta",
      languages = [],
      max_interviews_per_day = 4,
      is_active = true,
      notes,
    } = body;

    console.log("[create-panel-reviewer] Request received:", {
      name,
      email,
      hasPassword: !!password,
      industryCount: industry_segment_ids?.length,
      levelCount: expertise_level_ids?.length,
    });

    // Validate required fields
    if (!name || !email || !industry_segment_ids?.length || !expertise_level_ids?.length) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: name, email, industry_segment_ids, expertise_level_ids" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists in panel_reviewers
    const { data: existingReviewer } = await supabase
      .from("panel_reviewers")
      .select("id")
      .eq("email", email)
      .single();

    if (existingReviewer) {
      return new Response(
        JSON.stringify({ success: false, error: "A reviewer with this email already exists" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate password if not provided
    const finalPassword = password || generateSecurePassword();

    let userId: string;
    let isExistingUser = false;

    // Step 1: Check if user already exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === email);

    if (existingAuthUser) {
      // User exists in auth - use their ID
      userId = existingAuthUser.id;
      isExistingUser = true;
      console.log("[create-panel-reviewer] Using existing auth user:", userId);
    } else {
      // Create new user in Supabase Auth
      const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          name,
          role: "panel_reviewer",
        },
      });

      if (createAuthError) {
        console.error("[create-panel-reviewer] Auth user creation failed:", createAuthError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to create user: ${createAuthError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = authData.user.id;
      console.log("[create-panel-reviewer] Auth user created:", userId);
    }

    // Step 2: Check if role already exists, if not assign it
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "panel_reviewer")
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "panel_reviewer",
          created_by: caller.id,
        });

      if (roleError) {
        console.error("[create-panel-reviewer] Role assignment failed:", roleError);
        // Cleanup only if we created the user
        if (!isExistingUser) {
          await supabase.auth.admin.deleteUser(userId);
        }
        return new Response(
          JSON.stringify({ success: false, error: `Failed to assign role: ${roleError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Step 3: Create panel_reviewers record
    const { data: reviewer, error: reviewerError } = await supabase
      .from("panel_reviewers")
      .insert({
        user_id: userId,
        name,
        email,
        phone,
        industry_segment_ids,
        expertise_level_ids,
        years_experience,
        timezone,
        languages,
        max_interviews_per_day,
        is_active,
        notes,
        invitation_status: "DRAFT",
        created_by: caller.id,
      })
      .select()
      .single();

    if (reviewerError) {
      console.error("[create-panel-reviewer] Reviewer record creation failed:", reviewerError);
      // Cleanup only if we created the user
      if (!isExistingUser) {
        await supabase.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create reviewer: ${reviewerError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[create-panel-reviewer] Reviewer created successfully:", reviewer.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          reviewer_id: reviewer.id,
          user_id: userId,
          email,
          password: isExistingUser ? undefined : finalPassword, // Only return password for new users
          isExistingUser,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[create-panel-reviewer] Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
