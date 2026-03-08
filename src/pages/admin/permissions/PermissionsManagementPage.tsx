import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

interface Permission {
  label: string;
  admin: boolean;
  seniorAdmin: boolean;
  supervisor: boolean;
}

interface PermissionCategory {
  category: string;
  permissions: Permission[];
}

const PERMISSION_MATRIX: PermissionCategory[] = [
  {
    category: 'Verification',
    permissions: [
      { label: 'View Dashboard', admin: true, seniorAdmin: true, supervisor: true },
      { label: 'Claim from Queue', admin: true, seniorAdmin: true, supervisor: true },
      { label: 'Complete Verification', admin: true, seniorAdmin: true, supervisor: true },
      { label: 'Request Reassignment', admin: true, seniorAdmin: true, supervisor: true },
      { label: 'Release to Queue', admin: true, seniorAdmin: true, supervisor: true },
    ],
  },
  {
    category: 'Admin Management',
    permissions: [
      { label: 'View All Admins', admin: false, seniorAdmin: true, supervisor: true },
      { label: 'Create Admin', admin: false, seniorAdmin: true, supervisor: true },
      { label: 'Edit Admin Profile', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'Deactivate Admin', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'View My Profile', admin: true, seniorAdmin: true, supervisor: true },
    ],
  },
  {
    category: 'Supervisor Functions',
    permissions: [
      { label: 'Approve Reassignments', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'View Team Performance', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'Configure System', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'View Audit Logs', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'Bulk Reassignment', admin: false, seniorAdmin: false, supervisor: true },
      { label: 'Pin Queue Entries', admin: false, seniorAdmin: false, supervisor: true },
    ],
  },
];

const TIERS = [
  { key: 'admin' as const, label: 'Platform Admin' },
  { key: 'seniorAdmin' as const, label: 'Senior Admin' },
  { key: 'supervisor' as const, label: 'Supervisor' },
];

function StatusIcon({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <CheckCircle className="h-4 w-4 text-green-600" />
  ) : (
    <XCircle className="h-4 w-4 text-muted-foreground/40" />
  );
}

function PermissionsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permissions Management</h1>
        <p className="text-muted-foreground">
          Read-only reference of the fixed tier-based permission matrix.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Shield className="h-4 w-4 shrink-0" />
        <span>
          Permissions are enforced by the platform's fixed tier hierarchy and cannot be modified.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {TIERS.map((tier) => (
          <Card key={tier.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{tier.label}</CardTitle>
              <CardDescription>
                {tier.key === 'supervisor'
                  ? 'Full platform access and team oversight'
                  : tier.key === 'seniorAdmin'
                    ? 'Admin management and seeker configuration'
                    : 'Verification processing and basic functions'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PERMISSION_MATRIX.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {cat.category}
                  </p>
                  <div className="space-y-1.5">
                    {cat.permissions.map((perm) => (
                      <div key={perm.label} className="flex items-center justify-between text-sm">
                        <span className={perm[tier.key] ? '' : 'text-muted-foreground'}>
                          {perm.label}
                        </span>
                        <Badge
                          variant={perm[tier.key] ? 'default' : 'secondary'}
                          className="text-[10px] h-5 px-1.5"
                        >
                          {perm[tier.key] ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
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
