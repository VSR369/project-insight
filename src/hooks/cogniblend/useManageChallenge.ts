/** Data for post-publication challenge management. */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { resolveGovernanceMode, isStructuredOrAbove } from '@/lib/governanceMode';

export interface ManagedSubmission {
  id: string;
  solverLabel: string;
  submitterName: string;
  submittedAt: string;
  status: string;
}

export interface PackageVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  snapshot: Record<string, unknown> | null;
  changeSummary: string | null;
}

export interface ManageChallengeData {
  challengeId: string;
  title: string;
  masterStatus: string;
  governanceProfile: string;
  operatingModel: string | null;
  currentPhase: number | null;
  extendedBrief: Record<string, unknown> | null;
  stageCount: 1 | 2;
  abstractDeadline: string | null;
  solutionDeadline: string | null;
  submissionDeadline: string | null;
  submissionCount: number;
  submissions: ManagedSubmission[];
  packageVersions: PackageVersion[];
  canExtendDeadline: boolean;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function anonymiseIndex(index: number): string {
  if (index < 26) return `Provider-${ALPHA[index]}`;
  const first = ALPHA[Math.floor(index / 26) - 1] ?? 'Z';
  const second = ALPHA[index % 26];
  return `Provider-${first}${second}`;
}

export function useManageChallenge(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['manage-challenge', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<ManageChallengeData> => {
      if (!challengeId) throw new Error('Challenge ID required');
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('id, title, master_status, governance_profile, submission_deadline, solution_deadline, abstract_deadline, stage_count, operating_model, extended_brief, current_phase')
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();
      if (challengeError) throw new Error(challengeError.message);
      if (!challenge) throw new Error('Challenge not found');

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('challenge_submissions')
        .select('id, submitter_name, created_at, status')
        .eq('challenge_id', challengeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      if (submissionsError) throw new Error(submissionsError.message);

      const isBlindMode = isStructuredOrAbove(resolveGovernanceMode(challenge.governance_profile));
      const submissions: ManagedSubmission[] = (submissionsData ?? []).map((submission, index) => ({
        id: submission.id,
        solverLabel: isBlindMode ? anonymiseIndex(index) : submission.submitter_name,
        submitterName: submission.submitter_name,
        submittedAt: submission.created_at,
        status: submission.status ?? 'draft',
      }));

      const { data: versions, error: versionsError } = await supabase
        .from('challenge_package_versions')
        .select('id, version_number, created_at, snapshot')
        .eq('challenge_id', challengeId)
        .order('version_number', { ascending: true });
      if (versionsError) throw new Error(versionsError.message);

      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('version_after, reason')
        .eq('challenge_id', challengeId)
        .order('amendment_number', { ascending: true });
      const amendmentMap = new Map<number, string>();
      (amendments ?? []).forEach((amendment) => {
        if (amendment.version_after != null) amendmentMap.set(amendment.version_after, amendment.reason ?? 'Amendment applied');
      });
      const packageVersions: PackageVersion[] = (versions ?? []).map((version) => ({
        id: version.id,
        versionNumber: version.version_number,
        createdAt: version.created_at,
        snapshot: version.snapshot as Record<string, unknown> | null,
        changeSummary: version.version_number === 1 ? 'Initial publication' : amendmentMap.get(version.version_number) ?? null,
      }));

      let canExtendDeadline = false;
      if (userId) {
        const { data: permission } = await supabase.rpc('can_perform', {
          p_user_id: userId,
          p_challenge_id: challengeId,
          p_required_role: 'CU',
        });
        canExtendDeadline = permission === true;
      }

      let parsedBrief: Record<string, unknown> | null = null;
      if (challenge.extended_brief) {
        try {
          parsedBrief = typeof challenge.extended_brief === 'string'
            ? JSON.parse(challenge.extended_brief) as Record<string, unknown>
            : challenge.extended_brief as Record<string, unknown>;
        } catch {
          parsedBrief = null;
        }
      }

      return {
        challengeId: challenge.id,
        title: challenge.title,
        masterStatus: challenge.master_status ?? 'ACTIVE',
        governanceProfile: challenge.governance_profile ?? 'STRUCTURED',
        operatingModel: challenge.operating_model,
        currentPhase: challenge.current_phase,
        extendedBrief: parsedBrief,
        stageCount: challenge.stage_count === 2 ? 2 : 1,
        abstractDeadline: challenge.abstract_deadline,
        solutionDeadline: challenge.solution_deadline,
        submissionDeadline: challenge.submission_deadline,
        submissionCount: submissions.length,
        submissions,
        packageVersions,
        canExtendDeadline,
      };
    },
    ...CACHE_FREQUENT,
  });
}
