/**
 * LcChallengeQueuePage — Landing page for Legal Coordinators.
 * Lists challenges assigned to the current user with the LC role.
 */

import { useMemo, useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCogniUserRoles } from '@/hooks/cogniblend/useCogniUserRoles';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { FileText, ArrowRight, FolderOpen, Search } from 'lucide-react';
import { ROLE_COLORS } from '@/types/cogniRoles';
import { format } from 'date-fns';

export default function LcChallengeQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: challengeRows, isLoading } = useCogniUserRoles();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  // Filter to challenges where user holds LC role, sorted newest first
  const lcChallenges = useMemo(() => {
    if (!challengeRows) return [];
    let list = challengeRows
      .filter((row) => row.role_codes?.includes('LC') && row.current_phase >= 2)
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter((c) => (c.challenge_title ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [challengeRows, deferredSearch]);

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

      <div className="relative w-full lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search challenges..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-base"
        />
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
                    {challenge.created_at && (
                      <>
                        <span>·</span>
                        <span>{format(new Date(challenge.created_at), 'MMM d, yyyy · h:mm a')}</span>
                      </>
                    )}
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
