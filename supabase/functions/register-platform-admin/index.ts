import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RegisterAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accessCode: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: RegisterAdminRequest = await req.json();
    const { email, password, firstName, lastName, accessCode } = body;

    if (!email || !password || !firstName || !lastName || !accessCode) {
      return new Response(
        JSON.stringify({ success: false, error: "All fields are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the access code for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(accessCode);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // Validate access code
    const { data: codeRecord, error: codeError } = await supabase
      .from("admin_access_codes")
      .select("id, is_used, expires_at, admin_tier")
      .eq("code_hash", codeHash)
      .maybeSingle();

    if (codeError || !codeRecord) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid access code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codeRecord.is_used) {
      return new Response(
        JSON.stringify({ success: false, error: "This access code has already been used" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "This access code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Derive tier from access code
    const adminTier = codeRecord.admin_tier || "admin";

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: "An account with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_type: "platform_admin",
        admin_tier: adminTier,
      },
    });

    if (authError || !authData.user) {
      console.error("[register-platform-admin] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Insert profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
    });

    if (profileError) {
      console.error("[register-platform-admin] Profile insert error:", profileError);
    }

    // Insert user_roles record
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "platform_admin",
    });

    if (roleError) {
      console.error("[register-platform-admin] Role insert error:", roleError);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to assign admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get default industry for placeholder
    const { data: defaultIndustry } = await supabase
      .from("industry_segments")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();

    const industryExpertise = defaultIndustry ? [defaultIndustry.id] : [];

    // Create platform_admin_profiles record with tier
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("platform_admin_profiles")
      .insert({
        user_id: userId,
        full_name: `${firstName} ${lastName}`,
        email,
        phone: "",
        is_supervisor: adminTier === "supervisor",
        admin_tier: adminTier,
        industry_expertise: industryExpertise,
        availability_status: "Available",
        created_by: userId,
      })
      .select("id")
      .single();

    if (adminProfileError) {
      console.error("[register-platform-admin] Admin profile error:", adminProfileError);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create admin profile: " + adminProfileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create performance metrics record
    if (adminProfile) {
      await supabase.from("admin_performance_metrics").insert({
        admin_id: adminProfile.id,
      });
    }

    // Mark access code as used
    await supabase
      .from("admin_access_codes")
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("id", codeRecord.id);

    // Insert audit log
    if (adminProfile) {
      await supabase.from("platform_admin_profile_audit_log").insert({
        admin_id: adminProfile.id,
        event_type: "CREATED",
        actor_id: userId,
        actor_type: "SELF",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: userId,
          admin_profile_id: adminProfile?.id,
          admin_tier: adminTier,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[register-platform-admin] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
