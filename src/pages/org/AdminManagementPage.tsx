/**
 * AdminManagementPage — Delegated Admin Management Console
 * PRIMARY admin can view, create, edit, and deactivate delegated admins.
 * Uses DomainScopeDisplay for resolved scope names (Gap 11).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrgContext } from '@/contexts/OrgContext';
import { useDelegatedAdmins, useMaxDelegatedAdmins, useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit, UserMinus, Users, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DeactivateAdminDialog } from '@/components/org/DeactivateAdminDialog';
import { DomainScopeDisplay } from '@/components/org/DomainScopeDisplay';
import type { DelegatedAdmin } from '@/hooks/queries/useDelegatedAdmins';

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending_activation: { label: 'Pending Activation', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  deactivated: { label: 'Deactivated', variant: 'secondary' },
};

export default function AdminManagementPage() {
  const navigate = useNavigate();
  const { organizationId, orgName } = useOrgContext();
  const { data: admins, isLoading } = useDelegatedAdmins(organizationId);
  const { data: maxAdmins = 5 } = useMaxDelegatedAdmins();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);

  const [search, setSearch] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<DelegatedAdmin | null>(null);

  const filteredAdmins = (admins ?? []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.full_name?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q)
    );
  });

  const activeCount = (admins ?? []).filter((a) => a.status !== 'deactivated').length;
  const canAdd = activeCount < maxAdmins;

  return (
    <div className="space-y-6">
      {/* Context Banner */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        <span>{currentAdmin?.full_name ?? 'Admin'}</span>
        <span className="text-muted-foreground/50">|</span>
        <span>Organisation: {orgName}</span>
        <span className="text-muted-foreground/50">|</span>
        <Badge variant="outline" className="text-xs">Primary</Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Delegated Admins
              </CardTitle>
              <CardDescription>
                {activeCount} of {maxAdmins} delegated admin slots used
              </CardDescription>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full lg:w-64"
                />
              </div>
              <Button
                onClick={() => navigate('/org/admin-management/create')}
                disabled={!canAdd}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                <span className="hidden lg:inline">Add Delegated Admin</span>
                <span className="lg:hidden">Add</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No delegated admins yet</p>
              <p className="text-xs mt-1">Add delegated admins to help manage your organization</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => {
                    const style = STATUS_STYLES[admin.status] ?? STATUS_STYLES.deactivated;
                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.full_name ?? '—'}</TableCell>
                        <TableCell className="font-mono text-sm">{admin.email ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={style.variant}>{style.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <DomainScopeDisplay scope={admin.domain_scope} compact />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {new Date(admin.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {admin.status !== 'deactivated' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/org/admin-management/${admin.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeactivateTarget(admin)}
                                >
                                  <UserMinus className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeactivateAdminDialog
        admin={deactivateTarget}
        organizationId={organizationId}
        onClose={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
