import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  // ── Verification gate checks ──
  const totalDocs = documents.length;
  const verifiedDocs = documents.filter((d) => d.verification_status === 'verified').length;
  const allDocsVerified = totalDocs === 0 || verifiedDocs === totalDocs;
  const billingVerified = billing?.billing_verification_status === 'verified';
  const canApprove = allDocsVerified && billingVerified;

  const unmetReasons: string[] = [];
  if (!allDocsVerified) {
    unmetReasons.push(`${verifiedDocs} of ${totalDocs} documents verified`);
  }
  if (!billingVerified) {
    unmetReasons.push('Billing payment not verified');
  }

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      onClick={() => setApproveConfirmOpen(true)}
                      disabled={!canApprove || approveOrg.isPending}
                    >
                      {approveOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Approve Organization
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canApprove && (
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-medium mb-1">Prerequisites not met:</p>
                    <ul className="list-disc pl-4 text-xs space-y-0.5">
                      {unmetReasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Approval prerequisites checklist */}
      {!isVerified && !isRejected && (
        <div className="flex flex-wrap gap-3 mb-6 text-sm">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${allDocsVerified ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {allDocsVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {totalDocs === 0 ? 'No documents uploaded' : `Documents: ${verifiedDocs}/${totalDocs} verified`}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border ${billingVerified ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {billingVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {billingVerified ? 'Billing verified' : 'Billing not verified'}
          </span>
        </div>
      )}

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
            <AlertDialogDescription asChild>
              <div>
                <div className="space-y-1 mb-3 text-sm">
                  <p className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> All {totalDocs} document(s) verified</p>
                  <p className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Billing payment verified</p>
                </div>
                <p>This will verify "{org.organization_name}" and allow them to access the platform. This action cannot be easily undone.</p>
              </div>
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
