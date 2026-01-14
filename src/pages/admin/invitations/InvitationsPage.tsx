import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Crown,
  User,
} from "lucide-react";

import { AdminLayout } from "@/components/admin";
import { DataTable, DataTableColumn, DataTableAction } from "@/components/admin/DataTable";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useInvitations,
  useCreateInvitation,
  useResendInvitation,
  useDeleteInvitation,
  useInvitationStats,
  getInvitationStatus,
  Invitation,
  InvitationStatus,
} from "@/hooks/queries/useInvitations";

import { InvitationForm } from "./InvitationForm";

// Status badge component
function StatusBadge({ status }: { status: InvitationStatus }) {
  const config = {
    pending: { label: "Pending", variant: "secondary" as const, icon: Clock },
    accepted: { label: "Accepted", variant: "default" as const, icon: CheckCircle2 },
    declined: { label: "Declined", variant: "destructive" as const, icon: XCircle },
    expired: { label: "Expired", variant: "outline" as const, icon: AlertCircle },
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// Type badge component
function TypeBadge({ type }: { type: "standard" | "vip_expert" }) {
  if (type === "vip_expert") {
    return (
      <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
        <Crown className="h-3 w-3" />
        VIP Expert
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <User className="h-3 w-3" />
      Standard
    </Badge>
  );
}

export function InvitationsPage() {
  const [activeTab, setActiveTab] = React.useState<"all" | InvitationStatus>("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingInvitation, setDeletingInvitation] = React.useState<Invitation | null>(null);

  // Queries
  const { data: allInvitations = [], isLoading } = useInvitations();
  const { data: stats } = useInvitationStats();

  // Mutations
  const createMutation = useCreateInvitation();
  const resendMutation = useResendInvitation();
  const deleteMutation = useDeleteInvitation();

  // Filter invitations based on active tab
  const filteredInvitations = React.useMemo(() => {
    if (activeTab === "all") return allInvitations;
    return allInvitations.filter((inv) => getInvitationStatus(inv) === activeTab);
  }, [allInvitations, activeTab]);

  // Table columns
  const columns: DataTableColumn<Invitation>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: (_value, row) => (
        <div>
          <p className="font-medium">{row.email}</p>
          {(row.first_name || row.last_name) && (
            <p className="text-sm text-muted-foreground">
              {[row.first_name, row.last_name].filter(Boolean).join(" ")}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "invitation_type",
      header: "Type",
      cell: (_value, row) => <TypeBadge type={row.invitation_type} />,
    },
    {
      accessorKey: "industry_segment_id",
      header: "Industry",
      cell: (_value, row) => {
        // The joined data comes as a separate property from the select
        const rowWithJoin = row as Invitation & { industry_segments?: { name: string } | null };
        const segment = rowWithJoin.industry_segments;
        return segment?.name ? (
          <Badge variant="outline">{segment.name}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Sent",
      cell: (_value, row) => (
        <div className="text-sm">
          <p>{format(new Date(row.created_at), "MMM d, yyyy")}</p>
          <p className="text-muted-foreground">
            {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "expires_at",
      header: "Expires",
      cell: (_value, row) => {
        const status = getInvitationStatus(row);
        if (status === "accepted" || status === "declined") {
          return <span className="text-muted-foreground">—</span>;
        }
        const expiresAt = new Date(row.expires_at);
        const isExpired = expiresAt < new Date();
        return (
          <div className="text-sm">
            <p className={isExpired ? "text-destructive" : ""}>
              {format(expiresAt, "MMM d, yyyy")}
            </p>
            <p className={isExpired ? "text-destructive" : "text-muted-foreground"}>
              {formatDistanceToNow(expiresAt, { addSuffix: true })}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "accepted_at",
      header: "Status",
      cell: (_value, row) => <StatusBadge status={getInvitationStatus(row)} />,
    },
  ];

  // Table actions
  const actions: DataTableAction<Invitation>[] = [
    {
      label: "Resend Invitation",
      onClick: (invitation) => resendMutation.mutate(invitation.id),
      icon: <RefreshCw className="h-4 w-4" />,
      show: (invitation) => {
        const status = getInvitationStatus(invitation);
        return status === "pending" || status === "expired";
      },
    },
    {
      label: "Delete",
      onClick: (invitation) => {
        setDeletingInvitation(invitation);
        setDeleteOpen(true);
      },
      icon: <Trash2 className="h-4 w-4" />,
      variant: "destructive",
    },
  ];

  // Handle form submission
  const handleCreateInvitation = async (data: {
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    invitation_type: "standard" | "vip_expert";
    industry_segment_id?: string | null;
    message?: string | null;
  }) => {
    await createMutation.mutateAsync(data);
  };

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Invitations" },
  ];

  return (
    <AdminLayout
      title="Solution Provider Invitations"
      description="Manage invitations sent to potential solution providers"
      breadcrumbs={breadcrumbs}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </CardDescription>
            <CardTitle className="text-2xl text-amber-600">{stats?.pending || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Accepted
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats?.accepted || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Declined
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats?.declined || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Expired
            </CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats?.expired || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Invitations</CardTitle>
          </div>
          <CardDescription>
            View and manage all invitations sent to potential solution providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <DataTable
                data={filteredInvitations}
                columns={columns}
                actions={actions}
                searchPlaceholder="Search by email..."
                searchKey="email"
                isLoading={isLoading}
                onAdd={() => setFormOpen(true)}
                addButtonLabel="Send Invitation"
                emptyMessage={
                  activeTab === "all"
                    ? "No invitations have been sent yet."
                    : `No ${activeTab} invitations.`
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invitation Form */}
      <InvitationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateInvitation}
        isLoading={createMutation.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Invitation"
        itemName={deletingInvitation?.email}
        description={`Are you sure you want to delete the invitation for "${deletingInvitation?.email}"? This action cannot be undone.`}
        onConfirm={async () => {
          if (deletingInvitation) {
            await deleteMutation.mutateAsync(deletingInvitation.id);
          }
        }}
        isLoading={deleteMutation.isPending}
        isSoftDelete={false}
      />
    </AdminLayout>
  );
}
