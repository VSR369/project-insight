/**
 * ChallengeDetailPublic — Public challenge detail at /challenges/[id].
 * Spec 6.6: 150-char preview publicly, full content gated behind auth.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { usePublicChallengeDetail } from '@/hooks/queries/usePublicChallengeDetail';
import { useAuthSession } from '@/hooks/queries/useAuthSession';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Lock, Trophy, Calendar, ClipboardList, MessageSquare, Send } from 'lucide-react';
import { MatchScoreBadge } from '@/components/enrollment/MatchScoreBadge';

export default function ChallengeDetailPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: challenge, isLoading, error } = usePublicChallengeDetail(id);
  const { data: session } = useAuthSession();

  const isAuthenticated = !!session?.user;

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
        <p className="text-muted-foreground">
          This challenge may have been removed or is not yet published.
        </p>
        <Button variant="outline" onClick={() => navigate('/browse-challenges')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Browse Challenges
        </Button>
      </div>
    );
  }

  const descriptionPreview = challenge.description
    ? challenge.description.slice(0, 150) + (challenge.description.length > 150 ? '…' : '')
    : 'No description available.';

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
          {isAuthenticated && session?.user && (
            <MatchScoreBadge
              providerId={session.user.id}
              challengeId={challenge.id}
              profileStrength={65}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {isAuthenticated ? (challenge.description || 'No description available.') : descriptionPreview}
          </p>
        </CardContent>
      </Card>

      {!isAuthenticated ? (
        <GatedLockCard
          minStarTier={challenge.min_star_tier}
          onSignIn={() => navigate('/login')}
        />
      ) : (
        <AuthenticatedSections
          challenge={challenge}
          onSubmitInterest={() => navigate(`/challenges/${challenge.id}/submit`)}
        />
      )}

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

/* ── Sub-components (kept in same file, under 250 total) ── */

interface GatedLockCardProps {
  minStarTier: number;
  onSignIn: () => void;
}

function GatedLockCard({ minStarTier, onSignIn }: GatedLockCardProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center space-y-3">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <h3 className="font-semibold">Full Details Locked</h3>
        <p className="text-sm text-muted-foreground">
          {minStarTier > 0
            ? `Requires ${minStarTier}-star certification to view full details.`
            : 'Sign in as a registered provider to access full challenge details, evaluation criteria, Q&A, and submit your proposal.'}
        </p>
        <Button onClick={onSignIn}>Sign In to Access</Button>
      </CardContent>
    </Card>
  );
}

interface AuthenticatedSectionsProps {
  challenge: {
    problem_statement: string | null;
    scope: string | null;
    evaluation_criteria: unknown;
    id: string;
  };
  onSubmitInterest: () => void;
}

function AuthenticatedSections({ challenge, onSubmitInterest }: AuthenticatedSectionsProps) {
  const criteria = challenge.evaluation_criteria as Array<{ criterion: string; weight: number }> | null;

  return (
    <>
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

      {challenge.scope && (
        <Card>
          <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {challenge.scope}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Evaluation Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          {criteria && criteria.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {criteria.map((c, i) => (
                <li key={i} className="flex justify-between">
                  <span>{c.criterion}</span>
                  <span className="font-medium">{c.weight}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Evaluation criteria will be shared once the challenge is fully published.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Q&A Thread
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Q&A thread will be available once the challenge enters its active phase.
            Check back soon to ask questions.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-2">
        <Button size="lg" onClick={onSubmitInterest}>
          <Send className="mr-2 h-4 w-4" /> Submit Expression of Interest
        </Button>
      </div>
    </>
  );
}
