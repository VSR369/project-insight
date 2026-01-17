import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload } from "lucide-react";
import { ReviewerInviteForm } from "./ReviewerInviteForm";
import { ExistingPanelMembersTable } from "./ExistingPanelMembersTable";

export function InvitePanelMembersTab() {
  const [showForm, setShowForm] = useState(true);

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
        <ExistingPanelMembersTable
          onEdit={(reviewer) => {
            // TODO: Implement edit mode
            console.log("Edit reviewer:", reviewer.id);
          }}
        />
      </div>
    </div>
  );
}
