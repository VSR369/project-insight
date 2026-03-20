/**
 * WhatsNextCard — Prominent card on the CogniBlend dashboard showing
 * challenges in intermediate phases with direct action links and role hints.
 * Only shows challenges where the current user has an active role.
 */

import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/* ── Phase → action mapping ─────────────────────────────── */

interface PhaseAction {
  label: string;
  description: string;
  route: (id: string) => string;
  role: string;
}

const PHASE_ACTIONS: Record<number, PhaseAction> = {
  1: {
    label: 'Complete Spec Review',
    description: 'Review and approve the AI-generated specification.',
    route: (id) => `/cogni/challenges/${id}/spec`,
    role: 'Challenge Creator',
  },
  2: {
    label: 'Attach Legal Documents',
    description: 'Attach required Tier 1 & Tier 2 legal documents.',
    route: (id) => `/cogni/challenges/${id}/legal`,
    role: 'Challenge Creator',
  },
  3: {
    label: 'Awaiting Curation',
    description: 'Challenge is in the curation queue for review.',
    route: () => `/cogni/curation`,
    role: 'Curator',
  },
  4: {
    label: 'Awaiting ID Approval',
    description: 'Innovation Director needs to approve this challenge.',
    route: () => `/cogni/curation`,
    role: 'Innovation Director',
  },
};

interface InProgressChallenge {
  id: string;
  title: string;
  current_phase: number | null;
}

export function WhatsNextCard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: challenges = [] } = useQuery({
    queryKey: ['whats-next-challenges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Get challenge IDs where user has an active role
      const { data: roleRows, error: roleError } = await supabase
        .from('user_challenge_roles')
        .select('challenge_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (roleError || !roleRows || roleRows.length === 0) return [];

      const userChallengeIds = [...new Set(roleRows.map((r) => r.challenge_id))];

      // 2. Fetch only those challenges that are in actionable phases
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, current_phase')
        .in('id', userChallengeIds)
        .lte('current_phase', 4)
        .gte('current_phase', 1)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (error) return [];
      return (data ?? []) as InProgressChallenge[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  if (challenges.length === 0) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-5 space-y-3">
      <div className="flex items-center gap-2">
        <Compass className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">What's Next</h3>
      </div>

      {challenges.map((c) => {
        const phase = c.current_phase ?? 1;
        const action = PHASE_ACTIONS[phase];
        if (!action) return null;

        return (
          <div
            key={c.id}
            className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 rounded-md border border-border bg-card p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {action.description}
                <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                  Role: {action.role}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 border-primary text-primary hover:bg-primary/10"
              onClick={() => navigate(action.route(c.id))}
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
