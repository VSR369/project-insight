/**
 * ChallengeDetailPublic — Public challenge detail at /challenges/[id] with gated sections.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Lock, Trophy, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChallengeDetail {
  id: string;
  hook: string | null;
  description: string | null;
  problem_statement: string | null;
  reward_amount: number | null;
  currency_code: string | null;
  access_type: string;
  min_star_tier: number;
  complexity_level: string | null;
  published_at: string | null;
  scope: string | null;
  is_active: boolean;
}

  'id', 'hook', 'description', 'problem_statement', 'reward_amount',
  'currency_code', 'access_type', 'min_star_tier', 'complexity_level',
  'published_at', 'scope', 'is_active',
].join(', ');

export default function ChallengeDetailPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: challenge, isLoading, error } = useQuery({
    queryKey: ['public-challenge-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(CHALLENGE_COLS)
        .eq('id', id!)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single();
      if (error) throw new Error(error.message);
      return (data as unknown) as ChallengeDetail;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Challenge Not Found</h1>
        <p className="text-muted-foreground">This challenge may have been removed or is not yet published.</p>
        <Button variant="outline" onClick={() => navigate('/browse-challenges')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Browse Challenges
        </Button>
      </div>
    );
  }

  const isGated = challenge.access_type !== 'open_all';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{challenge.hook || 'Untitled Challenge'}</h1>
        <div className="flex flex-wrap gap-2">
          {challenge.reward_amount && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
              <Trophy className="mr-1 h-3 w-3" />
              {challenge.currency_code ?? 'USD'} {challenge.reward_amount.toLocaleString()}
            </Badge>
          )}
          {challenge.complexity_level && (
            <Badge variant="outline">{challenge.complexity_level}</Badge>
          )}
          {challenge.access_type && (
            <Badge variant="secondary">{challenge.access_type.replace('_', ' ')}</Badge>
          )}
        </div>
      </div>

      {/* Public sections */}
      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {challenge.description || 'No description available.'}
          </p>
        </CardContent>
      </Card>

      {challenge.problem_statement && (
        <Card>
          <CardHeader><CardTitle>Problem Statement</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {challenge.problem_statement}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Gated section */}
      {isGated && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center space-y-3">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">Additional Details Locked</h3>
            <p className="text-sm text-muted-foreground">
              {challenge.min_star_tier > 0
                ? `Requires ${challenge.min_star_tier}-star certification to view full details.`
                : 'Sign in as a registered provider to access full challenge details.'}
            </p>
            <Button onClick={() => navigate('/login')}>
              Sign In to Access
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {challenge.published_at && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Published {new Date(challenge.published_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
