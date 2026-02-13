import { useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  useAllReviewerSlots,
  useSlotLookupMaps,
  calculateSlotSummary,
  type SlotFilters,
  type AdminSlotWithReviewer,
} from "@/hooks/queries/useAdminReviewerSlots";
import { SlotFilters as SlotFiltersComponent } from "./SlotFilters";
import { SummaryCards } from "./SummaryCards";
import { AddSlotForReviewerDialog } from "./AddSlotForReviewerDialog";
import { ModifySlotDialog } from "./ModifySlotDialog";
import { DeleteSlotDialog } from "./DeleteSlotDialog";
import { CancelBookingDialog } from "./CancelBookingDialog";

const PAGE_SIZE = 15;

export default function ReviewerAvailabilityPage() {
  const [filters, setFilters] = useState<SlotFilters>({
    reviewerSearch: "",
    industrySegmentIds: [],
    expertiseLevelIds: [],
    dateFrom: null,
    dateTo: null,
    status: "all",
  });

  const [page, setPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [modifySlot, setModifySlot] = useState<AdminSlotWithReviewer | null>(null);
  const [deleteSlot, setDeleteSlot] = useState<AdminSlotWithReviewer | null>(null);
  const [cancelSlot, setCancelSlot] = useState<AdminSlotWithReviewer | null>(null);

  const { data: lookups, isLoading: loadingLookups } = useSlotLookupMaps();
  const { data: slots, isLoading: loadingSlots } = useAllReviewerSlots(filters);

  const summary = useMemo(() => calculateSlotSummary(slots), [slots]);

  const paginatedSlots = useMemo(() => {
    if (!slots) return [];
    const start = (page - 1) * PAGE_SIZE;
    return slots.slice(start, start + PAGE_SIZE);
  }, [slots, page]);

  const totalPages = slots ? Math.ceil(slots.length / PAGE_SIZE) : 1;

  const getIndustryNames = (ids: string[] | null) => {
    if (!ids || !lookups) return "-";
    const names = ids
      .map((id) => lookups.industryMap.get(id))
      .filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };

  const getLevelNames = (ids: string[] | null) => {
    if (!ids || !lookups) return "-";
    const names = ids
      .map((id) => lookups.levelMap.get(id))
      .filter(Boolean);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-100 text-green-800">Open</Badge>;
      case "booked":
        return <Badge className="bg-blue-100 text-blue-800">Booked</Badge>;
      case "held":
        return <Badge className="bg-yellow-100 text-yellow-800">Held</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  const handleAction = (slot: AdminSlotWithReviewer, action: "modify" | "delete" | "cancel") => {
    if (action === "modify") setModifySlot(slot);
    else if (action === "delete") setDeleteSlot(slot);
    else if (action === "cancel") setCancelSlot(slot);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reviewer Availability</h1>
            <p className="text-muted-foreground">
              Manage interview slots for all panel reviewers
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Slot for Reviewer
          </Button>
        </div>

        {/* Filters */}
        <SlotFiltersComponent
          filters={filters}
          onFiltersChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          industries={lookups?.industries || []}
          levels={lookups?.levels || []}
        />

        {/* Summary Cards */}
        <SummaryCards summary={summary} isLoading={loadingSlots} />

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Reviewer</TableHead>
                <TableHead>Industries</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSlots || loadingLookups ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedSlots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Calendar className="h-8 w-8" />
                      <p>No future slots found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddDialog(true)}
                      >
                        Add a slot
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSlots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{slot.reviewer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {slot.reviewer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger className="text-sm">
                          {getIndustryNames(slot.reviewer.industry_segment_ids)}
                        </TooltipTrigger>
                        <TooltipContent>
                          {slot.reviewer.industry_segment_ids
                            ?.map((id) => lookups?.industryMap.get(id))
                            .filter(Boolean)
                            .join(", ") || "None"}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger className="text-sm">
                          {getLevelNames(slot.reviewer.expertise_level_ids)}
                        </TooltipTrigger>
                        <TooltipContent>
                          {slot.reviewer.expertise_level_ids
                            ?.map((id) => lookups?.levelMap.get(id))
                            .filter(Boolean)
                            .join(", ") || "None"}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {format(new Date(slot.start_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(slot.start_at), "h:mm a")} -{" "}
                      {format(new Date(slot.end_at), "h:mm a")}
                    </TableCell>
                    <TableCell>{getStatusBadge(slot.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {slot.status === "open" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAction(slot, "modify")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modify time</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleAction(slot, "delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete slot</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        {(slot.status === "booked" || slot.status === "held") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => handleAction(slot, "cancel")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel booking</TooltipContent>
                          </Tooltip>
                        )}
                        {slot.status === "cancelled" && (
                          <span className="text-xs text-muted-foreground px-2">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, slots?.length || 0)} of{" "}
                {slots?.length || 0}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddSlotForReviewerDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
      <ModifySlotDialog
        open={!!modifySlot}
        onOpenChange={(open) => !open && setModifySlot(null)}
        slot={modifySlot}
      />
      <DeleteSlotDialog
        open={!!deleteSlot}
        onOpenChange={(open) => !open && setDeleteSlot(null)}
        slot={deleteSlot}
      />
      <CancelBookingDialog
        open={!!cancelSlot}
        onOpenChange={(open) => !open && setCancelSlot(null)}
        slot={cancelSlot}
      />
    </>
  );
}
