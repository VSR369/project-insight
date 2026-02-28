import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useSeekerOrgDetail, useApproveOrg } from '@/hooks/queries/useSeekerOrgApprovals';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { OrgDetailCard } from './OrgDetailCard';
import { ContactDetailCard } from './ContactDetailCard';
import { ComplianceDetailCard } from './ComplianceDetailCard';
import { SubscriptionDetailCard } from './SubscriptionDetailCard';
import { DocumentReviewCard } from './DocumentReviewCard';
import { AdminCredentialsCard } from './AdminCredentialsCard';
import { RejectOrgDialog } from './RejectOrgDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function SeekerOrgReviewContent() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSeekerOrgDetail(orgId);
  const approveOrg = useApproveOrg();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.org) {
    return <div className="text-center py-12 text-muted-foreground">Organization not found.</div>;
  }

  const { org, contacts, compliance, subscription, billing, documents, industries, geographies, orgUsers } = data;
  const isVerified = org.verification_status === 'verified';
  const isRejected = org.verification_status === 'rejected';
  const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-org-approvals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader title={org.organization_name} description={`Verification Status: ${org.verification_status}`} />
        </div>
        {!isVerified && !isRejected && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
            <Button
              onClick={() => setApproveConfirmOpen(true)}
              disabled={approveOrg.isPending}
              title={billing?.billing_verification_status !== 'verified' ? 'Billing payment has not been verified yet' : undefined}
            >
              {approveOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Approve Organization
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <OrgDetailCard org={org} industries={industries} geographies={geographies} />
        <ContactDetailCard contact={primaryContact} allContacts={contacts} />
        {compliance && <ComplianceDetailCard compliance={compliance} org={org} />}
        <SubscriptionDetailCard subscription={subscription} billing={billing} />
        <DocumentReviewCard documents={documents} />
        <AdminCredentialsCard orgUsers={orgUsers} org={org} contacts={contacts} />
      </div>

      <RejectOrgDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        orgId={orgId!}
      />

      <AlertDialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              {billing?.billing_verification_status !== 'verified' && (
                <span className="block mb-2 font-medium text-amber-600">⚠ Billing payment has not been verified yet.</span>
              )}
              This will verify "{org.organization_name}" and allow them to access the platform. This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                approveOrg.mutate(orgId!);
                setApproveConfirmOpen(false);
              }}
            >
              Confirm Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SeekerOrgReviewPage() {
  return (
    <FeatureErrorBoundary featureName="Seeker Organization Review">
      <SeekerOrgReviewContent />
    </FeatureErrorBoundary>
  );
}
