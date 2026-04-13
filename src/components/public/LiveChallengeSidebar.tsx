/**
 * LiveChallengeSidebar — Right sidebar showing top 5 challenges by reward.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LiveChallengeSidebarProps {
  className?: string;
}

interface ChallengePreview {
  id: string;
  hook: string | null;
  reward_amount: number | null;
  currency_code: string | null;
  industry_segment_id: string | null;
}

export function LiveChallengeSidebar({ className }: LiveChallengeSidebarProps) {
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['live-challenges-sidebar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, hook, reward_amount, currency_code, industry_segment_id')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .not('reward_amount', 'is', null)
        .order('reward_amount', { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return (data ?? []) as ChallengePreview[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No active challenges yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top Challenges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {challenges.map((c) => (
          <Link
            key={c.id}
            to={`/challenges/${c.id}`}
            className={cn(
              'block rounded-lg border p-3 hover:bg-muted/50 transition-colors group'
            )}
          >
            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {c.hook || 'Untitled Challenge'}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              {c.reward_amount && (
                <Badge variant="secondary" className="text-xs">
                  {c.currency_code ?? 'USD'} {c.reward_amount.toLocaleString()}
                </Badge>
              )}
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
