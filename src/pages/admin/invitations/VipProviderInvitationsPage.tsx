/**
 * VIP Provider Invitations Page
 * 
 * Admin page for managing VIP expert provider invitations.
 * Filters the existing invitations infrastructure to show only vip_expert type.
 */

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import { DataTable, DataTableColumn, DataTableAction } from '@/components/admin/DataTable';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { MasterDataViewDialog, ViewField } from '@/components/admin/MasterDataViewDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useDeleteInvitation,
  getInvitationStatus,
  Invitation,
  InvitationStatus,
} from '@/hooks/queries/useInvitations';

import { InvitationForm } from '@/pages/admin/invitations/InvitationForm';

function StatusBadge({ status }: { status: InvitationStatus }) {
  const config = {
    pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
    accepted: { label: 'Accepted', variant: 'default' as const, icon: CheckCircle2 },
    declined: { label: 'Declined', variant: 'destructive' as const, icon: XCircle },
    expired: { label: 'Expired', variant: 'outline' as const, icon: AlertCircle },
  };
  const { label, variant, icon: Icon } = config[status];
  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function VipProviderInvitationsPage() {
  const [formOpen, setFormOpen] = React.useState(false);
  const [viewOpen, setViewOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedInvitation, setSelectedInvitation] = React.useState<Invitation | null>(null);
  const [deletingInvitation, setDeletingInvitation] = React.useState<Invitation | null>(null);

  const { data: allInvitations = [], isLoading } = useInvitations();
  const createMutation = useCreateInvitation();
  const resendMutation = useResendInvitation();
  const deleteMutation = useDeleteInvitation();

  const vipInvitations = React.useMemo(
    () => allInvitations.filter((inv) => inv.invitation_type === 'vip_expert'),
    [allInvitations]
  );

  const stats = React.useMemo(() => {
    const pending = vipInvitations.filter((i) => getInvitationStatus(i) === 'pending').length;
    const accepted = vipInvitations.filter((i) => getInvitationStatus(i) === 'accepted').length;
    return { total: vipInvitations.length, pending, accepted };
  }, [vipInvitations]);

  const columns: DataTableColumn<Invitation>[] = [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: (_value, row) => (
        <div>
          <p className="font-medium">{row.email}</p>
          {(row.first_name || row.last_name) && (
            <p className="text-sm text-muted-foreground">
              {[row.first_name, row.last_name].filter(Boolean).join(' ')}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Invited',
      cell: (value) => {
        const date = new Date(value as string);
        return (
          <div>
            <p className="text-sm">{format(date, 'MMM d, yyyy')}</p>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(date, { addSuffix: true })}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'accepted_at',
      header: 'Status',
      cell: (_value, row) => <StatusBadge status={getInvitationStatus(row)} />,
    },
  ];

  const actions: DataTableAction<Invitation>[] = [
    {
      label: 'View Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: (row) => {
        setSelectedInvitation(row);
        setViewOpen(true);
      },
    },
    {
      label: 'Resend Invitation',
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: (row) => resendMutation.mutate(row.id),
      hidden: (row) => getInvitationStatus(row) !== 'pending',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: (row) => {
        setDeletingInvitation(row);
        setDeleteOpen(true);
      },
      hidden: (row) => getInvitationStatus(row) === 'accepted',
    },
  ];

  const handleCreate = async (data: Record<string, unknown>) => {
    await createMutation.mutateAsync({
      ...(data as { email: string; first_name?: string; last_name?: string; industry_segment_id?: string; message?: string }),
      invitation_type: 'vip_expert',
    });
  };

  const viewFields: ViewField[] = selectedInvitation
    ? [
        { label: 'Email', value: selectedInvitation.email },
        { label: 'Name', value: [selectedInvitation.first_name, selectedInvitation.last_name].filter(Boolean).join(' ') || '—' },
        { label: 'Status', value: getInvitationStatus(selectedInvitation) },
        { label: 'Invited', value: format(new Date(selectedInvitation.created_at), 'PPpp') },
        { label: 'Accepted', value: selectedInvitation.accepted_at ? format(new Date(selectedInvitation.accepted_at), 'PPpp') : '—' },
        { label: 'Message', value: selectedInvitation.message || '—' },
      ]
    : [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          VIP Expert Invitations
        </h1>
        <p className="text-muted-foreground mt-1">
          Invite VIP experts who receive automatic Eminent (⭐⭐⭐) certification upon registration
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total VIP Invitations</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accepted</CardDescription>
            <CardTitle className="text-2xl">{stats.accepted}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setFormOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          Invite VIP Expert
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={vipInvitations}
            actions={actions}
            isLoading={isLoading}
            emptyMessage="No VIP expert invitations yet"
          />
        </CardContent>
      </Card>

      {/* Create Dialog — forces vip_expert type */}
      <InvitationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isPending}
        defaultType="vip_expert"
      />

      {/* View Dialog */}
      <MasterDataViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="VIP Invitation Details"
        fields={viewFields}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          if (deletingInvitation) {
            deleteMutation.mutate(deletingInvitation.id);
            setDeleteOpen(false);
            setDeletingInvitation(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
        title="Delete VIP Invitation"
        description={`Are you sure you want to delete the invitation for ${deletingInvitation?.email}?`}
      />
    </>
  );
}
