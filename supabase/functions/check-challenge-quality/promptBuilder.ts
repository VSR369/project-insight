/**
 * promptBuilder.ts — Builds enriched system + user prompts for Creator AI Review.
 * Uses 4-dimension model for Creator scope (no legal compliance).
 */

import type { QualityCheckContext } from "./contextFetcher.ts";

/* ── Governance mode descriptions ── */

const GOVERNANCE_DESCRIPTIONS: Record<string, string> = {
  QUICK: "QUICK mode: simplified workflow, 5 required fields (Title, Problem, Tags, Currency, Prize). Merged roles, auto-completion. Apply lighter rigor — focus on core clarity.",
  STRUCTURED: "STRUCTURED mode: balanced governance, 8 required fields. Manual curation, optional add-ons. Apply standard rigor — check scope, maturity, evaluation criteria.",
  CONTROLLED: "CONTROLLED mode: full compliance, 12 required fields. Mandatory escrow, formal gates, distinct roles. Apply maximum rigor — expect comprehensive detail, IP model, timeline, org context.",
};

/* ── Creator field lists by governance mode ── */

const CREATOR_FIELD_LISTS: Record<string, string[]> = {
  QUICK: ['title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award'],
  STRUCTURED: ['title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award', 'scope', 'maturity_level', 'weighted_criteria'],
  CONTROLLED: ['title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award', 'scope', 'maturity_level', 'weighted_criteria', 'hook', 'context_background', 'ip_model', 'expected_timeline'],
};

/* ── Prompt builders ── */

interface PromptParams {
  governanceMode: string;
  engagementModel: string | null;
  reviewScope?: string;
}

export function buildSystemPrompt(ctx: QualityCheckContext, params: PromptParams): string {
  const isCreatorScope = params.reviewScope === 'creator_fields_only';

  const parts: string[] = [
    `You are an expert innovation challenge quality reviewer for a global open innovation platform.`,
    isCreatorScope
      ? `Analyze a challenge specification to provide a structured quality assessment using the assess_challenge_quality tool.`
      : `Analyze a challenge specification AND its attached legal documents to provide a structured quality assessment using the assess_challenge_quality tool.`,
  ];

  // Governance awareness
  const modeDesc = GOVERNANCE_DESCRIPTIONS[params.governanceMode] ?? GOVERNANCE_DESCRIPTIONS.STRUCTURED;
  parts.push(`\n## GOVERNANCE MODE\n${modeDesc}`);

  // Engagement model awareness
  const emName = ctx.engagementModelName ?? params.engagementModel;
  if (emName) {
    parts.push(`\n## ENGAGEMENT MODEL: ${emName}\nRegardless of operating model, review ALL of the following with equal weight:\n- Solver eligibility breadth: Are requirements clear enough for qualified solvers to self-select?\n- Deliverables clarity: Are expected outputs, milestones, and acceptance criteria unambiguous?\n- IP model clarity: Is the intellectual property arrangement clearly defined?\n- Legal requirements: Are org-specific or platform legal obligations addressed?`);
  }

  // Industry intelligence
  if (ctx.industryPack) {
    const ip = ctx.industryPack;
    const industryParts: string[] = [`\n## INDUSTRY CONTEXT: ${ip.industry_name}`];
    if (ip.industry_overview) industryParts.push(ip.industry_overview as string);
    if (Array.isArray(ip.common_kpis) && ip.common_kpis.length > 0) {
      industryParts.push(`Standard KPIs: ${(ip.common_kpis as string[]).join(', ')}`);
    }
    if (Array.isArray(ip.common_frameworks) && ip.common_frameworks.length > 0) {
      industryParts.push(`Industry Frameworks: ${(ip.common_frameworks as string[]).join(', ')}`);
    }
    const regLandscape = ip.regulatory_landscape as Record<string, string[]> | null;
    if (regLandscape?.global?.length) {
      industryParts.push(`Key Regulations: ${regLandscape.global.join(', ')}`);
    }
    parts.push(industryParts.join('\n'));
  }

  // Geography context
  if (ctx.geoContext) {
    const geo = ctx.geoContext;
    const geoParts: string[] = [`\n## GEOGRAPHY CONTEXT: ${geo.region_name}`];
    if (Array.isArray(geo.data_privacy_laws) && geo.data_privacy_laws.length > 0) {
      geoParts.push(`Data Privacy: ${(geo.data_privacy_laws as string[]).join(', ')}`);
    }
    if (geo.business_culture) geoParts.push(`Business Culture: ${geo.business_culture}`);
    if (geo.currency_context) geoParts.push(`Budget Context: ${geo.currency_context}`);
    parts.push(geoParts.join('\n'));
  }

  // Rate card awareness
  if (ctx.rateCard) {
    const rc = ctx.rateCard;
    parts.push(`\n## RATE CARD BENCHMARK\nReward floor: ${rc.reward_floor_amount}, Reward ceiling: ${rc.reward_ceiling}, Effort rate floor: ${rc.effort_rate_floor}/hr.\nCompare challenge prize against these benchmarks and flag if outside range.`);
  }

  // Review scope filtering
  if (isCreatorScope) {
    const fieldList = CREATOR_FIELD_LISTS[params.governanceMode] ?? CREATOR_FIELD_LISTS.STRUCTURED;
    parts.push(`\n## REVIEW SCOPE: CREATOR FIELDS ONLY\nFocus your gaps analysis EXCLUSIVELY on these creator-owned fields: ${fieldList.join(', ')}.\nDo NOT report gaps on fields outside this list.\nDo NOT penalize for missing legal documents — legal documents (CPAs) are assembled AFTER curation freeze, not by creators. This is by design.\nDimension scores should reflect the quality of the creator-owned content only.`);
  }

  // Scoring criteria — 4-dimension for creator, 5-dimension otherwise
  if (isCreatorScope) {
    parts.push(`\n## SCORING CRITERIA (4 DIMENSIONS — Creator Review)
- Completeness (0-100): Are all governance-required creator fields filled with substantive content?
- Clarity (0-100): Is the problem clearly defined? Would a solver understand what's needed?
- Solver Readiness (0-100): Could a qualified solver start working with this information?
- Governance Alignment (0-100): Does the challenge meet the governance mode expectations?
- Overall Score (0-100): Weighted average of the above 4 dimensions.
- Content Quality (0-100): Overall content quality — depth, specificity, and professionalism of writing.

IMPORTANT: Do NOT include legal_compliance_score for Creator reviews. Legal docs are not the creator's responsibility.

Scoring calibration:
- 90-100: Excellent, publish-ready content
- 75-89: Good, minor polish needed
- 60-74: Adequate but should be improved before publication
- Below 60: Significant gaps that would confuse solvers

Gap severity calibration:
- "suggestion": Minor polish, nice-to-have (score impact: small)
- "warning": Should be addressed for better solver outcomes (score impact: moderate)
- "critical": Blocks solver participation or creates confusion (score impact: large)`);
  } else {
    parts.push(`\n## SCORING CRITERIA
- Completeness (0-100): Are all governance-required fields filled with substantive content?
- Clarity (0-100): Is the problem clearly defined? Would a solver understand what's needed?
- Solver Readiness (0-100): Could a qualified solver start working today?
- Legal Compliance (0-100): Are required legal documents attached and tier-appropriate?
- Governance Alignment (0-100): Does the challenge meet governance mode expectations?
- Overall Score (0-100): Weighted average of all factors

Gap severity:
- "critical": Blocks solver participation
- "warning": Should be added for better outcomes
- "suggestion": Nice-to-have improvements`);
  }

  return parts.join('\n');
}

export function buildUserPrompt(ctx: QualityCheckContext, params: PromptParams): string {
  const isCreatorScope = params.reviewScope === 'creator_fields_only';

  const sections: string[] = [
    `Analyze this challenge for quality, solver readiness, and compliance:`,
    `\nGOVERNANCE MODE: ${params.governanceMode}`,
  ];

  if (ctx.orgName) sections.push(`ORGANIZATION: ${ctx.orgName}`);
  if (ctx.engagementModelName) sections.push(`ENGAGEMENT MODEL: ${ctx.engagementModelName}`);

  sections.push(`\nCHALLENGE SPECIFICATION:\n${JSON.stringify(ctx.challenge, null, 2)}`);

  // Only include legal docs section for non-creator reviews
  if (!isCreatorScope) {
    const legalSummary = {
      total_documents: ctx.legalDocs.length,
      by_tier: {
        tier_1: ctx.legalDocs.filter((d) => d.tier === "1" || d.tier === "tier_1"),
        tier_2: ctx.legalDocs.filter((d) => d.tier === "2" || d.tier === "tier_2"),
      },
      statuses: ctx.legalDocs.map((d) => ({
        name: d.document_name || d.document_type,
        tier: d.tier,
        status: d.status,
        lc_review_status: d.lc_status,
      })),
    };
    sections.push(`\nLEGAL DOCUMENTS:\n${JSON.stringify(legalSummary, null, 2)}`);
  }

  if (ctx.rateCard) {
    const reward = ctx.challenge.reward_structure as Record<string, unknown> | null;
    const prize = reward?.platinum_award ?? reward?.total_budget ?? null;
    if (prize !== null) {
      sections.push(`\nRATE CARD BENCHMARK: Floor=${ctx.rateCard.reward_floor_amount}, Ceiling=${ctx.rateCard.reward_ceiling}. Challenge prize: ${prize}`);
    }
  }

  return sections.join('\n');
}
