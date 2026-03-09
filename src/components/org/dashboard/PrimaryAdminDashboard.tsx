/**
 * PrimaryAdminDashboard — Role-specific dashboard for Primary SO Admins.
 * Shows admin KPIs, recent activity feed, and quick actions.
 */
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { useAdminKpiStats, useAdminRecentActivity } from '@/hooks/queries/useAdminDashboardStats';
import type { AuditLogEntry } from '@/hooks/queries/useAdminDashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ShieldCheck,
  Clock,
  TrendingUp,
  UserPlus,
  Settings,
  ArrowRight,
  Activity,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

/* ── Status color mapping ── */
function statusDotClass(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500';
    case 'pending_activation':
      return 'bg-amber-500';
    case 'suspended':
    case 'deactivated':
      return 'bg-destructive';
    default:
      return 'bg-primary';
  }
}

function statusLabel(entry: AuditLogEntry): string {
  const meta = entry.metadata as Record<string, string> | null;
  if (meta?.action) return meta.action.replace(/_/g, ' ');
  if (entry.change_reason) return entry.change_reason;
  return `${entry.previous_status} → ${entry.new_status}`;
}

export default function PrimaryAdminDashboard() {
  const { organizationId } = useOrgContext();
  const navigate = useNavigate();

  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);
  const { data: kpis, isLoading: kpisLoading } = useAdminKpiStats(organizationId);
  const { data: activity, isLoading: activityLoading } = useAdminRecentActivity(organizationId);

  const greeting = currentAdmin?.full_name ? `Welcome, ${currentAdmin.full_name}` : 'Welcome';

  return (
    <FeatureErrorBoundary featureName="PrimaryAdminDashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">{greeting}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpisLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
          ) : (
            <>
              <KpiCard
                icon={<Users className="h-5 w-5" />}
                iconBg="bg-primary/10 text-primary"
                label="Total Admins"
                value={kpis?.totalAdmins ?? 0}
              />
              <KpiCard
                icon={<ShieldCheck className="h-5 w-5" />}
                iconBg="bg-emerald-500/10 text-emerald-600"
                label="Active Roles"
                value={kpis?.activeRoles ?? 0}
              />
              <KpiCard
                icon={<Clock className="h-5 w-5" />}
                iconBg="bg-amber-500/10 text-amber-600"
                label="Pending Activations"
                value={kpis?.pendingActivations ?? 0}
              />
              <KpiCard
                icon={<TrendingUp className="h-5 w-5" />}
                iconBg="bg-violet-500/10 text-violet-600"
                label="This Month"
                value={`+${kpis?.thisMonth ?? 0}`}
              />
            </>
          )}
        </div>

        {/* Bottom: Activity + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : !activity?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No recent activity</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${statusDotClass(entry.new_status)}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize truncate">
                          {statusLabel(entry)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.previous_status} → {entry.new_status}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickActionButton
                icon={<UserPlus className="h-4 w-4" />}
                label="Add Delegated Admin"
                description="Invite a new delegated admin"
                onClick={() => navigate('/org/admin-management/create')}
              />
              <QuickActionButton
                icon={<Users className="h-4 w-4" />}
                label="Manage Admins"
                description="View and manage all admins"
                onClick={() => navigate('/org/admin-management')}
              />
              <QuickActionButton
                icon={<Settings className="h-4 w-4" />}
                label="Organization Settings"
                description="Update profile and preferences"
                onClick={() => navigate('/org/settings')}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}

/* ── Sub-components ── */

interface KpiCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
}

function KpiCard({ icon, iconBg, label, value }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}

function QuickActionButton({ icon, label, description, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left group"
    >
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </button>
  );
}
