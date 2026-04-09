/**
 * solutionRequestPayloads — Shared types and payload builder for challenge creation.
 * Extracted from useSubmitSolutionRequest.ts.
 */

import { serializeLineItems } from '@/lib/cogniblend/creatorCuratorFieldMap';
import { normalizeChallengeFields } from '@/lib/cogniblend/challengeFieldNormalizer';
import {
  fetchGovernanceFieldRules,
  stripHiddenExtendedBriefFields,
} from '@/lib/cogniblend/governanceFieldFilter';

/* ── Shared payload interfaces ── */

export interface SubmitPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  title?: string;
  businessProblem: string;
  draftChallengeId?: string;
  expectedOutcomes: string[];
  constraints?: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  expectedTimeline: string;
  domainTags: string[];
  urgency: string;
  industrySegmentId?: string;
  subDomainIds?: string[];
  specialtyTags?: string[];
  beneficiariesMapping?: string;
  templateId?: string;
  governanceModeOverride?: string;
  contextBackground?: string;
  rootCauses?: string[];
  affectedStakeholders?: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
  scopeDefinition?: string;
  preferredApproach?: string[];
  approachesNotOfInterest?: string[];
  solutionExpectations?: string;
  currentDeficiencies?: string[];
  referenceUrls?: string[];
  maturityLevel?: string;
  solutionMaturityId?: string;
  ipModel?: string;
  hook?: string;
  deliverablesList?: string[];
  submissionGuidelines?: string[];
  weightedCriteria?: Array<{ name: string; weight: number }>;
}

export interface DraftPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  title?: string;
  businessProblem: string;
  expectedOutcomes: string[];
  constraints?: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  expectedTimeline: string;
  domainTags: string[];
  urgency: string;
  industrySegmentId?: string;
  subDomainIds?: string[];
  specialtyTags?: string[];
  beneficiariesMapping?: string;
  templateId?: string;
  governanceModeOverride?: string;
  contextBackground?: string;
  rootCauses?: string[];
  affectedStakeholders?: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
  scopeDefinition?: string;
  preferredApproach?: string[];
  approachesNotOfInterest?: string[];
  solutionExpectations?: string;
  currentDeficiencies?: string[];
  maturityLevel?: string;
  solutionMaturityId?: string;
  ipModel?: string;
  hook?: string;
  deliverablesList?: string[];
  submissionGuidelines?: string[];
  weightedCriteria?: Array<{ name: string; weight: number }>;
}

export interface SubmitResult {
  challengeId: string;
  governanceMode?: string;
}

/* ── Helpers ── */

export function normalizeConstrainedChallengeFields({
  maturityLevel,
  ipModel,
}: {
  maturityLevel?: string;
  ipModel?: string;
}): {
  maturity_level: string | null;
  ip_model: string | null;
} {
  const normalized = normalizeChallengeFields({
    maturity_level: maturityLevel || null,
    ip_model: ipModel || null,
  });
  return {
    maturity_level: (normalized.maturity_level as string | null | undefined) ?? null,
    ip_model: (normalized.ip_model as string | null | undefined) ?? null,
  };
}

export function buildChallengeUpdatePayload(
  fp: DraftPayload,
  rawPayload: DraftPayload,
  normalizedConstrainedFields: { maturity_level: string | null; ip_model: string | null },
  governanceRules: Awaited<ReturnType<typeof fetchGovernanceFieldRules>>,
) {
  const rawExtBrief: Record<string, unknown> = {
    ...(fp.beneficiariesMapping ? { beneficiaries_mapping: fp.beneficiariesMapping } : {}),
    ...(fp.templateId ? { challenge_template_id: fp.templateId } : {}),
    ...(fp.contextBackground ? { context_background: fp.contextBackground } : {}),
    ...(fp.rootCauses?.filter(Boolean).length ? { root_causes: fp.rootCauses.filter(Boolean) } : {}),
    ...(fp.affectedStakeholders?.length
      ? { affected_stakeholders: fp.affectedStakeholders.filter((s) => s.stakeholder_name.trim()) }
      : {}),
    ...(fp.scopeDefinition ? { scope_definition: fp.scopeDefinition } : {}),
    ...(fp.preferredApproach?.filter(Boolean).length ? { preferred_approach: fp.preferredApproach.filter(Boolean) } : {}),
    ...(fp.approachesNotOfInterest?.filter(Boolean).length
      ? { approaches_not_of_interest: fp.approachesNotOfInterest.filter(Boolean) }
      : {}),
    ...(fp.solutionExpectations ? { solution_expectations: fp.solutionExpectations } : {}),
    ...(fp.currentDeficiencies?.filter(Boolean).length
      ? { current_deficiencies: fp.currentDeficiencies.filter(Boolean) }
      : {}),
  };

  return {
    title: rawPayload.title?.trim() || rawPayload.businessProblem.substring(0, 100).trim(),
    problem_statement: fp.businessProblem || null,
    scope: fp.constraints || null,
    expected_outcomes: serializeLineItems(fp.expectedOutcomes),
    submission_guidelines: fp.submissionGuidelines ? serializeLineItems(fp.submissionGuidelines) : null,
    governance_mode_override: rawPayload.governanceModeOverride ?? null,
    currency_code: fp.currency ?? rawPayload.currency,
    reward_structure: {
      currency: fp.currency ?? rawPayload.currency,
      budget_min: fp.budgetMin ?? 0,
      budget_max: fp.budgetMax ?? 0,
      platinum_award: fp.budgetMax ?? 0,
      source_role: 'CR',
      source_date: new Date().toISOString(),
      upstream_source: {
        role: 'CR',
        date: new Date().toISOString(),
        budget_min: fp.budgetMin ?? 0,
        budget_max: fp.budgetMax ?? 0,
        currency: fp.currency ?? rawPayload.currency,
      },
    },
    evaluation_criteria: fp.weightedCriteria?.length
      ? { weighted_criteria: fp.weightedCriteria }
      : null,
    phase_schedule: {
      expected_timeline: fp.expectedTimeline,
    },
    maturity_level: normalizedConstrainedFields.maturity_level,
    solution_maturity_id: fp.solutionMaturityId || null,
    ip_model: normalizedConstrainedFields.ip_model,
    domain_tags: fp.domainTags || null,
    industry_segment_id: fp.industrySegmentId || null,
    eligibility: JSON.stringify({
      domain_tags: fp.domainTags,
      urgency: fp.urgency,
      constraints: fp.constraints || undefined,
      industry_segment_id: fp.industrySegmentId || undefined,
      sub_domain_ids: fp.subDomainIds?.length ? fp.subDomainIds : undefined,
      specialty_tags: fp.specialtyTags?.length ? fp.specialtyTags : undefined,
    }),
    extended_brief: stripHiddenExtendedBriefFields(rawExtBrief, governanceRules),
  };
}
