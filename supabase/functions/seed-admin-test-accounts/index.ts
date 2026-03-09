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

const SO_ADMIN_ACCOUNT = {
  email: "soadmin@test.local",
  password: "SOAdmin123!",
  firstName: "Primary",
  lastName: "OrgAdmin",
  phone: "+15550000010",
};

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

    // ─── Platform Admin Accounts ───
    for (const account of ADMIN_ACCOUNTS) {
      phases.push(`--- Processing ${account.email} (${account.adminTier}) ---`);

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

      // user_roles
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

      // platform_admin_profiles
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

    // ─── Primary SO Admin Account ───
    phases.push(`--- Processing ${SO_ADMIN_ACCOUNT.email} (Primary SO Admin) ---`);

    let soUserId: string;
    const existingSoUser = existingUsers?.users?.find((u) => u.email === SO_ADMIN_ACCOUNT.email);

    if (existingSoUser) {
      soUserId = existingSoUser.id;
      phases.push(`✓ Auth user exists: ${soUserId}`);
    } else {
      const { data: newSoUser, error: soCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: SO_ADMIN_ACCOUNT.email,
        password: SO_ADMIN_ACCOUNT.password,
        email_confirm: true,
        user_metadata: {
          first_name: SO_ADMIN_ACCOUNT.firstName,
          last_name: SO_ADMIN_ACCOUNT.lastName,
          role_type: "seeker",
        },
      });
      if (soCreateError) {
        phases.push(`❌ Failed to create SO admin auth user: ${soCreateError.message}`);
        results.push({ email: SO_ADMIN_ACCOUNT.email, tier: "PRIMARY", status: "failed" });
      } else {
        soUserId = newSoUser.user.id;
        phases.push(`✓ Created auth user: ${soUserId}`);
      }
    }

    // Only proceed if we have a userId
    if (soUserId!) {
      // 1. user_roles → seeker
      const { data: existingSoRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", soUserId)
        .eq("role", "seeker")
        .maybeSingle();

      if (!existingSoRole) {
        const { error: roleErr } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: soUserId, role: "seeker" });
        phases.push(roleErr ? `❌ Failed to assign seeker role: ${roleErr.message}` : `✓ Assigned seeker role`);
      } else {
        phases.push(`✓ Seeker role already assigned`);
      }

      // 2. Find or create a seeker_organizations record
      let orgId: string;
      let tenantId: string;

      const { data: existingOrg } = await supabaseAdmin
        .from("seeker_organizations")
        .select("id, tenant_id")
        .limit(1)
        .maybeSingle();

      if (existingOrg) {
        orgId = existingOrg.id;
        tenantId = existingOrg.tenant_id ?? existingOrg.id;
        phases.push(`✓ Using existing org: ${orgId}`);
      } else {
        const { data: newOrg, error: orgErr } = await supabaseAdmin
          .from("seeker_organizations")
          .insert({
            organization_name: "Test Seeking Org",
            status: "verified",
            created_by: soUserId,
          })
          .select("id, tenant_id")
          .single();
        if (orgErr || !newOrg) {
          phases.push(`❌ Failed to create org: ${orgErr?.message}`);
          results.push({ email: SO_ADMIN_ACCOUNT.email, tier: "PRIMARY", status: "failed" });
          // Return early for SO admin but continue with response
          return new Response(
            JSON.stringify({ success: true, accounts: results, phases, credentials: ADMIN_ACCOUNTS.map((a) => ({ email: a.email, password: a.password, tier: a.adminTier })) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        orgId = newOrg.id;
        tenantId = newOrg.tenant_id ?? newOrg.id;
        phases.push(`✓ Created org: ${orgId}`);
      }

      // 3. org_users mapping
      const { data: existingOrgUser } = await supabaseAdmin
        .from("org_users")
        .select("id")
        .eq("user_id", soUserId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!existingOrgUser) {
        const { error: ouErr } = await supabaseAdmin
          .from("org_users")
          .insert({
            user_id: soUserId,
            organization_id: orgId,
            tenant_id: tenantId,
            role: "tenant_admin",
            is_active: true,
            invitation_status: "active",
            joined_at: new Date().toISOString(),
            created_by: soUserId,
          });
        phases.push(ouErr ? `❌ Failed to create org_users: ${ouErr.message}` : `✓ Created org_users mapping`);
      } else {
        phases.push(`✓ org_users mapping exists`);
      }

      // 4. seeking_org_admins record
      const { data: existingSoAdmin } = await supabaseAdmin
        .from("seeking_org_admins")
        .select("id")
        .eq("user_id", soUserId)
        .eq("organization_id", orgId)
        .maybeSingle();

      if (!existingSoAdmin) {
        // Use raw SQL via PostgREST rpc to handle jsonb domain_scope properly
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: "{}",
        });
        // Direct insert using supabase admin client with explicit jsonb cast workaround
        const { error: soaErr } = await supabaseAdmin
          .from("seeking_org_admins")
          .insert({
            user_id: soUserId,
            organization_id: orgId,
            admin_tier: "PRIMARY",
            status: "active",
            designation_method: "SELF",
            full_name: `${SO_ADMIN_ACCOUNT.firstName} ${SO_ADMIN_ACCOUNT.lastName}`,
            email: SO_ADMIN_ACCOUNT.email,
            phone: SO_ADMIN_ACCOUNT.phone,
            created_by: soUserId,
          });
        if (soaErr) {
          phases.push(`❌ Failed to create seeking_org_admins: ${soaErr.message}`);
          // If default domain_scope '{}' fails trigger, update it after
        } else {
          // Update domain_scope to "ALL" for PRIMARY admin
          const { error: updateErr } = await supabaseAdmin
            .from("seeking_org_admins")
            .update({ domain_scope: "ALL" as any })
            .eq("user_id", soUserId)
            .eq("organization_id", orgId);
          if (updateErr) {
            phases.push(`✓ Created seeking_org_admins but failed to set domain_scope: ${updateErr.message}`);
          } else {
            phases.push(`✓ Created seeking_org_admins (PRIMARY)`);
          }
        }
      } else {
        phases.push(`✓ seeking_org_admins record exists`);
      }

      results.push({ email: SO_ADMIN_ACCOUNT.email, tier: "PRIMARY", status: "ready" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        accounts: results,
        phases,
        credentials: [
          ...ADMIN_ACCOUNTS.map((a) => ({
            email: a.email,
            password: a.password,
            tier: a.adminTier,
          })),
          {
            email: SO_ADMIN_ACCOUNT.email,
            password: SO_ADMIN_ACCOUNT.password,
            tier: "PRIMARY (SO Admin)",
          },
        ],
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
