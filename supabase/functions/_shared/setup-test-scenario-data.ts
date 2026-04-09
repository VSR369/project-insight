/**
 * Shared constants/data for setup-test-scenario edge function.
 * Extracted to reduce bundle size and avoid deploy timeouts.
 */

export interface UserDef { email: string; displayName: string; roles: string[] }
export interface ScenarioConfig {
  orgName: string; operatingModel: string; governanceProfile: string;
  subscriptionTier: string; phase1Bypass: boolean; isEnterprise: boolean;
  users: UserDef[];
}

export const TEST_PASSWORD = "TestSetup2026!";

export const SCENARIOS: Record<string, ScenarioConfig> = {
  new_horizon_demo: {
    orgName: "Mahindra & Mahindra Limited",
    operatingModel: "AGG",
    governanceProfile: "CONTROLLED",
    subscriptionTier: "premium",
    phase1Bypass: false,
    isEnterprise: true,
    users: [
      { email: "nh-cr@testsetup.dev", displayName: "Chris Rivera", roles: ["CR"] },
      { email: "nh-cu@testsetup.dev", displayName: "Casey Underwood", roles: ["CU"] },
      { email: "nh-er1@testsetup.dev", displayName: "Evelyn Rhodes", roles: ["ER"] },
      { email: "nh-er2@testsetup.dev", displayName: "Ethan Russell", roles: ["ER"] },
      { email: "nh-lc@testsetup.dev", displayName: "Leslie Chen", roles: ["LC"] },
      { email: "nh-fc@testsetup.dev", displayName: "Frank Coleman", roles: ["FC"] },
      { email: "nh-mp-cr@testsetup.dev", displayName: "Maria Chen", roles: ["CR"] },
      { email: "nh-pp-cu@testsetup.dev", displayName: "Paul Curtis", roles: ["CU"] },
      { email: "nh-pp-lc@testsetup.dev", displayName: "Patricia Lee", roles: ["LC"] },
      { email: "nh-pp-fc@testsetup.dev", displayName: "Peter Ford", roles: ["FC"] },
      { email: "nh-solo@testsetup.dev", displayName: "Sam Solo", roles: ["CR", "CU", "ER", "LC", "FC"] },
    ],
  },
};

export const CHALLENGE_CLEANUP_TABLES = [
  "audit_trail", "sla_timers", "cogni_notifications", "challenge_legal_docs",
  "challenge_package_versions", "challenge_qa", "user_challenge_roles",
  "challenge_prize_tiers", "challenge_section_approvals",
  "challenge_incentive_selections", "challenge_context_digest",
  "challenge_role_assignments", "challenge_attachments", "escrow_records",
  "curation_progress", "curation_quality_metrics", "communication_log",
  "amendment_records", "challenge_submissions",
];

export const ORG_FIELDS = {
  trade_brand_name: "Mahindra",
  legal_entity_name: "Mahindra & Mahindra Limited",
  tagline: "Rise.",
  organization_description: "Mahindra & Mahindra Limited is a USD 21 billion multinational conglomerate headquartered in Mumbai, India.",
  website_url: "https://www.mahindra.com",
  founding_year: 1945,
  employee_count_range: "250000+",
  annual_revenue_range: "$15B-$25B",
  hq_city: "Mumbai",
  preferred_currency: "USD",
  timezone: "Asia/Kolkata",
  is_active: true,
  is_deleted: false,
  verification_status: "verified",
  registration_step: 5,
};

export const POOL_ENTRIES = [
  { name: "Casey Underwood", email: "nh-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
  { name: "Evelyn Rhodes", email: "nh-er1@testsetup.dev", codes: ["R7_MP", "R7_AGG"] },
  { name: "Frank Coleman", email: "nh-fc@testsetup.dev", codes: ["R8"] },
  { name: "Paul Curtis", email: "nh-pp-cu@testsetup.dev", codes: ["R5_MP", "R5_AGG"] },
  { name: "Patricia Lee", email: "nh-pp-lc@testsetup.dev", codes: ["R9"] },
  { name: "Peter Ford", email: "nh-pp-fc@testsetup.dev", codes: ["R8"] },
];

export interface ResolvedUser { userId: string; roles: string[]; displayName: string; email: string }

export function findUser(users: ResolvedUser[], name: string): ResolvedUser | undefined {
  return users.find(u => u.displayName === name);
}
