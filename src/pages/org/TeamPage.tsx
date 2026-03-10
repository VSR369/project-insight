import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrgUsers, useInviteOrgUser, useUpdateOrgUserRole, useDeactivateOrgUser, useOrgRoles } from '@/hooks/queries/useTeamData';
import { useOrgSubscription } from '@/hooks/queries/useBillingData';
import { validateUserInvite } from '@/services/teamService';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentAdminTier } from '@/hooks/useCurrentAdminTier';

import { Users, UserPlus, Shield, Crown, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function TeamPage() {
  const { organizationId, tenantId } = useOrgContext();
  const { isPrimary, isDelegated, isLoading: tierLoading } = useCurrentAdminTier();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const { data: users, isLoading: usersLoading } = useOrgUsers(organizationId);
  const { data: roles } = useOrgRoles(tenantId);
  const { data: subscription } = useOrgSubscription(organizationId);
  const inviteMutation = useInviteOrgUser();
  const updateRoleMutation = useUpdateOrgUserRole();
  const deactivateMutation = useDeactivateOrgUser();

  const tierLimits = {
    maxUsers: subscription?.md_subscription_tiers?.max_users ?? null,
    maxChallenges: subscription?.md_subscription_tiers?.max_challenges ?? null,
    isEnterprise: subscription?.md_subscription_tiers?.is_enterprise ?? false,
  };

  const validation = validateUserInvite(users?.length ?? 0, tierLimits);

  const roleLabel = (role: string) => {
    switch (role) {
      case 'owner': return { label: 'Owner', variant: 'default' as const };
      case 'admin': return { label: 'Admin', variant: 'secondary' as const };
      case 'manager': return { label: 'Manager', variant: 'outline' as const };
      default: return { label: 'Member', variant: 'outline' as const };
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's team members and roles</p>
      </div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setInviteOpen(true)} disabled={!validation.canInvite}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Usage Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Team Usage</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-foreground">{users?.length ?? 0}</div>
            <div className="text-muted-foreground">
              / {tierLimits.maxUsers ?? '∞'} members
            </div>
            {!validation.canInvite && validation.reason && (
              <Badge variant="destructive" className="ml-auto">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Limit Reached
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>All active team members in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !users?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No team members yet. Add your first member to get started.</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const { label, variant } = roleLabel(user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant={variant}>
                            {user.role === 'owner' && <Crown className="h-3 w-3 mr-1" />}
                            {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                            {label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.invitation_status === 'active' ? 'default' : 'secondary'}>
                            {user.invitation_status ?? 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(user.joined_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateMutation.mutate({ id: user.id, organizationId })}
                            >
                              Remove
                            </Button>
                          )}
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Invite a user to your organization</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                inviteMutation.mutate({
                  tenantId,
                  organizationId,
                  userId: inviteEmail,
                  role: inviteRole,
                });
                setInviteOpen(false);
                setInviteEmail('');
              }}
              disabled={!inviteEmail}
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
