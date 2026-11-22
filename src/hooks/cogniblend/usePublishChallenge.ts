/** Creates the package snapshot and runs the central publication lifecycle step. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { handleMutationError } from '@/lib/errorHandler';
import { shouldHoldForFutureStart } from '@/services/cogniblend/lifecycle/lifecycleJobs';

interface PublishPayload {
  challengeId: string;
  userId: string;
}

interface PublishResult {
  challengeId: string;
  challengeTitle: string;
  scheduled: boolean;
  scheduledStart: string | null;
}

interface CompletePhaseResult {
  current_phase?: number;
}

export function usePublishChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PublishPayload): Promise<PublishResult> => {
      const { challengeId, userId } = payload;
      const { data: challenge, error: fetchErr } = await supabase
        .from('challenges')
        .select(`
          id, title, description, problem_statement, scope,
          deliverables, evaluation_criteria, reward_structure,
          maturity_level, phase_schedule, complexity_parameters,
          complexity_score, complexity_level, ip_model,
          visibility, eligibility, eligibility_model,
          governance_profile, operating_model, currency_code,
          max_solutions, submission_deadline, rejection_fee_percentage,
          solver_eligibility_types, targeting_filters,
          challenge_model_is_agg, start_at
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!challenge) throw new Error('Challenge not found');

      const { data: legalDocs } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, status, template_version, document_name')
        .eq('challenge_id', challengeId);

      const isFutureStart = shouldHoldForFutureStart(challenge.start_at, new Date());
      const snapshot = {
        challenge,
        legal_docs: legalDocs ?? [],
        published_at: isFutureStart ? null : new Date().toISOString(),
        scheduled_start: challenge.start_at,
        published_by: userId,
      };

      const { error: versionErr } = await supabase
        .from('challenge_package_versions')
        .insert({
          challenge_id: challengeId,
          version_number: 1,
          snapshot: snapshot as unknown as Json,
          created_by: userId,
        });
      if (versionErr) throw new Error(versionErr.message);

      const { error: lockErr } = await supabase
        .from('challenges')
        .update({
          published_at: isFutureStart ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', challengeId);
      if (lockErr) throw new Error(lockErr.message);

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: isFutureStart ? 'CHALLENGE_SCHEDULED' : 'CHALLENGE_PUBLISHED',
        method: 'HUMAN',
        details: { package_version: 1, title: challenge.title, start_at: challenge.start_at },
      });

      const { data: phaseResult, error: phaseErr } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (phaseErr) throw new Error(phaseErr.message);
      const currentPhase = (phaseResult as CompletePhaseResult | null)?.current_phase;
      const scheduled = isFutureStart && currentPhase === 4;

      return {
        challengeId,
        challengeTitle: challenge.title,
        scheduled,
        scheduledStart: scheduled ? challenge.start_at : null,
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
