/**
 * contextFetcher.ts — Fetches all enrichment context for Creator AI Review.
 * Gathers challenge data, org info, industry pack, geography, and rate card.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/* ── Governance-filtered challenge fields ── */

const CHALLENGE_FIELDS_BY_MODE: Record<string, string> = {
  QUICK: "title, problem_statement, domain_tags, currency_code, reward_structure, organization_id, engagement_model_id, industry_segment_id, governance_mode_override, maturity_level",
  STRUCTURED: "title, problem_statement, domain_tags, currency_code, reward_structure, scope, maturity_level, evaluation_criteria, organization_id, engagement_model_id, industry_segment_id, governance_mode_override",
  CONTROLLED: "title, problem_statement, domain_tags, currency_code, reward_structure, scope, maturity_level, evaluation_criteria, hook, description, ip_model, phase_schedule, organization_id, engagement_model_id, industry_segment_id, governance_mode_override, eligibility, visibility",
};

/* ── Types ── */

export interface QualityCheckContext {
  challenge: Record<string, unknown>;
  legalDocs: Record<string, unknown>[];
  orgName: string | null;
  governanceProfile: string | null;
  industryPack: Record<string, unknown> | null;
  geoContext: Record<string, unknown> | null;
  rateCard: Record<string, unknown> | null;
  engagementModelName: string | null;
}

interface FetchParams {
  challengeId: string;
  engagementModel?: string;
  industrySegmentId?: string;
  governanceMode?: string;
}

/* ── Main fetcher ── */

export async function fetchChallengeContext(
  adminClient: SupabaseClient,
  params: FetchParams,
): Promise<QualityCheckContext> {
  const { challengeId, engagementModel, industrySegmentId, governanceMode } = params;

  const challengeSelect = CHALLENGE_FIELDS_BY_MODE[governanceMode ?? 'STRUCTURED']
    ?? CHALLENGE_FIELDS_BY_MODE.STRUCTURED;

  // Parallel: challenge + legal docs
  const [challengeRes, legalRes] = await Promise.all([
    adminClient.from("challenges")
      .select(challengeSelect)
      .eq("id", challengeId)
      .single(),
    adminClient.from("challenge_legal_docs")
      .select("document_type, tier, status, lc_status, document_name, maturity_level")
      .eq("challenge_id", challengeId),
  ]);

  if (challengeRes.error || !challengeRes.data) {
    throw new Error("CHALLENGE_NOT_FOUND");
  }

  const challenge = challengeRes.data as Record<string, unknown>;
  const legalDocs = (legalRes.data ?? []) as Record<string, unknown>[];

  // Fetch org data with country JOIN
  const orgId = challenge.organization_id as string;
  const { data: org } = await adminClient.from("seeker_organizations")
    .select("id, organization_type_id, hq_country_id, governance_profile, organization_name, countries(code)")
    .eq("id", orgId)
    .single();

  // Resolve country code from JOIN
  const countryRecord = (org as Record<string, unknown>)?.countries as Record<string, unknown> | null;
  const countryCode = (countryRecord?.code as string | null) ?? null;

  // Resolve industry code
  const segId = industrySegmentId || (challenge.industry_segment_id as string | null);
  let industryPack: Record<string, unknown> | null = null;
  if (segId) {
    const { data: segment } = await adminClient.from("industry_segments")
      .select("code").eq("id", segId).single();
    if (segment?.code && segment.code !== 'technology') {
      const { data: pack } = await adminClient.from("industry_knowledge_packs")
        .select("industry_code, industry_name, industry_overview, regulatory_landscape, technology_landscape, common_kpis, common_frameworks, typical_budget_ranges")
        .eq("industry_code", segment.code)
        .eq("is_active", true)
        .single();
      industryPack = pack as Record<string, unknown> | null;
    }
  }

  // Geography context
  let geoContext: Record<string, unknown> | null = null;
  if (countryCode) {
    const regionCode = COUNTRY_TO_REGION[countryCode.toUpperCase()] ?? null;
    if (regionCode) {
      const { data: geo } = await adminClient.from("geography_context")
        .select("region_code, region_name, data_privacy_laws, business_culture, currency_context, talent_market, government_initiatives, technology_maturity")
        .eq("region_code", regionCode)
        .single();
      geoContext = geo as Record<string, unknown> | null;
    }
  }

  // Rate card
  let rateCard: Record<string, unknown> | null = null;
  const orgTypeId = org?.organization_type_id as string | null;
  const maturity = challenge.maturity_level as string | null;
  if (orgTypeId && maturity) {
    const { data: card } = await adminClient.from("rate_cards")
      .select("effort_rate_floor, reward_floor_amount, reward_ceiling, non_monetary_weight")
      .eq("organization_type_id", orgTypeId)
      .eq("maturity_level", maturity)
      .eq("is_active", true)
      .single();
    rateCard = card as Record<string, unknown> | null;
  }

  // Engagement model name
  let engagementModelName: string | null = engagementModel ?? null;
  const emId = challenge.engagement_model_id as string | null;
  if (!engagementModelName && emId) {
    const { data: em } = await adminClient.from("md_engagement_models")
      .select("code, name").eq("id", emId).single();
    engagementModelName = (em?.code as string) ?? (em?.name as string) ?? null;
  }

  return {
    challenge,
    legalDocs,
    orgName: (org?.organization_name as string) ?? null,
    governanceProfile: (org?.governance_profile as string) ?? null,
    industryPack,
    geoContext,
    rateCard,
    engagementModelName,
  };
}
