/**
 * buildUnifiedContext.ts — ONE shared function assembling ALL challenge data
 * for unified analyse-challenge and generate-suggestions edge functions.
 *
 * Fetches: challenge + extended_brief + org + industry pack + geography +
 * master data + context digest + legal docs + escrow + section configs.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Master data fetched inline — cannot import across function boundaries

/* ── Country → Region mapping ── */

const COUNTRY_TO_REGION: Record<string, string> = {
  IN: 'india', US: 'us',
  DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu', NL: 'eu', BE: 'eu',
  SE: 'eu', PL: 'eu', AT: 'eu', IE: 'eu', PT: 'eu', FI: 'eu',
  DK: 'eu', CZ: 'eu', RO: 'eu', HU: 'eu',
  GB: 'uk',
  AE: 'middle_east', SA: 'middle_east', QA: 'middle_east',
  BH: 'middle_east', KW: 'middle_east', OM: 'middle_east',
  SG: 'singapore', AU: 'australia', NZ: 'australia',
  JP: 'apac_other', KR: 'apac_other', MY: 'apac_other',
  TH: 'apac_other', ID: 'apac_other', PH: 'apac_other',
  VN: 'apac_other', TW: 'apac_other',
};

/* ── Types ── */

export interface OrgContext {
  orgName: string;
  tradeBrand?: string;
  orgDescription?: string;
  orgType?: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  tagline?: string;
  hqCountry?: string;
  hqCountryCode?: string;
  hqCity?: string;
  annualRevenue?: string;
  employeeCount?: string;
  foundingYear?: number;
  isEnterprise?: boolean;
  functionalAreas?: string[];
  industries?: { name: string; code: string; isPrimary: boolean }[];
  operatingModel?: string;
}

export interface UnifiedChallengeContext {
  challenge: Record<string, unknown>;
  extendedBrief: Record<string, unknown>;
  org: OrgContext;
  industryPack: Record<string, unknown> | null;
  geoContext: Record<string, unknown> | null;
  rateCard: Record<string, unknown> | null;
  masterData: Record<string, { code: string; label: string }[]>;
  contextDigest: string | null;
  legalDocs: Record<string, unknown>[];
  escrow: Record<string, unknown> | null;
  sectionConfigs: Record<string, unknown>[];
  globalConfig: Record<string, unknown> | null;
  correlationId: string;
}

/* ── Helpers ── */

function parseJsonField(val: unknown): Record<string, unknown> {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return {};
}

function stripHtml(s: unknown): string {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ── Main builder ── */

export async function buildUnifiedContext(
  challengeId: string,
  correlationId: string,
): Promise<UnifiedChallengeContext> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  console.log(`[${correlationId}] Building unified context for challenge ${challengeId}`);

  // ── Parallel fetch: challenge + configs + master data + legal + escrow + digest ──
  const [
    challengeRes,
    configRes,
    globalConfigRes,
    masterData,
    legalRes,
    escrowRes,
    digestRes,
  ] = await Promise.all([
    adminClient.from("challenges")
      .select(`
        id, title, problem_statement, scope, hook, description,
        deliverables, expected_outcomes, evaluation_criteria,
        reward_structure, phase_schedule, ip_model, maturity_level,
        domain_tags, currency_code, operating_model,
        governance_profile, governance_mode_override,
        current_phase, phase_status, organization_id,
        extended_brief, ai_section_reviews, visibility,
        evaluation_method, evaluator_count, solver_audience,
        industry_segment_id, complexity_score, complexity_level,
        complexity_parameters, eligibility, eligibility_model,
        solution_type, solution_types, submission_guidelines,
        solver_expertise_requirements, success_metrics_kpis,
        data_resources_provided, solver_eligibility_types,
        solver_visibility_types, targeting_filters, max_solutions,
        challenge_visibility
      `)
      .eq("id", challengeId)
      .single(),
    adminClient.from("ai_review_section_config")
      .select("*")
      .eq("role_context", "curation")
      .eq("is_active", true),
    adminClient.from("ai_review_global_config")
      .select("*")
      .eq("id", 1)
      .single(),
    fetchMasterDataOptions(adminClient),
    adminClient.from("challenge_legal_docs")
      .select("document_type, tier, status, lc_status, document_name, maturity_level")
      .eq("challenge_id", challengeId),
    adminClient.from("escrow_records")
      .select("escrow_status, deposit_amount, currency, remaining_amount, fc_notes")
      .eq("challenge_id", challengeId)
      .maybeSingle(),
    adminClient.from("challenge_context_digest")
      .select("digest_text, key_facts, source_count")
      .eq("challenge_id", challengeId)
      .maybeSingle(),
  ]);

  if (challengeRes.error || !challengeRes.data) {
    throw new Error(`CHALLENGE_NOT_FOUND: ${challengeRes.error?.message}`);
  }

  const challenge = challengeRes.data as Record<string, unknown>;
  const extendedBrief = parseJsonField(challenge.extended_brief);

  console.log(`[${correlationId}] Challenge loaded: "${challenge.title}"`);

  // ── Fetch org context (with dependent lookups) ──
  const orgId = challenge.organization_id as string;
  const org: OrgContext = { orgName: '(unknown)' };

  if (orgId) {
    const { data: orgRow } = await adminClient.from("seeker_organizations")
      .select(`
        organization_name, trade_brand_name, organization_description,
        website_url, linkedin_url, twitter_url, tagline,
        functional_areas, hq_country_id, hq_city,
        annual_revenue_range, employee_count_range, founding_year,
        is_enterprise, organization_type_id, operating_model
      `)
      .eq("id", orgId)
      .single();

    if (orgRow) {
      org.orgName = orgRow.organization_name ?? '(unknown)';
      org.tradeBrand = orgRow.trade_brand_name ?? undefined;
      org.orgDescription = orgRow.organization_description ?? undefined;
      org.websiteUrl = orgRow.website_url ?? undefined;
      org.linkedinUrl = orgRow.linkedin_url ?? undefined;
      org.twitterUrl = orgRow.twitter_url ?? undefined;
      org.tagline = orgRow.tagline ?? undefined;
      org.hqCity = orgRow.hq_city ?? undefined;
      org.annualRevenue = orgRow.annual_revenue_range ?? undefined;
      org.employeeCount = orgRow.employee_count_range ?? undefined;
      org.foundingYear = orgRow.founding_year ?? undefined;
      org.isEnterprise = orgRow.is_enterprise ?? undefined;
      org.functionalAreas = orgRow.functional_areas ?? [];
      org.operatingModel = orgRow.operating_model ?? undefined;

      // Parallel: country, org type, industries
      const [countryRes, orgTypeRes, orgIndRes] = await Promise.all([
        orgRow.hq_country_id
          ? adminClient.from("countries").select("name, code").eq("id", orgRow.hq_country_id).single()
          : Promise.resolve({ data: null }),
        orgRow.organization_type_id
          ? adminClient.from("organization_types").select("name").eq("id", orgRow.organization_type_id).single()
          : Promise.resolve({ data: null }),
        adminClient.from("seeker_org_industries")
          .select("industry_id, is_primary")
          .eq("organization_id", orgId),
      ]);

      if (countryRes.data) {
        org.hqCountry = (countryRes.data as Record<string, unknown>).name as string;
        org.hqCountryCode = (countryRes.data as Record<string, unknown>).code as string;
      }
      if (orgTypeRes.data) {
        org.orgType = (orgTypeRes.data as Record<string, unknown>).name as string;
      }

      // Resolve industry names
      const orgIndustries = orgIndRes.data ?? [];
      if (orgIndustries.length > 0) {
        const ids = orgIndustries.map((oi: Record<string, unknown>) => oi.industry_id as string);
        const { data: segs } = await adminClient.from("industry_segments").select("id, name, code").in("id", ids);
        if (segs) {
          org.industries = segs.map((s: Record<string, unknown>) => ({
            name: s.name as string,
            code: s.code as string,
            isPrimary: orgIndustries.some(
              (oi: Record<string, unknown>) => oi.industry_id === s.id && oi.is_primary === true,
            ),
          }));
        }
      }
    }
  }

  // ── Industry pack + geography ──
  let industryPack: Record<string, unknown> | null = null;
  let geoContext: Record<string, unknown> | null = null;

  const primaryIndustry = org.industries?.find(i => i.isPrimary) ?? org.industries?.[0];
  if (primaryIndustry && primaryIndustry.code !== 'technology') {
    const { data: pack } = await adminClient.from("industry_knowledge_packs")
      .select("industry_code, industry_name, industry_overview, regulatory_landscape, technology_landscape, common_kpis, common_frameworks, typical_budget_ranges")
      .eq("industry_code", primaryIndustry.code)
      .eq("is_active", true)
      .single();
    industryPack = pack as Record<string, unknown> | null;
  }

  if (org.hqCountryCode) {
    const regionCode = COUNTRY_TO_REGION[org.hqCountryCode.toUpperCase()];
    if (regionCode) {
      const { data: geo } = await adminClient.from("geography_context")
        .select("region_code, region_name, data_privacy_laws, business_culture, currency_context, talent_market, government_initiatives, technology_maturity")
        .eq("region_code", regionCode)
        .single();
      geoContext = geo as Record<string, unknown> | null;
    }
  }

  // ── Rate card ──
  let rateCard: Record<string, unknown> | null = null;
  const maturity = challenge.maturity_level as string | null;
  if (orgId && maturity) {
    const { data: orgRow2 } = await adminClient.from("seeker_organizations")
      .select("organization_type_id").eq("id", orgId).single();
    if (orgRow2?.organization_type_id) {
      const { data: card } = await adminClient.from("rate_cards")
        .select("effort_rate_floor, reward_floor_amount, reward_ceiling, non_monetary_weight")
        .eq("organization_type_id", orgRow2.organization_type_id)
        .eq("maturity_level", maturity)
        .eq("is_active", true)
        .single();
      rateCard = card as Record<string, unknown> | null;
    }
  }

  console.log(`[${correlationId}] Context assembled: org=${org.orgName}, industry=${primaryIndustry?.name ?? 'N/A'}, digest=${digestRes.data ? 'yes' : 'no'}`);

  return {
    challenge,
    extendedBrief,
    org,
    industryPack,
    geoContext,
    rateCard,
    masterData,
    contextDigest: (digestRes.data as Record<string, unknown>)?.digest_text as string ?? null,
    legalDocs: (legalRes.data ?? []) as Record<string, unknown>[],
    escrow: escrowRes.data as Record<string, unknown> | null,
    sectionConfigs: (configRes.data ?? []) as Record<string, unknown>[],
    globalConfig: globalConfigRes.data as Record<string, unknown> | null,
    correlationId,
  };
}
