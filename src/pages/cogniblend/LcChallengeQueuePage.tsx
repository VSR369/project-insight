/**
 * LcChallengeQueuePage — Landing page for Legal Coordinators.
 * Lists challenges assigned to the current user with the LC role.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCogniUserRoles } from '@/hooks/cogniblend/useCogniUserRoles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ArrowRight, FolderOpen } from 'lucide-react';
import { ROLE_COLORS } from '@/types/cogniRoles';

export default function LcChallengeQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: challengeRows, isLoading } = useCogniUserRoles();

  // Filter to challenges where user holds LC role
  const lcChallenges = useMemo(() => {
    if (!challengeRows) return [];
    return challengeRows.filter((row) =>
      row.role_codes?.includes('LC') && row.current_phase >= 2
    );
  }, [challengeRows]);

  const handleOpenWorkspace = (challengeId: string) => {
    navigate(`/cogni/challenges/${challengeId}/legal`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const lcColor = ROLE_COLORS['LC'];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Legal Workspace
        </h1>
        <p className="text-sm mt-1 text-muted-foreground">
          Review and attach legal documents (NDA, IP Assignment, Terms) for challenges before curation.
        </p>
      </div>

      <div
        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground"
      >
        <FileText className="h-3.5 w-3.5" />
        Legal Review
      </div>

      {lcChallenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">No challenges assigned</p>
            <p className="text-sm mt-1 text-muted-foreground">
              When you are assigned as Legal Coordinator for a challenge, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lcChallenges.map((challenge) => (
            <Card
              key={challenge.challenge_id}
              className="transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => handleOpenWorkspace(challenge.challenge_id)}
            >
              <CardContent className="flex items-center justify-between gap-4 py-4 px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate text-foreground">
                    {challenge.challenge_title || 'Untitled Challenge'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>Phase {challenge.current_phase}</span>
                    <span>·</span>
                    <span
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{ backgroundColor: lcColor.bg, color: lcColor.color }}
                    >
                      LC
                    </span>
                    <span>·</span>
                    <span className="capitalize">{challenge.phase_status?.toLowerCase().replace(/_/g, ' ') ?? '—'}</span>
                    {challenge.operating_model && (
                      <>
                        <span>·</span>
                        <span>{challenge.operating_model}</span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenWorkspace(challenge.challenge_id);
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Review Documents</span>
                  <span className="lg:hidden">Open</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
