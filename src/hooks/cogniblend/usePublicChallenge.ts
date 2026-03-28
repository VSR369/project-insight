/**
 * usePublicChallenge — Fetches published challenge data for the public detail page.
 * Includes visibility/eligibility checks against current user.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface PublicChallengeData {
  id: string;
  title: string;
  problem_statement: string | null;
  scope: string | null;
  description: string | null;
  maturity_level: string | null;
  complexity_level: string | null;
  complexity_score: number | null;
  operating_model: string | null;
  visibility: string | null;
  eligibility: string | null;
  currency_code: string | null;
  submission_deadline: string | null;
  published_at: string | null;
  reward_structure: Record<string, unknown> | null;
  evaluation_criteria: Record<string, unknown> | null;
  deliverables: Record<string, unknown> | null;
  ip_model: string | null;
  phase_schedule: Record<string, unknown> | null;
  escrowFunded: boolean;
  isEligible: boolean;
  isVisible: boolean;
  daysRemaining: number | null;
  challenge_enrollment: string | null;
  tenant_id: string;
}

/* ─── Eligibility / visibility helpers ───────────────────── */

const VISIBILITY_RANK: Record<string, number> = {
  public: 1,
  registered_users: 2,
  curated_experts: 3,
  invite_only: 4,
};

const ELIGIBILITY_RANK: Record<string, number> = {
  anyone: 1,
  registered_users: 2,
  curated_experts: 3,
  invited_only: 4,
};

function checkVisibility(visibility: string | null, isAuthenticated: boolean): boolean {
  if (!visibility || visibility === 'public') return true;
  if (visibility === 'registered_users' && isAuthenticated) return true;
  // curated_experts and invite_only require specific checks
  // For now, authenticated users can view registered_users+ content
  if (isAuthenticated) return true;
  return false;
}

function checkEligibility(eligibility: string | null, isAuthenticated: boolean): boolean {
  if (!eligibility || eligibility === 'anyone') return true;
  if (eligibility === 'registered_users' && isAuthenticated) return true;
  // Curated/invited require role-based checks — simplified for now
  if (eligibility === 'curated_experts' || eligibility === 'invited_only') return false;
  return isAuthenticated;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function usePublicChallenge(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['public-challenge', challengeId],
    queryFn: async (): Promise<PublicChallengeData | null> => {
      if (!challengeId) return null;

      // Get current user (may be null for public visitors)
      const { data: { user } } = await supabase.auth.getUser();
      const isAuthenticated = !!user;

      // Fetch challenge (only published ones)
      const { data: challenge, error } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, scope, description,
          maturity_level, complexity_level, complexity_score,
          operating_model, visibility, eligibility, currency_code,
          submission_deadline, published_at, tenant_id, ip_model,
          reward_structure, evaluation_criteria, deliverables, phase_schedule
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .not('published_at', 'is', null)
        .single();

      if (error || !challenge) return null;

      // Visibility check
      const isVisible = checkVisibility(challenge.visibility, isAuthenticated);
      if (!isVisible) {
        return { ...buildResult(challenge), isVisible: false, isEligible: false, escrowFunded: false, daysRemaining: null };
      }

      // Eligibility check
      const isEligible = checkEligibility(challenge.eligibility, isAuthenticated);

      // Escrow check
      const { data: escrow } = await supabase
        .from('escrow_records')
        .select('escrow_status')
        .eq('challenge_id', challengeId)
        .maybeSingle();

      const escrowFunded = escrow?.escrow_status === 'FUNDED';

      // Days remaining
      let daysRemaining: number | null = null;
      if (challenge.submission_deadline) {
        const deadline = new Date(challenge.submission_deadline);
        const now = new Date();
        daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      return {
        ...buildResult(challenge),
        escrowFunded,
        isEligible,
        isVisible: true,
        daysRemaining,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

function buildResult(c: Record<string, unknown>): Omit<PublicChallengeData, 'escrowFunded' | 'isEligible' | 'isVisible' | 'daysRemaining'> {
  return {
    id: c.id as string,
    title: c.title as string,
    problem_statement: c.problem_statement as string | null,
    scope: c.scope as string | null,
    description: c.description as string | null,
    maturity_level: c.maturity_level as string | null,
    complexity_level: c.complexity_level as string | null,
    complexity_score: c.complexity_score as number | null,
    operating_model: c.operating_model as string | null,
    visibility: c.visibility as string | null,
    eligibility: c.eligibility as string | null,
    currency_code: c.currency_code as string | null,
    submission_deadline: c.submission_deadline as string | null,
    published_at: c.published_at as string | null,
    reward_structure: c.reward_structure as Record<string, unknown> | null,
    evaluation_criteria: c.evaluation_criteria as Record<string, unknown> | null,
    deliverables: c.deliverables as Record<string, unknown> | null,
    ip_model: c.ip_model as string | null,
    phase_schedule: c.phase_schedule as Record<string, unknown> | null,
    challenge_enrollment: c.challenge_enrollment as string | null,
    tenant_id: c.tenant_id as string,
  };
}
