/**
 * useCreatorFillTestData — seeds the creator form with governance-filtered demo
 * content, resolves an industry segment, then auto-saves the draft.
 */
import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import { getSeedForCombination } from '@/components/cogniblend/creator/creatorSeedContent';
import { filterSeedByGovernance } from '@/lib/cogniblend/governanceFieldFilter';
import type { GovernanceMode } from '@/lib/governanceMode';

interface Params {
  form: UseFormReturn<CreatorFormValues>;
  governanceMode: GovernanceMode;
  engagementModel: string;
  industrySegmentId: string;
  solutionMaturityOptions: ReadonlyArray<{ id: string; code: string }>;
  fieldRules: Parameters<typeof filterSeedByGovernance>[1] | undefined;
  primaryIndustryId: string | null | undefined;
  firstIndustryOptionId: string | undefined;
  onIndustrySegmentResolved?: (id: string) => void;
  onFillTestData?: () => void;
  saveDraft: () => Promise<unknown>;
}

export function useCreatorFillTestData({
  form, governanceMode, engagementModel, industrySegmentId, solutionMaturityOptions, fieldRules,
  primaryIndustryId, firstIndustryOptionId, onIndustrySegmentResolved, onFillTestData, saveDraft,
}: Params): () => void {
  return useCallback(() => {
    if (form.formState.isDirty && !window.confirm('This will replace all current values. Continue?')) return;
    const seed = getSeedForCombination(governanceMode as 'QUICK' | 'STRUCTURED' | 'CONTROLLED', engagementModel as 'MP' | 'AGG');
    const maturityMatch = solutionMaturityOptions.find((m) => m.code.replace('SOLUTION_', '').toUpperCase() === seed.maturity_level.toUpperCase());

    // 3-tier industry resolution: prop → org primary → first available option
    const resolvedIndustryId =
      industrySegmentId
      || primaryIndustryId
      || firstIndustryOptionId
      || '';
    if (resolvedIndustryId && resolvedIndustryId !== industrySegmentId) {
      onIndustrySegmentResolved?.(resolvedIndustryId);
    }

    const filtered = fieldRules ? filterSeedByGovernance({ ...seed, maturity_level: maturityMatch?.code ?? seed.maturity_level, solution_maturity_id: maturityMatch?.id ?? '', industry_segment_id: resolvedIndustryId }, fieldRules) : { ...seed, industry_segment_id: resolvedIndustryId };
    form.reset(filtered as CreatorFormValues, { keepDefaultValues: true });
    onFillTestData?.();
    // Use rAF + microtask to ensure React has flushed form state before saving draft
    requestAnimationFrame(() => {
      void form.trigger().then(() => {
        void saveDraft();
      });
    });
  }, [governanceMode, engagementModel, solutionMaturityOptions, form, fieldRules, onFillTestData, saveDraft, industrySegmentId, firstIndustryOptionId, primaryIndustryId, onIndustrySegmentResolved]);
}
