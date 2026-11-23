export type AuthRole = "platform_admin" | "seeker" | "solution_provider" | "panel_reviewer";
export type OrgModel = "AGG" | "MP";
export type AdminTier = "admin" | "senior_admin" | "supervisor";

export interface TestAccountDefinition {
  email: string;
  secretName: string;
  roleLabel: string;
  firstName: string;
  lastName: string;
  phone: string;
  authRole: AuthRole;
  adminTier?: AdminTier;
  orgRoles: Partial<Record<OrgModel, readonly string[]>>;
}

export interface TestOrgDefinition {
  id: string;
  name: string;
  model: OrgModel;
}

export const TEST_ORGANIZATIONS: readonly TestOrgDefinition[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "CogniTest Aggregator Corp", model: "AGG" },
  { id: "10000000-0000-4000-8000-000000000002", name: "CogniTest Marketplace Corp", model: "MP" },
];

export const TEST_ACCOUNTS: readonly TestAccountDefinition[] = [
  {
    email: "basicadmin@test.local", secretName: "TEST_PLATFORM_ADMIN_PASSWORD", roleLabel: "Platform Admin",
    firstName: "Platform", lastName: "Admin", phone: "+15550000003", authRole: "platform_admin", adminTier: "admin", orgRoles: {},
  },
  {
    email: "senioradmin@test.local", secretName: "TEST_SENIOR_ADMIN_PASSWORD", roleLabel: "Senior Admin",
    firstName: "Senior", lastName: "Admin", phone: "+15550000002", authRole: "platform_admin", adminTier: "senior_admin", orgRoles: {},
  },
  {
    email: "admin@test.local", secretName: "TEST_SUPERVISOR_PASSWORD", roleLabel: "Supervisor",
    firstName: "Super", lastName: "Visor", phone: "+15550000001", authRole: "platform_admin", adminTier: "supervisor", orgRoles: {},
  },
  {
    email: "soadmin@test.local", secretName: "TEST_PRIMARY_ORG_ADMIN_PASSWORD", roleLabel: "Primary Seeking Organisation Admin",
    firstName: "Primary", lastName: "OrgAdmin", phone: "+15550000010", authRole: "seeker", orgRoles: { AGG: [], MP: [] },
  },
  {
    email: "delegatedadmin@test.local", secretName: "TEST_DELEGATED_ADMIN_PASSWORD", roleLabel: "Delegated Admin",
    firstName: "Delegated", lastName: "OrgAdmin", phone: "+15550000011", authRole: "seeker", orgRoles: { AGG: [] },
  },
  {
    email: "creator-r4@test.local", secretName: "TEST_CREATOR_R4_PASSWORD", roleLabel: "Creator (R4)",
    firstName: "Aggregator", lastName: "Creator", phone: "+15550000012", authRole: "seeker", orgRoles: { AGG: ["R4"] },
  },
  {
    email: "curator@test.local", secretName: "TEST_CURATOR_PASSWORD", roleLabel: "Curator",
    firstName: "Test", lastName: "Curator", phone: "+15550000013", authRole: "seeker", orgRoles: { AGG: ["R5_AGG"], MP: ["R5_MP"] },
  },
  {
    email: "legal@test.local", secretName: "TEST_LEGAL_COORDINATOR_PASSWORD", roleLabel: "Legal Coordinator",
    firstName: "Legal", lastName: "Coordinator", phone: "+15550000014", authRole: "seeker", orgRoles: { AGG: ["R9"], MP: ["R9"] },
  },
  {
    email: "finance@test.local", secretName: "TEST_FINANCE_COORDINATOR_PASSWORD", roleLabel: "Finance Coordinator",
    firstName: "Finance", lastName: "Coordinator", phone: "+15550000015", authRole: "seeker", orgRoles: { AGG: ["R8"], MP: ["R8"] },
  },
  {
    email: "expert@test.local", secretName: "TEST_EXPERT_REVIEWER_PASSWORD", roleLabel: "Expert Reviewer",
    firstName: "Expert", lastName: "Reviewer", phone: "+15550000016", authRole: "seeker", orgRoles: { AGG: ["R7_AGG"], MP: ["R7_MP"] },
  },
  {
    email: "agg-decision@test.local", secretName: "TEST_AGG_DECISION_MAKER_PASSWORD", roleLabel: "Aggregator decision-maker (R6_AGG)",
    firstName: "Aggregator", lastName: "DecisionMaker", phone: "+15550000017", authRole: "seeker", orgRoles: { AGG: ["R6_AGG"] },
  },
  {
    email: "mp-decision@test.local", secretName: "TEST_MP_DECISION_MAKER_PASSWORD", roleLabel: "Marketplace decision-maker (R2)",
    firstName: "Marketplace", lastName: "DecisionMaker", phone: "+15550000018", authRole: "seeker", orgRoles: { MP: ["R2"] },
  },
  {
    email: "provider@test.local", secretName: "TEST_PROVIDER_PASSWORD", roleLabel: "Solution Provider (certified)",
    firstName: "Certified", lastName: "Provider", phone: "+15550000019", authRole: "solution_provider", orgRoles: {},
  },
  {
    email: "reviewer@test.local", secretName: "TEST_PANEL_REVIEWER_PASSWORD", roleLabel: "Panel Reviewer",
    firstName: "Panel", lastName: "Reviewer", phone: "+15550000020", authRole: "panel_reviewer", orgRoles: {},
  },
];

export function getTestAccount(email: string): TestAccountDefinition {
  const account = TEST_ACCOUNTS.find((candidate) => candidate.email === email);
  if (!account) throw new Error(`Unknown test account: ${email}`);
  return account;
}

export function getTestPassword(email: string): string {
  const account = getTestAccount(email);
  const password = Deno.env.get(account.secretName);
  if (!password) throw new Error(`Missing project secret for ${email}: ${account.secretName}`);
  return password;
}

export function modelApplicability(roleCode: string): string {
  if (["R3", "R5_MP", "R6_MP", "R7_MP"].includes(roleCode)) return "mp";
  if (["R4", "R5_AGG", "R6_AGG", "R7_AGG", "R10_CR"].includes(roleCode)) return "agg";
  return "both";
}
