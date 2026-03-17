/**
 * OpenChallengesSection — Grid of active/published challenges on the dashboard.
 * Queries challenges with master_status = 'ACTIVE'.
 * Responsive: single column on mobile, 2-col on tablet+.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

/* ── Complexity colour map ───────────────────────────────── */

const COMPLEXITY_STYLE: Record<string, string> = {
  L1: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  L2: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  L3: 'bg-[hsl(38,60%,92%)] text-[hsl(38,68%,35%)]',
  L4: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
  L5: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
};

/* ── Hook ─────────────────────────────────────────────────── */

interface OpenChallenge {
  id: string;
  title: string;
  total_fee: number | null;
  currency_code: string | null;
  submission_deadline: string | null;
  complexity_level: string | null;
  md_challenge_complexity: { complexity_label: string; complexity_level: number } | null;
  md_engagement_models: { name: string } | null;
}

function useOpenChallenges() {
  return useQuery({
    queryKey: ['cogni-open-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, total_fee, currency_code, submission_deadline, complexity_level,
          md_challenge_complexity(complexity_label, complexity_level),
          md_engagement_models(name)
        `)
        .eq('master_status', 'ACTIVE')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return (data ?? []) as OpenChallenge[];
    },
    ...CACHE_FREQUENT,
  });
}

/* ── Component ────────────────────────────────────────────── */

export function OpenChallengesSection() {
  const { data: challenges = [], isLoading } = useOpenChallenges();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section className="mt-6 lg:mt-8">
        <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">Open Challenges</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (challenges.length === 0) {
    return (
      <section className="mt-6 lg:mt-8">
        <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">Open Challenges</h2>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 lg:p-8">
          <Search className="h-7 w-7 lg:h-8 lg:w-8 text-muted-foreground mb-2" />
          <p className="text-xs lg:text-sm text-muted-foreground text-center">
            No open challenges yet. Published challenges will appear here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 lg:mt-8">
      <h2 className="text-base lg:text-lg font-bold text-[hsl(218,52%,25%)] mb-3 lg:mb-4">Open Challenges</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {challenges.map((c) => {
          const daysLeft = c.submission_deadline
            ? differenceInDays(new Date(c.submission_deadline), new Date())
            : null;

          const cxLevel = c.complexity_level ?? `L${c.md_challenge_complexity?.complexity_level ?? 1}`;
          const cxLabel = c.md_challenge_complexity?.complexity_label ?? cxLevel;
          const cxStyle = COMPLEXITY_STYLE[cxLevel] ?? COMPLEXITY_STYLE.L3;

          return (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-card p-3 lg:p-4 flex flex-col gap-2"
            >
              {/* Title */}
              <span className="text-[13px] lg:text-[15px] font-bold text-[hsl(218,52%,25%)] line-clamp-2">
                {c.title}
              </span>

              {/* Domain / complexity chips */}
              <div className="flex flex-wrap items-center gap-2">
                {c.md_engagement_models?.name && (
                  <span className="rounded-full bg-[hsl(210,60%,95%)] px-2.5 py-0.5 text-[10px] lg:text-xs text-[hsl(210,60%,40%)]">
                    {c.md_engagement_models.name}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] lg:text-xs font-medium ${cxStyle}`}>
                  {cxLabel}
                </span>
              </div>

              {/* Award amount */}
              {c.total_fee != null && (
                <span className="text-sm lg:text-base font-bold text-foreground">
                  {c.currency_code ?? 'USD'} {c.total_fee.toLocaleString()}
                </span>
              )}

              {/* Deadline */}
              {daysLeft != null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[11px] lg:text-xs">
                    {daysLeft > 0
                      ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
                      : daysLeft === 0
                        ? 'Deadline today'
                        : 'Deadline passed'}
                  </span>
                </div>
              )}

              {/* View Details */}
              <Button
                variant="outline"
                size="sm"
                className="mt-auto w-full lg:w-fit text-[13px] border-[hsl(210,68%,54%)] text-[hsl(210,68%,54%)] hover:bg-[hsl(210,68%,54%)]/10"
                onClick={() => navigate(`/cogni/challenges/${c.id}`)}
              >
                View Details
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
