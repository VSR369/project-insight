/**
 * useManageChallenge — Data hook for the Challenge Management page.
 *
 * Fetches:
 * 1. Challenge metadata (title, status, deadline, governance_profile)
 * 2. Submissions with anonymised solver IDs for Enterprise
 * 3. Package versions (snapshot history)
 * 4. Amendment records
 * 5. ID-role permission check for deadline extension
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { resolveGovernanceMode, isEnterpriseGrade } from '@/lib/governanceMode';

/* ─── Types ──────────────────────────────────────────────── */

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
  submissionDeadline: string | null;
  submissionCount: number;
  submissions: ManagedSubmission[];
  packageVersions: PackageVersion[];
  canExtendDeadline: boolean;
}

/* ─── Helpers ────────────────────────────────────────────── */

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function anonymiseIndex(idx: number): string {
  if (idx < 26) return `Solver-${ALPHA[idx]}`;
  const first = ALPHA[Math.floor(idx / 26) - 1] ?? 'Z';
  const second = ALPHA[idx % 26];
  return `Solver-${first}${second}`;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useManageChallenge(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['manage-challenge', challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<ManageChallengeData> => {
      if (!challengeId) throw new Error('Challenge ID required');

      // 1. Challenge metadata
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select('id, title, master_status, governance_profile, submission_deadline')
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (cErr) throw new Error(cErr.message);
      if (!challenge) throw new Error('Challenge not found');

      // 2. Submissions
      const { data: subs, error: sErr } = await supabase
        .from('challenge_submissions')
        .select('id, submitter_name, created_at, status')
        .eq('challenge_id', challengeId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (sErr) throw new Error(sErr.message);

      const isEnterprise = isEnterpriseGrade(resolveGovernanceMode(challenge.governance_profile));

      const submissions: ManagedSubmission[] = (subs ?? []).map((s, idx) => ({
        id: s.id,
        solverLabel: isEnterprise ? anonymiseIndex(idx) : s.submitter_name,
        submitterName: s.submitter_name,
        submittedAt: s.created_at,
        status: s.status ?? 'draft',
      }));

      // 3. Package versions
      const { data: versions, error: vErr } = await supabase
        .from('challenge_package_versions')
        .select('id, version_number, created_at, snapshot')
        .eq('challenge_id', challengeId)
        .order('version_number', { ascending: true });

      if (vErr) throw new Error(vErr.message);

      // 4. Amendment records for change summaries
      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('version_after, reason')
        .eq('challenge_id', challengeId)
        .order('amendment_number', { ascending: true });

      const amendmentMap = new Map<number, string>();
      (amendments ?? []).forEach((a) => {
        if (a.version_after != null) {
          amendmentMap.set(a.version_after, a.reason ?? 'Amendment applied');
        }
      });

      const packageVersions: PackageVersion[] = (versions ?? []).map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        createdAt: v.created_at,
        snapshot: v.snapshot as Record<string, unknown> | null,
        changeSummary: v.version_number === 1
          ? 'Initial publication'
          : amendmentMap.get(v.version_number) ?? null,
      }));

      // 5. Permission check — can current user extend deadline? (CU role)
      let canExtendDeadline = false;
      if (userId) {
        const { data: perm } = await supabase.rpc('can_perform', {
          p_user_id: userId,
          p_challenge_id: challengeId,
          p_required_role: 'CU',
        });
        canExtendDeadline = perm === true;
      }

      return {
        challengeId: challenge.id,
        title: challenge.title,
        masterStatus: challenge.master_status ?? 'ACTIVE',
        governanceProfile: challenge.governance_profile ?? 'ENTERPRISE',
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
