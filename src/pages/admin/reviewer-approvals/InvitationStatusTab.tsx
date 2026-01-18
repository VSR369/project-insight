import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvitedReviewers, useInvitationStats } from "@/hooks/queries/usePanelReviewers";
import { useSendReviewerInvitation, useCancelReviewerInvitation, useDeletePanelReviewer } from "@/hooks/queries/usePanelReviewers";
import { format } from "date-fns";
import { Search, MoreHorizontal, Send, RefreshCw, XCircle, Trash2, Eye } from "lucide-react";
import { DeleteReviewerDialog } from "@/pages/admin/interview-requirements/DeleteReviewerDialog";
import { CancelInvitationDialog } from "@/pages/admin/interview-requirements/CancelInvitationDialog";
import type { PanelReviewer } from "@/hooks/queries/usePanelReviewers";

type InvitationStatusFilter = "all" | "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  SENT: { label: "Sent", variant: "secondary" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  DECLINED: { label: "Declined", variant: "destructive" },
  EXPIRED: { label: "Expired", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

export function InvitationStatusTab() {
  const [statusFilter, setStatusFilter] = useState<InvitationStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState<PanelReviewer | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: reviewers, isLoading } = useInvitedReviewers(
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: stats } = useInvitationStats();

  const sendInvitation = useSendReviewerInvitation();
  const cancelInvitation = useCancelReviewerInvitation();
  const deleteReviewer = useDeletePanelReviewer();

  // Filter by search
  const filteredReviewers = reviewers?.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSendInvitation = (reviewer: PanelReviewer) => {
    sendInvitation.mutate({
      reviewer_id: reviewer.id,
      channel: "email",
    });
  };

  const handleCancelClick = (reviewer: PanelReviewer) => {
    setSelectedReviewer(reviewer);
    setShowCancelDialog(true);
  };

  const handleDeleteClick = (reviewer: PanelReviewer) => {
    setSelectedReviewer(reviewer);
    setShowDeleteDialog(true);
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (selectedReviewer) {
      cancelInvitation.mutate({ reviewer_id: selectedReviewer.id, reason });
    }
    setShowCancelDialog(false);
    setSelectedReviewer(null);
  };

  const handleDeleteConfirm = async (reason?: string) => {
    if (selectedReviewer) {
      deleteReviewer.mutate({ reviewer_id: selectedReviewer.id, reason });
    }
    setShowDeleteDialog(false);
    setSelectedReviewer(null);
  };

  const getStatusBadge = (status: string | null) => {
    const config = STATUS_CONFIG[status || ""] || { label: status || "Unknown", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getActions = (reviewer: PanelReviewer) => {
    const status = reviewer.invitation_status;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "DRAFT" && (
            <>
              <DropdownMenuItem onClick={() => handleSendInvitation(reviewer)}>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(reviewer)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          {status === "SENT" && (
            <>
              <DropdownMenuItem onClick={() => handleSendInvitation(reviewer)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Invitation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCancelClick(reviewer)} className="text-destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Invitation
              </DropdownMenuItem>
            </>
          )}
          {status === "ACCEPTED" && (
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
          )}
          {status === "DECLINED" && (
            <>
              <DropdownMenuItem onClick={() => handleSendInvitation(reviewer)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-invite
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(reviewer)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          {status === "EXPIRED" && (
            <>
              <DropdownMenuItem onClick={() => handleSendInvitation(reviewer)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Invitation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteClick(reviewer)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          {status === "CANCELLED" && (
            <DropdownMenuItem onClick={() => handleDeleteClick(reviewer)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"] as InvitationStatusFilter[]).map((status) => {
            const count = status === "all" 
              ? stats?.totalInvited || 0
              : stats?.[status.toLowerCase() as keyof typeof stats] || 0;
            const isActive = statusFilter === status;
            
            return (
              <Button
                key={status}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="gap-1"
              >
                {status === "all" ? "All" : STATUS_CONFIG[status]?.label || status}
                <Badge variant={isActive ? "secondary" : "outline"} className="ml-1 h-5 min-w-5 px-1">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      {filteredReviewers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No invited reviewers found</p>
          {statusFilter !== "all" && (
            <p className="text-sm text-muted-foreground mt-1">
              Try changing the status filter
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Accepted At</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviewers.map((reviewer) => (
                <TableRow key={reviewer.id}>
                  <TableCell className="font-medium">{reviewer.name}</TableCell>
                  <TableCell>{reviewer.email}</TableCell>
                  <TableCell>{getStatusBadge(reviewer.invitation_status)}</TableCell>
                  <TableCell>
                    {reviewer.invitation_sent_at 
                      ? format(new Date(reviewer.invitation_sent_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {reviewer.invitation_accepted_at 
                      ? format(new Date(reviewer.invitation_accepted_at), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>{getActions(reviewer)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <CancelInvitationDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        reviewer={selectedReviewer}
        onConfirm={handleCancelConfirm}
        isLoading={cancelInvitation.isPending}
      />

      <DeleteReviewerDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        reviewer={selectedReviewer}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteReviewer.isPending}
      />
    </div>
  );
}
