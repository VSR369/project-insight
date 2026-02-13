import { InvitePanelMembersTab } from "@/pages/admin/interview-requirements";

export function PanelReviewerInvitationsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Panel Reviewer Invitations</h1>
        <p className="text-muted-foreground mt-1">Invite and manage review panel members</p>
      </div>
      <InvitePanelMembersTab />
    </>
  );
}
