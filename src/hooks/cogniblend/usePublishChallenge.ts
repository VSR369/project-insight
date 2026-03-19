/**
 * usePublishChallenge — Creates package snapshot, locks operating model,
 * and calls complete_phase to move Phase 5 → Phase 7.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

interface PublishPayload {
  challengeId: string;
  userId: string;
}

interface PublishResult {
  challengeId: string;
  challengeTitle: string;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function usePublishChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PublishPayload): Promise<PublishResult> => {
      const { challengeId, userId } = payload;

      // 1. Fetch full challenge snapshot data (all 16+ BRD fields)
      const { data: challenge, error: fetchErr } = await supabase
        .from('challenges')
        .select(`
          id, title, description, problem_statement, scope,
          deliverables, evaluation_criteria, reward_structure,
          maturity_level, phase_schedule, complexity_parameters,
          complexity_score, complexity_level, ip_model,
          visibility, eligibility, eligibility_model,
          challenge_visibility, challenge_enrollment, challenge_submission,
          governance_profile, operating_model, currency_code,
          max_solutions, submission_deadline, rejection_fee_percentage,
          solver_eligibility_types, targeting_filters,
          challenge_model_is_agg
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!challenge) throw new Error('Challenge not found');

      // Fetch legal docs for snapshot
      const { data: legalDocs } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, status, template_version, document_name')
        .eq('challenge_id', challengeId);

      // 2. Create challenge_package_versions record (version 1)
      const snapshot = {
        challenge: challenge,
        legal_docs: legalDocs ?? [],
        published_at: new Date().toISOString(),
        published_by: userId,
      };

      const { error: versionErr } = await supabase
        .from('challenge_package_versions')
        .insert({
          challenge_id: challengeId,
          version_number: 1,
          snapshot: snapshot as any,
          created_by: userId,
        });

      if (versionErr) throw new Error(versionErr.message);

      // 3. Lock operating model by setting published_at
      const { error: lockErr } = await supabase
        .from('challenges')
        .update({
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', challengeId);

      if (lockErr) throw new Error(lockErr.message);

      // 3b. Audit: CHALLENGE_PUBLISHED
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'CHALLENGE_PUBLISHED',
        method: 'HUMAN',
        details: {
          package_version: 1,
          title: challenge.title,
        },
      });

      // 4. Call complete_phase to move Phase 5 → Phase 7
      const { data: phaseResult, error: phaseErr } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });

      if (phaseErr) throw new Error(phaseErr.message);

      return {
        challengeId,
        challengeTitle: challenge.title,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['publication-readiness', result.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-detail', result.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'publish_challenge' });
    },
  });
}
