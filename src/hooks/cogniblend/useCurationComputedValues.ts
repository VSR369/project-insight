/**
 * useCurationComputedValues — Heavy memos extracted from CurationReviewPage.
 * Computes group progress, readiness, section readiness, challenge context,
 * section AI flags, checklist items, and AI review counts.
 */

import { useMemo } from 'react';
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, AIQualitySummary, SectionDef } from '@/lib/cogniblend/curationTypes';
import { GROUPS, SECTION_MAP } from '@/lib/cogniblend/curationSectionDefs';
import { computeAutoChecks, GAP_FIELD_TO_SECTION, CHECKLIST_LABELS, parseJson } from '@/lib/cogniblend/curationHelpers';
import { getUpstreamDependencies } from '@/lib/cogniblend/sectionDependencies';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';

const OPTIONAL_SECTIONS = new Set(['preferred_approach', 'approaches_not_of_interest', 'legal_docs', 'escrow_funding']);

interface UseCurationComputedValuesInput {
  challenge: ChallengeData | null;
  legalDocs: LegalDocSummary[];
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  aiQuality: AIQualitySummary | null;
  aiReviews: SectionReview[];
  staleSections: Array<{ key: string }>;
  manualOverrides: Record<number, boolean>;
}

export function useCurationComputedValues({
  challenge, legalDocs, legalDetails, escrowRecord,
  aiQuality, aiReviews, staleSections, manualOverrides,
}: UseCurationComputedValuesInput) {

  const staleKeySet = useMemo(() => new Set(staleSections.map(s => s.key)), [staleSections]);

  const aiReviewCounts = useMemo(() => {
    if (!aiReviews.length) return { pass: 0, warning: 0, inferred: 0, needsRevision: 0, hasReviews: false };
    let pass = 0, warning = 0, needsRevision = 0, inferred = 0;
    aiReviews.forEach((r) => {
      const triageStatus = (r as any).triage_status;
      if (triageStatus === "inferred") inferred++;
      else if (r.status === "pass") pass++;
      else if (r.status === "warning") warning++;
      else if (r.status === "needs_revision") needsRevision++;
    });
    return { pass, warning: warning + needsRevision, inferred, needsRevision, hasReviews: true };
  }, [aiReviews]);

  const autoChecks = useMemo(() => {
    if (!challenge) return Array(15).fill(false);
    return computeAutoChecks(challenge, legalDocs, escrowRecord);
  }, [challenge, legalDocs, escrowRecord]);

  const checklistItems = useMemo(() =>
    CHECKLIST_LABELS.map((label, i) => ({
      id: i + 1,
      label,
      autoChecked: autoChecks[i],
      manualOverride: manualOverrides[i + 1] ?? false,
      passed: autoChecks[i] || (manualOverrides[i + 1] ?? false),
    })), [autoChecks, manualOverrides]);

  const completedCount = checklistItems.filter((i) => i.passed).length;
  const allComplete = completedCount === 15;

  const checklistSummary = useMemo(() =>
    checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      passed: item.passed,
      method: item.autoChecked ? "auto" : "manual",
    })), [checklistItems]);

  const staleCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    GROUPS.forEach((g) => {
      counts[g.id] = g.sectionKeys.filter((k) => staleKeySet.has(k)).length;
    });
    return counts;
  }, [staleKeySet]);

  const groupProgress = useMemo(() => {
    if (!challenge) return {};
    const result: Record<string, { done: number; total: number; hasAIFlag: boolean }> = {};
    GROUPS.forEach((g) => {
      if (g.id === 'organization') {
        result[g.id] = { done: 0, total: 1, hasAIFlag: false };
        return;
      }
      const secs = g.sectionKeys.map((k) => SECTION_MAP.get(k)).filter(Boolean) as SectionDef[];
      const done = secs.filter((s) => s.isFilled(challenge, legalDocs, legalDetails, escrowRecord) && !staleKeySet.has(s.key)).length;
      const hasAIFlag = aiQuality?.gaps?.some((gap) => {
        const mapped = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
        return g.sectionKeys.includes(mapped);
      }) ?? false;
      result[g.id] = { done, total: secs.length, hasAIFlag };
    });
    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord, aiQuality, staleKeySet]);

  const groupReadiness = useMemo(() => {
    if (!challenge) return {} as Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }>;
    const result: Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }> = {};

    GROUPS.forEach((group) => {
      const missingPrereqs: string[] = [];
      const missingPrereqSections: string[] = [];

      for (const prereqGroupId of group.prerequisiteGroups) {
        const prereqGroup = GROUPS.find(g => g.id === prereqGroupId);
        if (!prereqGroup) continue;
        const criticalSections = prereqGroup.sectionKeys.filter(key => {
          const sec = SECTION_MAP.get(key);
          return sec && !OPTIONAL_SECTIONS.has(key);
        });
        const filledCount = criticalSections.filter(key => {
          const sec = SECTION_MAP.get(key);
          return sec?.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
        }).length;
        const completion = criticalSections.length > 0 ? filledCount / criticalSections.length : 1;
        if (completion < 0.5) {
          missingPrereqs.push(prereqGroup.label);
          const unfilled = criticalSections.filter(key => {
            const sec = SECTION_MAP.get(key);
            return !sec?.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
          });
          missingPrereqSections.push(...unfilled);
        }
      }

      const ownSections = group.sectionKeys.map(k => SECTION_MAP.get(k)).filter(Boolean) as SectionDef[];
      const ownFilled = ownSections.filter(s => s.isFilled(challenge, legalDocs, legalDetails, escrowRecord)).length;

      result[group.id] = {
        ready: missingPrereqs.length === 0,
        missingPrereqs,
        missingPrereqSections,
        completionPct: ownSections.length > 0 ? (ownFilled / ownSections.length) * 100 : 0,
      };
    });

    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord]);

  const sectionReadiness = useMemo(() => {
    if (!challenge) return {} as Record<string, { ready: boolean; missing: string[] }>;
    const result: Record<string, { ready: boolean; missing: string[] }> = {};
    for (const group of GROUPS) {
      for (const key of group.sectionKeys) {
        const upstreamKeys = getUpstreamDependencies(key);
        const missing: string[] = [];
        for (const depKey of upstreamKeys) {
          const depSec = SECTION_MAP.get(depKey);
          if (depSec && !depSec.isFilled(challenge, legalDocs, legalDetails, escrowRecord)) {
            missing.push(depSec.label);
          }
        }
        result[key] = { ready: missing.length === 0, missing };
      }
    }
    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord]);

  const sectionAIFlags = useMemo(() => {
    if (!aiQuality?.gaps) return {};
    const map: Record<string, string[]> = {};
    aiQuality.gaps.forEach((gap) => {
      const sectionKey = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
      if (!map[sectionKey]) map[sectionKey] = [];
      map[sectionKey].push(gap.message);
    });
    return map;
  }, [aiQuality]);

  const challengeCtx = useMemo(() => {
    const domainTags = (() => {
      if (!challenge?.domain_tags) return [];
      const parsed = parseJson<string[]>(challenge.domain_tags);
      return Array.isArray(parsed) ? parsed : [];
    })();
    const deliverableNames: string[] = (() => {
      if (!challenge?.deliverables) return [];
      try {
        const raw = typeof challenge.deliverables === 'string' ? JSON.parse(challenge.deliverables) : challenge.deliverables;
        if (Array.isArray(raw)) return raw.map((d: any) => typeof d === 'string' ? d : d?.name ?? d?.title ?? '').filter(Boolean);
        if (raw?.items) return raw.items.map((d: any) => d?.name ?? d?.title ?? '').filter(Boolean);
      } catch {}
      return [];
    })();
    const evalCriteriaNames: string[] = (() => {
      if (!challenge?.evaluation_criteria) return [];
      try {
        const raw = typeof challenge.evaluation_criteria === 'string' ? JSON.parse(challenge.evaluation_criteria) : challenge.evaluation_criteria;
        if (Array.isArray(raw)) return raw.map((c: any) => typeof c === 'string' ? c : c?.name ?? '').filter(Boolean);
      } catch {}
      return [];
    })();
    const rewardPool = (() => {
      if (!challenge?.reward_structure) return undefined;
      try {
        const raw = typeof challenge.reward_structure === 'string' ? JSON.parse(challenge.reward_structure) : challenge.reward_structure;
        if (raw?.total_pool) return Number(raw.total_pool);
        const tiers = raw?.tiers;
        if (Array.isArray(tiers)) {
          const sum = tiers.reduce((s: number, t: any) => s + (Number(t.amount) || 0) * (Number(t.count) || 1), 0);
          if (sum > 0) return sum;
        }
      } catch {}
      return undefined;
    })();

    return {
      title: challenge?.title,
      maturity_level: challenge?.maturity_level,
      domain_tags: domainTags,
      complexity: challenge?.complexity_level ?? undefined,
      complexity_level: challenge?.complexity_level ?? undefined,
      solution_type: challenge?.solution_type ?? undefined,
      operating_model: challenge?.operating_model ?? undefined,
      scope: challenge?.scope ? (typeof challenge.scope === 'string' ? challenge.scope.slice(0, 500) : undefined) : undefined,
      deliverables: deliverableNames.length > 0 ? deliverableNames : undefined,
      evaluation_criteria: evalCriteriaNames.length > 0 ? evalCriteriaNames : undefined,
      industry: domainTags.length > 0 ? domainTags[0] : undefined,
      reward_pool: rewardPool,
      currency: challenge?.currency_code ?? 'USD',
      problem_statement: challenge?.problem_statement ? challenge.problem_statement.slice(0, 500) : undefined,
    };
  }, [
    challenge?.title, challenge?.maturity_level, challenge?.domain_tags,
    challenge?.complexity_level, challenge?.scope, challenge?.deliverables,
    challenge?.evaluation_criteria, challenge?.currency_code,
    challenge?.problem_statement, challenge?.reward_structure,
    challenge?.solution_type, challenge?.operating_model,
  ]);

  return {
    aiReviewCounts,
    autoChecks,
    checklistItems,
    completedCount,
    allComplete,
    checklistSummary,
    staleCountByGroup,
    groupProgress,
    groupReadiness,
    sectionReadiness,
    sectionAIFlags,
    challengeCtx,
  };
}
