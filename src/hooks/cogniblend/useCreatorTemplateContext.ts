/** useCreatorTemplateContext — live legal-template preview variables from the creator form. */
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';
import { buildPreviewVariables } from '@/services/legal/cpaPreviewInterpolator';

interface GeoLike { jurisdiction?: string | null; governing_law?: string | null }

export function useCreatorTemplateContext(
  form: UseFormReturn<CreatorFormValues>,
  governanceMode: GovernanceMode,
  engagementModel: string,
  orgName: string | undefined,
  geoContext: GeoLike | null | undefined,
) {
  // Watch entire form to build live template-preview variables (single subscribe — R5 safe)
  const watched = form.watch();
  return useMemo(() => buildPreviewVariables({
    challenge_title: watched.title,
    problem_statement: watched.problem_statement,
    scope: watched.scope,
    ip_model: watched.ip_model,
    governance_mode: governanceMode,
    operating_model: engagementModel,
    prize_amount: watched.platinum_award,
    currency: watched.currency_code,
    evaluation_method: watched.evaluation_method,
    evaluator_count: watched.evaluator_count,
    solver_audience: watched.solver_audience,
    seeker_org_name: orgName,
    jurisdiction: geoContext?.jurisdiction,
    governing_law: geoContext?.governing_law,
  }), [watched, governanceMode, engagementModel, orgName, geoContext]);

}
