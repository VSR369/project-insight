import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, UserX, RefreshCw, MailPlus } from 'lucide-react';
import type { InvitationUiStatus } from '@/services/cogniblend/lifecycle/challengeInvitations';
import {
  useCertifiedProviders,
  useChallengeVisibility,
  useInviteProvider,
  useRevokeInvitation,
} from '@/hooks/cogniblend/useChallengeInvitations';

export interface ChallengeInvitationsCardProps {
  challengeId: string;
}

const STATUS_LABEL: Record<InvitationUiStatus, string> = {
  not_invited: 'Not invited',
  invited: 'Invited',
  accepted: 'Accepted',
  declined: 'Declined',
  revoked: 'Revoked',
  expired: 'Expired',
};

function statusVariant(status: InvitationUiStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'invited') return 'default';
  if (status === 'accepted') return 'secondary';
  if (status === 'revoked' || status === 'expired' || status === 'declined') return 'destructive';
  return 'outline';
}

export function ChallengeInvitationsCard({ challengeId }: ChallengeInvitationsCardProps) {
  const [search, setSearch] = useState('');
  const visibilityQuery = useChallengeVisibility(challengeId);
  const providersQuery = useCertifiedProviders(challengeId);
  const inviteMutation = useInviteProvider(challengeId);
  const revokeMutation = useRevokeInvitation(challengeId);

  const filtered = useMemo(() => {
    const rows = providersQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.provider_name.toLowerCase().includes(term));
  }, [providersQuery.data, search]);

  if (visibilityQuery.isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="mb-2 h-5 w-40" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (visibilityQuery.data !== 'invite_only') return null;

  if (providersQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MailPlus className="h-4 w-4 text-muted-foreground" /> Provider Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (providersQuery.isError) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MailPlus className="h-4 w-4 text-muted-foreground" /> Provider Invitations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="mb-2 text-sm text-muted-foreground">Could not load eligible providers.</p>
          <Button size="sm" variant="outline" onClick={() => providersQuery.refetch()}>
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const providers = providersQuery.data ?? [];
  const invitedCount = providers.filter((p) => p.uiStatus === 'invited').length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MailPlus className="h-4 w-4 text-muted-foreground" /> Provider Invitations
          <Badge variant="outline" className="ml-1 text-[10px]">Invite only</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-xs text-muted-foreground">
          {invitedCount} invited · {providers.length} certified providers eligible
        </p>
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No certified providers match this challenge's industry and minimum expertise level yet.
          </p>
        ) : (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search providers…"
              className="h-8 text-base"
              aria-label="Search providers"
            />
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.provider_id} className="flex items-center justify-between gap-2 rounded border p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.provider_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.industry_segment_name ?? 'Any industry'} · L{p.expertise_level}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={statusVariant(p.uiStatus)} className="text-[10px]">
                      {STATUS_LABEL[p.uiStatus]}
                    </Badge>
                    {p.canInvite && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={inviteMutation.isPending}
                        onClick={() => inviteMutation.mutate(p.provider_id)}
                        aria-label={`Invite ${p.provider_name}`}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                    {p.canRevoke && p.invitation_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(p.invitation_id as string)}
                        aria-label={`Revoke invitation for ${p.provider_name}`}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-2 text-sm text-muted-foreground">No providers match your search.</li>
              )}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ChallengeInvitationsCard;
