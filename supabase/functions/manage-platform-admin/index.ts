import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const array = new Uint8Array(14);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

type AdminTier = "supervisor" | "senior_admin" | "admin";

const TIER_RANK: Record<AdminTier, number> = {
  supervisor: 3,
  senior_admin: 2,
  admin: 1,
};

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

    // Verify caller authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's profile and tier
    const { data: callerProfile } = await supabase
      .from("platform_admin_profiles")
      .select("id, is_supervisor, admin_tier")
      .eq("user_id", caller.id)
      .single();

    const callerTier = (callerProfile?.admin_tier || "admin") as AdminTier;

    // Only supervisor and senior_admin can manage admins
    if (TIER_RANK[callerTier] < TIER_RANK["senior_admin"]) {
      return new Response(
        JSON.stringify({ success: false, error: "Senior Admin or Supervisor access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create":
        return await handleCreate(supabase, body, caller.id, callerTier, corsHeaders);
      case "update":
        return await handleUpdate(supabase, body, caller.id, callerTier, corsHeaders);
      case "deactivate":
        return await handleDeactivate(supabase, body, caller.id, callerTier, corsHeaders);
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[manage-platform-admin] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCreate(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  callerId: string,
  callerTier: AdminTier,
  headers: Record<string, string>
): Promise<Response> {
  const {
    email,
    full_name,
    phone,
    is_supervisor,
    admin_tier: requestedTier,
    industry_expertise,
    country_region_expertise,
    org_type_expertise,
    max_concurrent_verifications,
    assignment_priority,
  } = body as Record<string, any>;

  if (!email || !full_name || !phone || !industry_expertise?.length) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required fields: email, full_name, phone, industry_expertise" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Determine target tier
  const targetTier: AdminTier = requestedTier || "admin";

  // Enforce hierarchy: can only create tiers below or equal to own (supervisor can create all, senior_admin can only create admin)
  if (TIER_RANK[targetTier] > TIER_RANK[callerTier]) {
    return new Response(
      JSON.stringify({ success: false, error: `You cannot create a ${targetTier}. Insufficient privileges.` }),
      { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // senior_admin can only create admin tier
  if (callerTier === "senior_admin" && targetTier !== "admin") {
    return new Response(
      JSON.stringify({ success: false, error: "Senior Admins can only create Admin-tier accounts" }),
      { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Check email uniqueness
  const { data: existing } = await supabase
    .from("platform_admin_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ success: false, error: "An admin with this email already exists" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Create auth user
  const generatedPassword = generateSecurePassword();
  const nameParts = (full_name as string).split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email as string,
    password: generatedPassword,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, role_type: "platform_admin", admin_tier: targetTier },
  });

  if (authError || !authData.user) {
    return new Response(
      JSON.stringify({ success: false, error: authError?.message || "Failed to create user" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // Insert profile
  await supabase.from("profiles").insert({
    user_id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
  });

  // Insert role
  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "platform_admin",
  });

  if (roleError) {
    await supabase.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to assign role" }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Insert platform_admin_profiles with tier
  const { data: adminProfile, error: profileError } = await supabase
    .from("platform_admin_profiles")
    .insert({
      user_id: userId,
      full_name,
      email,
      phone,
      is_supervisor: targetTier === "supervisor" || (is_supervisor || false),
      admin_tier: targetTier,
      industry_expertise,
      country_region_expertise: country_region_expertise || [],
      org_type_expertise: org_type_expertise || [],
      max_concurrent_verifications: max_concurrent_verifications || 10,
      assignment_priority: assignment_priority || 5,
      created_by: callerId,
    })
    .select("id")
    .single();

  if (profileError) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to create admin profile: " + profileError.message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Create metrics record
  await supabase.from("admin_performance_metrics").insert({ admin_id: adminProfile.id });

  // Audit log
  await supabase.from("platform_admin_profile_audit_log").insert({
    admin_id: adminProfile.id,
    event_type: "CREATED",
    actor_id: callerId,
    actor_type: callerTier.toUpperCase(),
    field_changed: "admin_tier",
    new_value: JSON.stringify(targetTier),
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: { admin_id: adminProfile.id, user_id: userId, generated_password: generatedPassword, admin_tier: targetTier },
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

async function handleUpdate(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  callerId: string,
  callerTier: AdminTier,
  headers: Record<string, string>
): Promise<Response> {
  const { admin_id, updates } = body as { admin_id: string; updates: Record<string, any> };

  if (!admin_id || !updates) {
    return new Response(
      JSON.stringify({ success: false, error: "admin_id and updates are required" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Only supervisors can change admin_tier
  if (updates.admin_tier && callerTier !== "supervisor") {
    return new Response(
      JSON.stringify({ success: false, error: "Only supervisors can change admin tier" }),
      { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Keep is_supervisor in sync with admin_tier
  if (updates.admin_tier) {
    updates.is_supervisor = updates.admin_tier === "supervisor";
  }

  // Get current values for diff
  const { data: current, error: fetchError } = await supabase
    .from("platform_admin_profiles")
    .select("full_name, phone, is_supervisor, admin_tier, industry_expertise, country_region_expertise, org_type_expertise, max_concurrent_verifications, assignment_priority, availability_status, leave_start_date, leave_end_date")
    .eq("id", admin_id)
    .single();

  if (fetchError || !current) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin profile not found" }),
      { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Senior admins can only edit admin-tier profiles
  const targetTier = (current as Record<string, any>).admin_tier as AdminTier;
  if (callerTier === "senior_admin" && targetTier !== "admin") {
    return new Response(
      JSON.stringify({ success: false, error: "Senior Admins can only edit Admin-tier profiles" }),
      { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Apply update
  const { error: updateError } = await supabase
    .from("platform_admin_profiles")
    .update({ ...updates, updated_by: callerId })
    .eq("id", admin_id);

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: updateError.message }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Generate field-level audit log entries
  const auditEntries = [];
  for (const [key, newValue] of Object.entries(updates)) {
    const oldValue = (current as Record<string, any>)[key];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      let eventType = "UPDATED";
      if (key === "availability_status") eventType = "AVAILABILITY_CHANGED";
      if (key === "is_supervisor") eventType = "SUPERVISOR_CHANGED";
      if (key === "admin_tier") eventType = "TIER_CHANGED";
      if (key === "leave_start_date" || key === "leave_end_date") eventType = "LEAVE_SCHEDULED";

      auditEntries.push({
        admin_id,
        event_type: eventType,
        actor_id: callerId,
        actor_type: callerTier.toUpperCase(),
        field_changed: key,
        old_value: JSON.stringify(oldValue),
        new_value: JSON.stringify(newValue),
      });
    }
  }

  if (auditEntries.length > 0) {
    await supabase.from("platform_admin_profile_audit_log").insert(auditEntries);
  }

  return new Response(
    JSON.stringify({ success: true, data: { admin_id, fields_updated: auditEntries.length } }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

async function handleDeactivate(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  callerId: string,
  callerTier: AdminTier,
  headers: Record<string, string>
): Promise<Response> {
  const { admin_id } = body as { admin_id: string };

  if (!admin_id) {
    return new Response(
      JSON.stringify({ success: false, error: "admin_id is required" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  // Only supervisors can deactivate
  if (callerTier !== "supervisor") {
    return new Response(
      JSON.stringify({ success: false, error: "Only supervisors can deactivate admins" }),
      { status: 403, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const { data: current } = await supabase
    .from("platform_admin_profiles")
    .select("availability_status, current_active_verifications")
    .eq("id", admin_id)
    .single();

  if (!current) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin profile not found" }),
      { status: 404, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  const { error: updateError } = await supabase
    .from("platform_admin_profiles")
    .update({ availability_status: "Inactive", updated_by: callerId })
    .eq("id", admin_id);

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: updateError.message }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }

  await supabase.from("platform_admin_profile_audit_log").insert({
    admin_id,
    event_type: "DEACTIVATED",
    actor_id: callerId,
    actor_type: "SUPERVISOR",
    field_changed: "availability_status",
    old_value: JSON.stringify(current.availability_status),
    new_value: JSON.stringify("Inactive"),
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: { admin_id, pending_verifications: current.current_active_verifications || 0 },
    }),
    { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
  );
}
