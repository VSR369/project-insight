import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Shield, History, Lock } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useAdminTier } from '@/hooks/useAdminTier';
import {
  useTierPermissions,
  useUpdateTierPermission,
  usePermissionAuditLog,
  buildPermissionMap,
} from '@/hooks/queries/useTierPermissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface PermissionDef {
  key: string;
  label: string;
}

interface PermissionCategoryDef {
  category: string;
  permissions: PermissionDef[];
}

const PERMISSION_CATEGORIES: PermissionCategoryDef[] = [
  {
    category: 'Verification',
    permissions: [
      { key: 'verification.view_dashboard', label: 'View Dashboard' },
      { key: 'verification.claim_from_queue', label: 'Claim from Queue' },
      { key: 'verification.complete_verification', label: 'Complete Verification' },
      { key: 'verification.request_reassignment', label: 'Request Reassignment' },
      { key: 'verification.release_to_queue', label: 'Release to Queue' },
    ],
  },
  {
    category: 'Admin Management',
    permissions: [
      { key: 'admin_management.view_all_admins', label: 'View All Admins' },
      { key: 'admin_management.create_admin', label: 'Create Admin' },
      { key: 'admin_management.edit_admin_profile', label: 'Edit Admin Profile' },
      { key: 'admin_management.deactivate_admin', label: 'Deactivate Admin' },
      { key: 'admin_management.view_my_profile', label: 'View My Profile' },
    ],
  },
  {
    category: 'Supervisor Functions',
    permissions: [
      { key: 'supervisor.approve_reassignments', label: 'Approve Reassignments' },
      { key: 'supervisor.view_team_performance', label: 'View Team Performance' },
      { key: 'supervisor.configure_system', label: 'Configure System' },
      { key: 'supervisor.view_audit_logs', label: 'View Audit Logs' },
      { key: 'supervisor.bulk_reassignment', label: 'Bulk Reassignment' },
      { key: 'supervisor.pin_queue_entries', label: 'Pin Queue Entries' },
    ],
  },
];

const TIERS = [
  { key: 'admin', label: 'Platform Admin' },
  { key: 'senior_admin', label: 'Senior Admin' },
  { key: 'supervisor', label: 'Supervisor' },
] as const;

function PermissionsContent() {
  const { isSupervisor, isLoading: tierLoading } = useAdminTier();
  const { data: permissions, isLoading: permLoading } = useTierPermissions();
  const updatePermission = useUpdateTierPermission();
  const { data: auditLog, isLoading: auditLoading } = usePermissionAuditLog();

  const isLoading = tierLoading || permLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const permMap = buildPermissionMap(permissions ?? []);

  const handleToggle = (id: string, currentValue: boolean) => {
    updatePermission.mutate({ id, is_enabled: !currentValue });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permissions Management</h1>
        <p className="text-muted-foreground">
          {isSupervisor
            ? 'Configure tier-based permissions. Supervisor permissions are locked.'
            : 'Read-only reference of the tier-based permission matrix.'}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        <Shield className="h-4 w-4 shrink-0" />
        <span>
          {isSupervisor
            ? 'Toggle switches to enable or disable permissions per tier. Supervisor column is locked to prevent lockout.'
            : 'Permissions are managed by supervisors. Contact your supervisor to request changes.'}
        </span>
      </div>

      {/* Permission Matrix */}
      {PERMISSION_CATEGORIES.map((cat) => (
        <Card key={cat.category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{cat.category}</CardTitle>
            <CardDescription>
              {cat.category === 'Verification' && 'Core verification processing capabilities'}
              {cat.category === 'Admin Management' && 'Admin profile and team management'}
              {cat.category === 'Supervisor Functions' && 'System oversight and configuration'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Permission</TableHead>
                    {TIERS.map((tier) => (
                      <TableHead key={tier.key} className="text-center w-[150px]">
                        <div className="flex items-center justify-center gap-1.5">
                          {tier.label}
                          {tier.key === 'supervisor' && isSupervisor && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cat.permissions.map((perm) => (
                    <TableRow key={perm.key}>
                      <TableCell className="font-medium text-sm">{perm.label}</TableCell>
                      {TIERS.map((tier) => {
                        const entry = permMap[perm.key]?.[tier.key];
                        const enabled = entry?.is_enabled ?? false;
                        const isLocked = tier.key === 'supervisor';
                        const canEdit = isSupervisor && !isLocked;

                        return (
                          <TableCell key={tier.key} className="text-center">
                            {canEdit ? (
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={() => entry && handleToggle(entry.id, enabled)}
                                  disabled={updatePermission.isPending}
                                  aria-label={`${perm.label} for ${tier.label}`}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                {enabled ? (
                                  <Badge variant="default" className="text-[10px] h-5 px-1.5">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Enabled
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Audit History */}
      {isSupervisor && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Permission Change History
              </CardTitle>
              <CardDescription>Audit trail of all permission modifications</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !auditLog || auditLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No permission changes recorded yet</p>
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Changed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {format(new Date(entry.changed_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono">
                              {entry.permission_key}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">
                            {entry.tier.replace('_', ' ')}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">
                              {entry.previous_value ? (
                                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Enabled → Disabled</Badge>
                              ) : (
                                <Badge className="text-[10px] h-5 px-1.5 bg-primary">Disabled → Enabled</Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{entry.admin_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function PermissionsManagementPage() {
  return (
    <FeatureErrorBoundary featureName="Permissions Management">
      <PermissionsContent />
    </FeatureErrorBoundary>
  );
}
