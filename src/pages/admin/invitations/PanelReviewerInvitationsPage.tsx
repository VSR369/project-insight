import { AdminLayout } from "@/components/admin/AdminLayout";
import { InvitePanelMembersTab } from "@/pages/admin/interview-requirements";

export function PanelReviewerInvitationsPage() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Invitations" },
    { label: "Panel Reviewers" },
  ];

  return (
    <AdminLayout
      title="Panel Reviewer Invitations"
      description="Invite and manage review panel members"
      breadcrumbs={breadcrumbs}
    >
      <InvitePanelMembersTab />
    </AdminLayout>
  );
}
