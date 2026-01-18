import { useState } from "react";
import { AdminLayout } from "@/components/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingReviewers, useReviewerApprovalHistory } from "@/hooks/queries/usePanelReviewers";
import { PendingReviewerCard } from "./PendingReviewerCard";
import { ApprovalHistoryTable } from "./ApprovalHistoryTable";

export function ReviewerApprovalsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  
  const { data: pendingReviewers, isLoading: pendingLoading } = usePendingReviewers();
  const { data: approvedReviewers, isLoading: approvedLoading } = useReviewerApprovalHistory("approved");
  const { data: rejectedReviewers, isLoading: rejectedLoading } = useReviewerApprovalHistory("rejected");

  const pendingCount = pendingReviewers?.length || 0;
  const approvedCount = approvedReviewers?.length || 0;
  const rejectedCount = rejectedReviewers?.length || 0;

  return (
    <AdminLayout
      title="Reviewer Approvals"
      description="Review and approve/reject self-signup reviewer applications"
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Reviewer Approvals" },
      ]}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            Approved
            {approvedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                {approvedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            Rejected
            {rejectedCount > 0 && (
              <Badge variant="outline" className="ml-1 h-5 min-w-5 px-1">
                {rejectedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : pendingCount === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No pending applications</p>
              <p className="text-sm text-muted-foreground mt-1">
                New reviewer self-signup applications will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReviewers?.map((reviewer) => (
                <PendingReviewerCard key={reviewer.id} reviewer={reviewer} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : approvedCount === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No approved applications yet</p>
            </div>
          ) : (
            <ApprovalHistoryTable reviewers={approvedReviewers || []} type="approved" />
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rejectedCount === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No rejected applications</p>
            </div>
          ) : (
            <ApprovalHistoryTable reviewers={rejectedReviewers || []} type="rejected" />
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
