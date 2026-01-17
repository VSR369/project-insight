import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react";

import { 
  usePanelReviewers, 
  useDeactivatePanelReviewer,
  useRestorePanelReviewer,
  useSendReviewerInvitation,
  PanelReviewer,
} from "@/hooks/queries/usePanelReviewers";
import { useExpertiseLevels } from "@/hooks/queries/useExpertiseLevels";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { MasterDataViewDialog } from "@/components/admin/MasterDataViewDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

// Status badge colors
const STATUS_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  PENDING: "outline",
  SENT: "default",
  ACCEPTED: "default",
  EXPIRED: "destructive",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
};

interface ExistingPanelMembersTableProps {
  onEdit?: (reviewer: PanelReviewer) => void;
}

export function ExistingPanelMembersTable({ onEdit }: ExistingPanelMembersTableProps) {
  const [search, setSearch] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState<PanelReviewer | null>(null);

  const { data: reviewers, isLoading } = usePanelReviewers({ includeInactive: true });
  const { data: levels } = useExpertiseLevels(false);
  const { data: industries } = useIndustrySegments(false);
  
  const deactivate = useDeactivatePanelReviewer();
  const restore = useRestorePanelReviewer();
  const resendInvitation = useSendReviewerInvitation();

  // Create lookup maps
  const levelMap = useMemo(() => {
    const map = new Map<string, string>();
    levels?.forEach(l => map.set(l.id, `L${l.level_number}`));
    return map;
  }, [levels]);

  const industryMap = useMemo(() => {
    const map = new Map<string, string>();
    industries?.forEach(i => map.set(i.id, i.name));
    return map;
  }, [industries]);

  // Filter reviewers by search
  const filteredReviewers = useMemo(() => {
    if (!reviewers) return [];
    if (!search.trim()) return reviewers;

    const searchLower = search.toLowerCase();
    return reviewers.filter(r =>
      r.name.toLowerCase().includes(searchLower) ||
      r.email.toLowerCase().includes(searchLower) ||
      r.industry_segment_ids.some(id => 
        industryMap.get(id)?.toLowerCase().includes(searchLower)
      )
    );
  }, [reviewers, search, industryMap]);

  // View dialog fields
  const viewFields = selectedReviewer ? [
    { label: "Name", value: selectedReviewer.name },
    { label: "Email", value: selectedReviewer.email },
    { label: "Phone", value: selectedReviewer.phone || "-" },
    { label: "Status", value: selectedReviewer.is_active ? "Active" : "Inactive", type: "badge" as const },
    { label: "Invitation Status", value: INVITATION_STATUS_LABELS[selectedReviewer.invitation_status || "DRAFT"] },
    { label: "Industries", value: selectedReviewer.industry_segment_ids.map(id => industryMap.get(id)).filter(Boolean).join(", ") || "-" },
    { label: "Expertise Levels", value: selectedReviewer.expertise_level_ids.map(id => levelMap.get(id)).filter(Boolean).join(", ") || "-" },
    { label: "Timezone", value: selectedReviewer.timezone || "Asia/Calcutta" },
    { label: "Languages", value: (selectedReviewer.languages as string[])?.join(", ") || "-" },
    { label: "Max Interviews/Day", value: selectedReviewer.max_interviews_per_day?.toString() || "4" },
    { label: "Years Experience", value: selectedReviewer.years_experience?.toString() || "-" },
    { label: "Notes", value: selectedReviewer.notes || "-" },
    { label: "Created", value: selectedReviewer.created_at ? format(new Date(selectedReviewer.created_at), "PPp") : "-" },
    { label: "Last Invitation Sent", value: selectedReviewer.invitation_sent_at ? format(new Date(selectedReviewer.invitation_sent_at), "PPp") : "-" },
  ] : [];

  const handleResendInvitation = async (reviewer: PanelReviewer) => {
    await resendInvitation.mutateAsync({
      reviewer_id: reviewer.id,
      channel: (reviewer.invitation_channel as "email" | "sms" | "both") || "email",
      message: reviewer.invitation_message || undefined,
      expiry_days: 14,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">
          {filteredReviewers.length} reviewer{filteredReviewers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Industry Segment</TableHead>
              <TableHead>Levels</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invitation</TableHead>
              <TableHead>Last Sent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReviewers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search ? "No reviewers match your search" : "No panel members yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredReviewers.map((reviewer) => (
                <TableRow key={reviewer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reviewer.name}</div>
                      <div className="text-xs text-muted-foreground">{reviewer.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {reviewer.industry_segment_ids.slice(0, 1).map(id => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {industryMap.get(id) || "Unknown"}
                      </Badge>
                    ))}
                    {reviewer.industry_segment_ids.length > 1 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        +{reviewer.industry_segment_ids.length - 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {reviewer.expertise_level_ids.map(id => (
                        <Badge key={id} variant="secondary" className="text-xs">
                          {levelMap.get(id) || "?"}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={reviewer.is_active ? "default" : "secondary"}>
                      {reviewer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANTS[reviewer.invitation_status || "DRAFT"]}>
                      {INVITATION_STATUS_LABELS[reviewer.invitation_status || "DRAFT"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reviewer.invitation_sent_at
                      ? format(new Date(reviewer.invitation_sent_at), "PP")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedReviewer(reviewer);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(reviewer)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Coverage
                        </DropdownMenuItem>
                        {(reviewer.invitation_status === "SENT" || reviewer.invitation_status === "EXPIRED") && (
                          <DropdownMenuItem
                            onClick={() => handleResendInvitation(reviewer)}
                            disabled={resendInvitation.isPending}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Resend Invitation
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {reviewer.is_active ? (
                          <DropdownMenuItem
                            onClick={() => deactivate.mutate(reviewer.id)}
                            disabled={deactivate.isPending}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => restore.mutate(reviewer.id)}
                            disabled={restore.isPending}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedReviewer(reviewer);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <MasterDataViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        title="Panel Reviewer Details"
        fields={viewFields}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Panel Reviewer"
        description={`Are you sure you want to delete ${selectedReviewer?.name}? This will also remove their associated auth user account.`}
        onConfirm={async () => {
          // For now, just deactivate (soft delete)
          if (selectedReviewer) {
            await deactivate.mutateAsync(selectedReviewer.id);
          }
          setDeleteDialogOpen(false);
          setSelectedReviewer(null);
        }}
      />
    </div>
  );
}
