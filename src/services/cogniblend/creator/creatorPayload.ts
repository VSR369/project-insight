/**
 * creatorPayload — maps creator form values to the challenge submit payload.
 * Pure function; no data access.
 */
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';
import { audienceSelectable } from '@/services/engagementModelRulesService';

export interface CreatorPayloadContext {
  orgId: string;
  creatorId: string;
  engagementModel: string;
  governanceMode: GovernanceMode;
  industrySegmentId: string;
}

export function cleanArray(items: string[] | undefined): string[] {
  return (items || []).filter((i) => i.trim().length > 0);
}

export function buildCreatorSubmitPayload(data: CreatorFormValues, ctx: CreatorPayloadContext) {
  const { orgId, creatorId, engagementModel, governanceMode, industrySegmentId } = ctx;
  return {
    orgId, creatorId, operatingModel: engagementModel,
    title: data.title, businessProblem: data.problem_statement,
    expectedOutcomes: cleanArray(data.expected_outcomes), constraints: data.scope || '',
    currency: data.currency_code, budgetMin: 0, budgetMax: data.platinum_award,
    expectedTimeline: data.expected_timeline || '8w', domainTags: data.domain_tags ?? [], urgency: 'standard',
    industrySegmentId: industrySegmentId || data.industry_segment_id || undefined,
    governanceModeOverride: governanceMode,
    contextBackground: data.context_background || undefined, rootCauses: cleanArray(data.root_causes),
    affectedStakeholders: data.affected_stakeholders.length > 0 ? data.affected_stakeholders : undefined,
    preferredApproach: cleanArray(data.preferred_approach),
    approachesNotOfInterest: cleanArray(data.approaches_not_of_interest),
    currentDeficiencies: cleanArray(data.current_deficiencies),
    maturityLevel: data.maturity_level || undefined, solutionMaturityId: data.solution_maturity_id || undefined,
    ipModel: data.ip_model || undefined, hook: data.hook || undefined,
    weightedCriteria: data.weighted_criteria?.length ? data.weighted_criteria : undefined,
    deliverablesList: cleanArray(data.deliverables_list),
    solverAudience: audienceSelectable(engagementModel) ? data.solver_audience : 'ALL',
    evaluationMethod: data.evaluation_method,
    evaluatorCount: data.evaluator_count,
    creatorLegalInstructions: data.creator_legal_instructions || undefined,
    phaseDurations: data.phase_durations?.length ? data.phase_durations : undefined,
  };
}
