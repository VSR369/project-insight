import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { ReviewerInviteForm } from "./ReviewerInviteForm";
import { ReviewerEditForm } from "./ReviewerEditForm";
import { ExistingPanelMembersTable } from "./ExistingPanelMembersTable";
import { PanelReviewer } from "@/hooks/queries/usePanelReviewers";

export function InvitePanelMembersTab() {
  const [showForm, setShowForm] = useState(true);
  const [editingReviewer, setEditingReviewer] = useState<PanelReviewer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = (reviewer: PanelReviewer) => {
    setEditingReviewer(reviewer);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingReviewer(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invite Review Panel Members</h2>
          <p className="text-sm text-muted-foreground">
            Invitation-only onboarding. Keep information minimal and respectful.
          </p>
        </div>
        <Button variant="outline" disabled>
          <Upload className="mr-2 h-4 w-4" />
          Bulk Invite
        </Button>
      </div>

      {/* Invite Form */}
      {showForm && (
        <>
          <ReviewerInviteForm
            onSuccess={() => {
              // Optionally hide form or show success state
            }}
            onCancel={() => setShowForm(false)}
          />
          <Separator />
        </>
      )}

      {/* Existing Panel Members */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">Existing Panel Members</h3>
        <ExistingPanelMembersTable onEdit={handleEdit} />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Panel Reviewer</DialogTitle>
            <DialogDescription>
              Update reviewer coverage and preferences for {editingReviewer?.name}
            </DialogDescription>
          </DialogHeader>
          <ReviewerEditForm
            reviewer={editingReviewer}
            onSuccess={handleEditClose}
            onCancel={handleEditClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
