import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  TEST_ACCOUNTS, TEST_ORGANIZATIONS, getTestAccount, getTestPassword, modelApplicability,
  type OrgModel, type TestAccountDefinition,
} from "./test-account-catalog.ts";

export interface ResolvedAccount { userId: string; definition: TestAccountDefinition }
export interface ResolvedOrg { id: string; name: string; model: OrgModel }
export interface TestEnvironment {
  accounts: ResolvedAccount[];
  organizations: ResolvedOrg[];
  accountByEmail: Map<string, ResolvedAccount>;
  orgByModel: Map<OrgModel, ResolvedOrg>;
}

interface AuthUserSummary { id: string; email?: string }

export async function ensureTestAccount(
  serviceClient: SupabaseClient,
  definitionOrEmail: TestAccountDefinition | string,
  existingUsers?: AuthUserSummary[],
): Promise<ResolvedAccount> {
  const definition = typeof definitionOrEmail === "string" ? getTestAccount(definitionOrEmail) : definitionOrEmail;
  const users = existingUsers ?? (await serviceClient.auth.admin.listUsers({ perPage: 1000 })).data.users;
  const existing = users.find((user) => user.email === definition.email);
  let userId: string;
  if (existing) {
    userId = existing.id;
    const { error } = await serviceClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
      user_metadata: { first_name: definition.firstName, last_name: definition.lastName, role_type: definition.authRole },
    });
    if (error) throw new Error(`Auth update ${definition.email}: ${error.message}`);
  } else {
    const { data, error } = await serviceClient.auth.admin.createUser({
      email: definition.email,
      password: getTestPassword(definition.email),
      email_confirm: true,
      user_metadata: { first_name: definition.firstName, last_name: definition.lastName, role_type: definition.authRole },
    });
    if (error) throw new Error(`Auth create ${definition.email}: ${error.message}`);
    userId = data.user.id;
  }

  const { error: profileError } = await serviceClient.from("profiles").upsert({
    user_id: userId,
    email: definition.email,
    first_name: definition.firstName,
    last_name: definition.lastName,
  }, { onConflict: "user_id" });
  if (profileError) throw new Error(`Profile ${definition.email}: ${profileError.message}`);

  const { error: roleError } = await serviceClient.from("user_roles").upsert({
    user_id: userId,
    role: definition.authRole,
  }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(`Role ${definition.email}: ${roleError.message}`);

  if (definition.adminTier) {
    const { data: industry, error: industryError } = await serviceClient
      .from("industry_segments").select("id").eq("is_active", true).order("display_order").limit(1).single();
    if (industryError) throw new Error(`Admin industry expertise: ${industryError.message}`);
    const { error } = await serviceClient.from("platform_admin_profiles").upsert({
      user_id: userId,
      email: definition.email,
      full_name: `${definition.firstName} ${definition.lastName}`,
      phone: definition.phone,
      admin_tier: definition.adminTier,
      is_supervisor: definition.adminTier === "supervisor",
      industry_expertise: [industry.id],
      country_region_expertise: [],
      org_type_expertise: [],
    }, { onConflict: "user_id" });
    if (error) throw new Error(`Admin profile ${definition.email}: ${error.message}`);
  }
  return { userId, definition };
}

async function ensureSubscription(serviceClient: SupabaseClient, org: ResolvedOrg, actorId: string): Promise<void> {
  const { data: existing, error: existingError } = await serviceClient
    .from("seeker_subscriptions").select("id").eq("organization_id", org.id).eq("is_active", true).maybeSingle();
  if (existingError) throw new Error(`Subscription lookup ${org.name}: ${existingError.message}`);
  if (existing) return;
  const { data: tier, error: tierError } = await serviceClient
    .from("md_subscription_tiers").select("id, max_challenges").eq("code", "standard").eq("is_active", true).single();
  const { data: cycle, error: cycleError } = await serviceClient
    .from("md_billing_cycles").select("id").eq("code", "annual").eq("is_active", true).single();
  if (tierError || cycleError) throw new Error(`Standard subscription reference: ${tierError?.message ?? cycleError?.message}`);
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const { error } = await serviceClient.from("seeker_subscriptions").insert({
    tenant_id: org.id, organization_id: org.id, tier_id: tier.id, billing_cycle_id: cycle.id,
    status: "active", payment_type: "shadow", monthly_base_price: 0, discount_percentage: 0,
    effective_monthly_cost: 0, starts_at: start.toISOString(), ends_at: end.toISOString(),
    current_period_start: start.toISOString(), current_period_end: end.toISOString(),
    auto_renew: true, is_active: true, challenges_used: 0,
    challenge_limit_snapshot: tier.max_challenges ?? 0, max_solutions_snapshot: 0, created_by: actorId,
  });
  if (error) throw new Error(`Subscription ${org.name}: ${error.message}`);
}

export async function ensureCoreTestEnvironment(serviceClient: SupabaseClient): Promise<TestEnvironment> {
  const { data: authData, error: authError } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });
  if (authError) throw new Error(`List auth users: ${authError.message}`);
  const accounts: ResolvedAccount[] = [];
  for (const definition of TEST_ACCOUNTS) accounts.push(await ensureTestAccount(serviceClient, definition, authData.users));
  const accountByEmail = new Map(accounts.map((account) => [account.definition.email, account]));
  const supervisorId = accountByEmail.get("admin@test.local")!.userId;
  const primaryId = accountByEmail.get("soadmin@test.local")!.userId;
  const organizations: ResolvedOrg[] = TEST_ORGANIZATIONS.map((org) => ({ id: org.id, name: org.name, model: org.model }));

  for (const org of organizations) {
    const { error } = await serviceClient.from("seeker_organizations").upsert({
      id: org.id, tenant_id: org.id, organization_name: org.name, legal_entity_name: org.name,
      operating_model: org.model, governance_profile: "STRUCTURED", subscription_tier: "standard",
      verification_status: "verified", verified_at: new Date().toISOString(), verified_by: supervisorId,
      is_active: true, is_deleted: false, registration_step: 5, created_by: supervisorId, updated_by: supervisorId,
    }, { onConflict: "id" });
    if (error) throw new Error(`Organisation ${org.name}: ${error.message}`);
    await ensureSubscription(serviceClient, org, supervisorId);
  }

  for (const account of accounts) {
    for (const model of Object.keys(account.definition.orgRoles) as OrgModel[]) {
      const org = organizations.find((candidate) => candidate.model === model)!;
      const isAdmin = ["soadmin@test.local", "delegatedadmin@test.local"].includes(account.definition.email);
      const { error } = await serviceClient.from("org_users").upsert({
        tenant_id: org.id, organization_id: org.id, user_id: account.userId,
        role: isAdmin ? "tenant_admin" : "member", is_active: true, invitation_status: "active",
        joined_at: new Date().toISOString(), created_by: supervisorId,
      }, { onConflict: "user_id,organization_id" });
      if (error) throw new Error(`Organisation membership ${account.definition.email}: ${error.message}`);

      for (const roleCode of account.definition.orgRoles[model] ?? []) {
        const rolePayload = {
          org_id: org.id, user_id: account.userId, user_email: account.definition.email,
          user_name: `${account.definition.firstName} ${account.definition.lastName}`,
          role_code: roleCode, model_applicability: modelApplicability(roleCode), status: "active",
          activated_at: new Date().toISOString(), domain_tags: {}, created_by: primaryId,
        };
        const { data: existingRole, error: roleLookupError } = await serviceClient.from("role_assignments")
          .select("id").eq("org_id", org.id).eq("user_email", account.definition.email).eq("role_code", roleCode).maybeSingle();
        if (roleLookupError) throw new Error(`Organisation role lookup ${account.definition.email}/${roleCode}: ${roleLookupError.message}`);
        const { error: roleError } = existingRole
          ? await serviceClient.from("role_assignments").update(rolePayload).eq("id", existingRole.id)
          : await serviceClient.from("role_assignments").insert(rolePayload);
        if (roleError) throw new Error(`Organisation role ${account.definition.email}/${roleCode}: ${roleError.message}`);
      }
    }
  }

  for (const email of ["soadmin@test.local", "delegatedadmin@test.local"]) {
    const account = accountByEmail.get(email)!;
    const models: OrgModel[] = email === "soadmin@test.local" ? ["AGG", "MP"] : ["AGG"];
    for (const model of models) {
      const org = organizations.find((candidate) => candidate.model === model)!;
      const isPrimary = email === "soadmin@test.local";
      const adminPayload = {
        organization_id: org.id, user_id: account.userId, admin_tier: isPrimary ? "PRIMARY" : "DELEGATED",
        domain_scope: {}, designated_by: isPrimary ? null : primaryId, status: "active",
        activated_at: new Date().toISOString(), designation_method: isPrimary ? "SELF" : "DELEGATED",
        full_name: `${account.definition.firstName} ${account.definition.lastName}`,
        email, phone: account.definition.phone, created_by: isPrimary ? account.userId : primaryId,
      };
      const { data: existingAdmin, error: adminLookupError } = await serviceClient.from("seeking_org_admins")
        .select("id").eq("organization_id", org.id).eq("user_id", account.userId).maybeSingle();
      if (adminLookupError) throw new Error(`Organisation admin lookup ${email}/${model}: ${adminLookupError.message}`);
      const { error } = existingAdmin
        ? await serviceClient.from("seeking_org_admins").update(adminPayload).eq("id", existingAdmin.id)
        : await serviceClient.from("seeking_org_admins").insert(adminPayload);
      if (error) throw new Error(`Organisation admin ${email}/${model}: ${error.message}`);
    }
  }

  return { accounts, organizations, accountByEmail, orgByModel: new Map(organizations.map((org) => [org.model, org])) };
}
