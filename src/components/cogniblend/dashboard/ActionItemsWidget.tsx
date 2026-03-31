/**
 * ActionItemsWidget — Welcome banner + stat cards only.
 * The action items table is handled by MyActionItemsSection.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';
import { ROLE_DISPLAY, ROLE_PRIMARY_ACTION } from '@/types/cogniRoles';

export function ActionItemsWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: orgContext } = useOrgModelContext();
  const { activeRole, challengeRoleMap, isRolesLoading } = useCogniRoleContext();
  const { data: challengesData, isLoading: chLoading } = useMyChallenges(user?.id);

  const isLoading = chLoading || isRolesLoading;

  const challengeItems = challengesData?.items ?? [];

  const filteredChallengeItems = useMemo(() => {
    if (!activeRole) return challengeItems;
    return challengeItems.filter((ch) => {
      const roles = challengeRoleMap.get(ch.challenge_id) ?? [];
      // Drafts (IN_PREPARATION phase 1) always visible to creator
      if (ch.master_status === 'IN_PREPARATION' && ch.current_phase === 1) return true;
      return roles.includes(activeRole);
    });
  }, [challengeItems, activeRole, challengeRoleMap]);

  const activeChallenges = filteredChallengeItems.filter(
    (c) => c.master_status === 'ACTIVE' || c.master_status === 'IN_PREPARATION'
  ).length;

  const pendingActions = filteredChallengeItems.filter(
    (c) => (c.master_status === 'IN_PREPARATION' && c.current_phase === 1) || c.phase_status === 'RETURNED'
  ).length;

  const roleName = ROLE_DISPLAY[activeRole] ?? 'Team Member';
  const modelLabel = orgContext?.operatingModel === 'MP' ? 'Marketplace' : 'Aggregator';
  const orgName = currentOrg?.orgName ?? 'Your Organization';
  const primaryAction = ROLE_PRIMARY_ACTION[activeRole] ?? { label: 'Create Challenge', route: '/cogni/challenges/create' };

  if (isLoading) {
    return (
      <div className="space-y-4 mb-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* ── Welcome Banner ──────────── */}
      <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(218 52% 22%) 0%, hsl(218 52% 35%) 100%)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-sm text-white/70 mt-0.5">
              {roleName} · {orgName}
              <Badge variant="outline" className="ml-2 text-[10px] border-white/30 text-white/80">
                {modelLabel}
              </Badge>
            </p>
          </div>
          <Button
            onClick={() => navigate(primaryAction.route)}
            size="sm"
            className="gap-1.5 shrink-0 bg-white text-[hsl(218,52%,25%)] hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cogni/my-challenges')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeChallenges}</p>
              <p className="text-xs text-muted-foreground">Active Challenges</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cogni/my-challenges')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingActions}</p>
              <p className="text-xs text-muted-foreground">Pending Actions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/cogni/my-challenges')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">SLA Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
