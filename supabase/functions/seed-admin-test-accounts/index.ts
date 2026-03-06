import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminAccount {
  email: string;
  password: string;
  adminTier: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    email: "admin@test.local",
    password: "Admin123!",
    adminTier: "supervisor",
    firstName: "Super",
    lastName: "Visor",
    phone: "+15550000001",
  },
  {
    email: "senioradmin@test.local",
    password: "SeniorAdmin123!",
    adminTier: "senior_admin",
    firstName: "Senior",
    lastName: "Admin",
    phone: "+15550000002",
  },
  {
    email: "basicadmin@test.local",
    password: "BasicAdmin123!",
    adminTier: "admin",
    firstName: "Basic",
    lastName: "Admin",
    phone: "+15550000003",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const phases: string[] = [];
    const results: { email: string; tier: string; status: string }[] = [];

    for (const account of ADMIN_ACCOUNTS) {
      phases.push(`--- Processing ${account.email} (${account.adminTier}) ---`);

      // 1. Auth user
      let userId: string;
      const existing = existingUsers?.users?.find((u) => u.email === account.email);

      if (existing) {
        userId = existing.id;
        phases.push(`✓ Auth user exists: ${userId}`);
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            first_name: account.firstName,
            last_name: account.lastName,
            role_type: "platform_admin",
          },
        });
        if (createError) {
          phases.push(`❌ Failed to create auth user: ${createError.message}`);
          results.push({ email: account.email, tier: account.adminTier, status: "failed" });
          continue;
        }
        userId = newUser.user.id;
        phases.push(`✓ Created auth user: ${userId}`);
      }

      // 2. user_roles
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "platform_admin")
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: userId, role: "platform_admin" });
        if (roleError) {
          phases.push(`❌ Failed to assign role: ${roleError.message}`);
        } else {
          phases.push(`✓ Assigned platform_admin role`);
        }
      } else {
        phases.push(`✓ Role already assigned`);
      }

      // 3. platform_admin_profiles
      const { data: existingProfile } = await supabaseAdmin
        .from("platform_admin_profiles")
        .select("id, admin_tier")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabaseAdmin
        .from("platform_admin_profiles")
        .insert({
          user_id: userId,
          email: account.email,
          full_name: `${account.firstName} ${account.lastName}`,
          admin_tier: account.adminTier,
          phone: account.phone,
          industry_expertise: ['41ee5438-f270-488c-aae1-b46c120bc276'],
        });
        if (profileError) {
          phases.push(`❌ Failed to create profile: ${profileError.message}`);
        } else {
          phases.push(`✓ Created platform_admin_profiles (tier: ${account.adminTier})`);
        }
      } else {
        // Ensure tier is correct
        if (existingProfile.admin_tier !== account.adminTier) {
          const { error: updateError } = await supabaseAdmin
            .from("platform_admin_profiles")
            .update({ admin_tier: account.adminTier })
            .eq("id", existingProfile.id);
          if (updateError) {
            phases.push(`❌ Failed to update tier: ${updateError.message}`);
          } else {
            phases.push(`✓ Updated tier from ${existingProfile.admin_tier} to ${account.adminTier}`);
          }
        } else {
          phases.push(`✓ Profile exists with correct tier`);
        }
      }

      results.push({ email: account.email, tier: account.adminTier, status: "ready" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts: results,
        phases,
        credentials: ADMIN_ACCOUNTS.map((a) => ({
          email: a.email,
          password: a.password,
          tier: a.adminTier,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Seed admin accounts error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
