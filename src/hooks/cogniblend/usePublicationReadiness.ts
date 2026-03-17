/**
 * usePublicationReadiness — Fetches challenge data and computes
 * GATE-11 (Enterprise) or GATE-11-L (Lightweight) checklist items.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface GateCheckItem {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
}

export interface PublicationReadinessResult {
  challengeTitle: string;
  governanceProfile: string;
  allPassed: boolean;
  failCount: number;
  checks: GateCheckItem[];
}

/* ─── Enterprise GATE-11 checks ──────────────────────────── */

function buildEnterpriseChecks(c: Record<string, unknown>, legalDocs: any[], solverMatchCount: number): GateCheckItem[] {
  const hasContent = !!(c.title && c.problem_statement && c.scope && c.description && c.deliverables && c.evaluation_criteria);
  const tier1Docs = legalDocs.filter((d) => d.tier === 'TIER_1');
  const tier1Attached = tier1Docs.length > 0;
  const tier1Locked = tier1Docs.every((d) => d.status === 'VERSION_LOCKED' || d.status === 'SIGNED');
  const tier2Docs = legalDocs.filter((d) => d.tier === 'TIER_2');
  const tier2Attached = tier2Docs.length > 0;
  const complexityFinalized = c.complexity_score != null && c.complexity_parameters != null && c.complexity_level != null;
  const eligibilitySet = !!(c.eligibility && c.eligibility !== '');
  const visibilitySet = !!(c.visibility && c.visibility !== '');
  const phaseScheduleDefined = c.phase_schedule != null;
  const rewardValid = c.reward_structure != null;
  const maturitySet = !!(c.maturity_level);
  const deliverables = c.deliverables as Record<string, unknown> | null;
  const artifactsDefined = deliverables != null && (
    Array.isArray((deliverables as any)?.permitted_artifact_types)
      ? ((deliverables as any).permitted_artifact_types as unknown[]).length > 0
      : true
  );

  return [
    { id: 'content', label: 'All content sections complete', detail: 'Title, problem statement, scope, description, deliverables, and evaluation criteria', passed: hasContent },
    { id: 'tier1_legal', label: 'Tier 1 legal docs attached & version-locked', detail: `${tier1Docs.length} Tier 1 doc(s) found`, passed: tier1Attached && tier1Locked },
    { id: 'tier2_legal', label: 'Tier 2 legal templates attached', detail: `${tier2Docs.length} Tier 2 doc(s) found`, passed: tier2Attached },
    { id: 'complexity', label: 'Complexity score finalized by ID', detail: complexityFinalized ? `Score: ${c.complexity_score}, Level: ${c.complexity_level}` : 'Not finalized', passed: complexityFinalized },
    { id: 'eligibility', label: 'Eligibility model configured', detail: eligibilitySet ? String(c.eligibility) : 'Not set', passed: eligibilitySet },
    { id: 'visibility', label: 'Visibility set', detail: visibilitySet ? String(c.visibility) : 'Not set', passed: visibilitySet },
    { id: 'schedule', label: 'Phase schedule durations defined', detail: phaseScheduleDefined ? 'Schedule configured' : 'Not configured', passed: phaseScheduleDefined },
    { id: 'reward', label: 'Reward structure validated', detail: rewardValid ? 'Reward structure present' : 'Missing', passed: rewardValid },
    { id: 'maturity', label: 'Maturity level & artifact types defined', detail: maturitySet ? String(c.maturity_level) : 'Not set', passed: maturitySet && artifactsDefined },
    { id: 'solver_match', label: 'At least 1 solver matches eligibility criteria', detail: `${solverMatchCount} solver(s) matched`, passed: solverMatchCount > 0 },
  ];
}

/* ─── Lightweight GATE-11-L checks ───────────────────────── */

function buildLightweightChecks(c: Record<string, unknown>, legalDocs: any[], solverMatchCount: number): GateCheckItem[] {
  const coreFieldsComplete = !!(c.title && c.problem_statement && c.deliverables && c.evaluation_criteria && c.reward_structure && c.maturity_level && c.phase_schedule && c.description);
  const legalAutoAttached = legalDocs.length > 0;
  const complexitySelected = !!(c.complexity_level) || (c.complexity_parameters != null);
  const accessSet = !!(c.visibility && c.visibility !== '') && !!(c.eligibility && c.eligibility !== '');
  const scheduleConfirmed = c.phase_schedule != null;

  return [
    { id: 'core_fields', label: '8 core fields complete', detail: 'Title, problem statement, deliverables, evaluation criteria, reward, maturity, schedule, description', passed: coreFieldsComplete },
    { id: 'legal_auto', label: 'Legal templates auto-attached', detail: legalAutoAttached ? `${legalDocs.length} template(s) attached` : 'No templates found', passed: legalAutoAttached },
    { id: 'complexity', label: 'Complexity level selected', detail: c.complexity_level ? String(c.complexity_level) : 'Not selected', passed: complexitySelected },
    { id: 'access', label: 'Access toggle set', detail: accessSet ? `Visibility: ${c.visibility}, Eligibility: ${c.eligibility}` : 'Not configured', passed: accessSet },
    { id: 'schedule', label: 'Phase schedule confirmed', detail: scheduleConfirmed ? 'Schedule defined' : 'Not defined', passed: scheduleConfirmed },
    { id: 'solver_match', label: 'Solver match exists', detail: `${solverMatchCount} solver(s) matched`, passed: solverMatchCount > 0 },
  ];
}

/* ─── Hook ───────────────────────────────────────────────── */

export function usePublicationReadiness(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['publication-readiness', challengeId],
    queryFn: async (): Promise<PublicationReadinessResult> => {
      if (!challengeId) throw new Error('Challenge ID required');

      // Fetch challenge
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, scope, description,
          deliverables, evaluation_criteria, reward_structure,
          maturity_level, phase_schedule, complexity_parameters,
          complexity_score, complexity_level, ip_model,
          visibility, eligibility, governance_profile,
          current_phase, master_status
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (cErr) throw new Error(cErr.message);

      // Fetch legal docs
      const { data: legalDocs } = await supabase
        .from('challenge_legal_docs')
        .select('id, tier, status, document_type')
        .eq('challenge_id', challengeId);

      // For solver match: check if any active solver profiles exist
      // (simplified: count solver_profiles as a proxy)
      const { count: solverCount } = await supabase
        .from('challenge_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId);

      // If no submissions yet, check if there are any solver profiles at all as a proxy
      let solverMatchCount = solverCount ?? 0;
      if (solverMatchCount === 0) {
        const { count: profileCount } = await supabase
          .from('solver_profiles' as any)
          .select('id', { count: 'exact', head: true });
        solverMatchCount = profileCount ?? 0;
      }

      const c = challenge as Record<string, unknown>;
      const isLightweight = c.governance_profile === 'LIGHTWEIGHT';
      const docs = legalDocs ?? [];

      const checks = isLightweight
        ? buildLightweightChecks(c, docs, solverMatchCount)
        : buildEnterpriseChecks(c, docs, solverMatchCount);

      const failCount = checks.filter((ch) => !ch.passed).length;

      return {
        challengeTitle: String(c.title ?? 'Untitled Challenge'),
        governanceProfile: String(c.governance_profile ?? 'ENTERPRISE'),
        allPassed: failCount === 0,
        failCount,
        checks,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}
