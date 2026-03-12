/**
 * PrimaryAdminDashboard — Role-specific dashboard for Primary SO Admins.
 * Matches reference design: role gap alert, 4 summary cards, management console grid,
 * active alerts panel, and recent activity feed.
 */
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentSeekerAdmin, useDelegatedAdmins } from '@/hooks/queries/useDelegatedAdmins';
import { useAdminRecentActivity } from '@/hooks/queries/useAdminDashboardStats';
import type { AuditLogEntry } from '@/hooks/queries/useAdminDashboardStats';
import { useRoleReadiness } from '@/hooks/queries/useRoleReadiness';
import { useRoleAssignments } from '@/hooks/queries/useRoleAssignments';
import { useSlmRoleCodes } from '@/hooks/queries/useSlmRoleCodes';
import { usePendingChallengeRefs } from '@/hooks/queries/usePendingChallengeRefs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ShieldCheck,
  Users,
  CheckCircle2,
  ArrowRight,
  Activity,
  Shield,
  UserCog,
  Mail,
  BookOpen,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function PrimaryAdminDashboard() {
  const { organizationId } = useOrgContext();
  const navigate = useNavigate();

  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);
  const { data: readinessData, isLoading: readinessLoading } = useRoleReadiness(organizationId);
  const { data: assignments } = useRoleAssignments(organizationId);
  const { data: allRoleCodes } = useSlmRoleCodes();
  const { data: delegatedAdmins } = useDelegatedAdmins(organizationId);
  const { data: pendingRefs } = usePendingChallengeRefs(organizationId);
  const { data: activity, isLoading: activityLoading } = useAdminRecentActivity(organizationId);

  const greeting = currentAdmin?.full_name ? `Welcome, ${currentAdmin.full_name}` : 'Welcome';

  // Compute summary stats
  const coreRoles = (allRoleCodes ?? []).filter((r) => r.is_core);
  const challengeRoles = (allRoleCodes ?? []).filter((r) => !r.is_core);
  const activeAssignments = (assignments ?? []).filter((a) => a.status === 'active');

  const coreFilledCount = coreRoles.filter((r) =>
    activeAssignments.some((a) => a.role_code === r.code)
  ).length;
  const challengeFilledCount = challengeRoles.filter((r) =>
    activeAssignments.some((a) => a.role_code === r.code)
  ).length;

  const totalRequired = coreRoles.length + challengeRoles.length;
  const totalFilled = coreFilledCount + challengeFilledCount;
  const activeDelegatedCount = (delegatedAdmins ?? []).filter((a) => a.status !== 'deactivated').length;

  const hasGaps = totalFilled < totalRequired;
  const blockedChallenges = (pendingRefs ?? []).length;

  const isLoading = readinessLoading;

  return (
    <FeatureErrorBoundary featureName="PrimaryAdminDashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Organisation Overview</h1>
          <p className="text-muted-foreground mt-1">{greeting}</p>
        </div>

        {/* Role Gap Alert Banner */}
        {hasGaps && !isLoading && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Role gaps detected — {totalRequired - totalFilled} role(s) unassigned
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70">
                  {blockedChallenges > 0
                    ? `${blockedChallenges} challenge(s) blocked from submission`
                    : 'Challenges may be blocked until all roles are filled'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              onClick={() => navigate('/org/role-management')}
            >
              Fix Role Gaps
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Shield className="h-5 w-5" />}
              iconBg="bg-primary/10 text-primary"
              label="Core Roles"
              value={`${coreFilledCount}/${coreRoles.length}`}
              status={coreFilledCount >= coreRoles.length ? 'ready' : 'gap'}
            />
            <SummaryCard
              icon={<ShieldCheck className="h-5 w-5" />}
              iconBg="bg-violet-500/10 text-violet-600"
              label="Challenge Roles"
              value={`${challengeFilledCount}/${challengeRoles.length}`}
              status={challengeFilledCount >= challengeRoles.length ? 'ready' : 'gap'}
            />
            <SummaryCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              iconBg="bg-emerald-500/10 text-emerald-600"
              label="Overall Readiness"
              value={`${totalFilled}/${totalRequired}`}
              status={totalFilled >= totalRequired ? 'ready' : 'gap'}
            />
            <SummaryCard
              icon={<Users className="h-5 w-5" />}
              iconBg="bg-amber-500/10 text-amber-600"
              label="Delegated Admins"
              value={activeDelegatedCount}
            />
          </div>
        )}

        {/* Management Consoles Grid */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Management Consoles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ConsoleCard
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Role Management"
              description="Assign and manage core & challenge roles"
              onClick={() => navigate('/org/role-management')}
            />
            <ConsoleCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Role Readiness"
              description="View readiness status for all roles"
              onClick={() => navigate('/org/role-readiness')}
            />
            <ConsoleCard
              icon={<UserCog className="h-5 w-5" />}
              title="Delegated Admins"
              description="Manage delegated admin users"
              onClick={() => navigate('/org/admin-management')}
            />
            <ConsoleCard
              icon={<Mail className="h-5 w-5" />}
              title="Email Templates"
              description="Preview notification email templates"
              onClick={() => navigate('/org/email-templates')}
            />
          </div>
        </div>

        {/* Bottom: Active Alerts + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Active Alerts */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedChallenges === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(pendingRefs ?? []).slice(0, 5).map((ref) => (
                    <div key={ref.id} className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                      <Clock className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          Challenge blocked — missing {ref.missing_role_codes.join(', ')}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{ref.blocking_reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !activity?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No recent activity</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}

/* ── Sub-components ── */

function SummaryCard({ icon, iconBg, label, value, status }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  status?: 'ready' | 'gap';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {status && (
            <Badge
              variant="outline"
              className={status === 'ready'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]'
              }
            >
              {status === 'ready' ? 'FILLED' : 'GAPS'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConsoleCard({ icon, title, description, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mt-auto" />
    </button>
  );
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'active': return 'bg-emerald-500';
    case 'pending_activation': return 'bg-amber-500';
    case 'suspended':
    case 'deactivated': return 'bg-destructive';
    default: return 'bg-primary';
  }
}

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  const meta = entry.metadata as Record<string, string> | null;
  const label = meta?.action
    ? meta.action.replace(/_/g, ' ')
    : entry.change_reason ?? `${entry.previous_status} → ${entry.new_status}`;

  return (
    <li className="flex items-start gap-3">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${statusDotClass(entry.new_status)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground capitalize truncate">{label}</p>
        <p className="text-xs text-muted-foreground">
          {entry.previous_status} → {entry.new_status}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
      </span>
    </li>
  );
}
