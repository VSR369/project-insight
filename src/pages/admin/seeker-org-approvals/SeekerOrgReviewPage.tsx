import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle, Info, FileCheck, CreditCard, ShieldCheck, Mail, RotateCcw, Ban, Clock } from 'lucide-react';
import { useSeekerOrgDetail, useApproveOrg, useStartVerification } from '@/hooks/queries/useSeekerOrgApprovals';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { OrgDetailCard } from './OrgDetailCard';
import { ContactDetailCard } from './ContactDetailCard';
import { ComplianceDetailCard } from './ComplianceDetailCard';
import { SubscriptionDetailCard } from './SubscriptionDetailCard';
import { DocumentReviewCard } from './DocumentReviewCard';
import { AdminCredentialsCard } from './AdminCredentialsCard';
import { VerificationChecklist } from './VerificationChecklist';
import { RejectOrgDialog } from './RejectOrgDialog';
import { ReturnForCorrectionDialog } from './ReturnForCorrectionDialog';
import { SuspendOrgDialog } from './SuspendOrgDialog';
import { ReinstateOrgDialog } from './ReinstateOrgDialog';
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
import { formatDistanceToNow } from 'date-fns';

function SeekerOrgReviewContent() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useSeekerOrgDetail(orgId);
  const approveOrg = useApproveOrg();
  const startVerification = useStartVerification();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const autoTransitioned = useRef(false);

  // Auto-transition: payment_submitted → under_verification when admin opens
  useEffect(() => {
    if (data?.org && data.org.verification_status === 'payment_submitted' && !autoTransitioned.current && orgId) {
      autoTransitioned.current = true;
      startVerification.mutate(orgId);
    }
  }, [data?.org?.verification_status, orgId]);

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

  const { org, contacts, compliance, subscription, billing, documents, industries, geographies, orgUsers, adminDelegation } = data;
  const status = org.verification_status;
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isActive = status === 'active';
  const isSuspended = status === 'suspended';
  const isUnderVerification = status === 'under_verification' || status === 'payment_submitted';
  const isReturned = status === 'returned_for_correction';
  const primaryContact = contacts.find((c) => c.is_primary) ?? contacts[0];

  // ── Verification gate checks ──
  const totalDocs = documents.length;
  const verifiedDocs = documents.filter((d) => d.verification_status === 'verified').length;
  const allDocsVerified = totalDocs === 0 || verifiedDocs === totalDocs;
  const billingVerified = billing?.billing_verification_status === 'verified';
  const canApprove = allDocsVerified && billingVerified;
  const canReturn = (org.correction_count ?? 0) < 2;

  const unmetReasons: string[] = [];
  if (!allDocsVerified) unmetReasons.push(`${verifiedDocs} of ${totalDocs} documents verified`);
  if (!billingVerified) unmetReasons.push('Billing payment not verified');

  // SLA elapsed time
  const slaElapsed = org.verification_started_at
    ? formatDistanceToNow(new Date(org.verification_started_at), { addSuffix: false })
    : null;
  const slaStarted = org.verification_started_at ? new Date(org.verification_started_at) : null;
  const slaWarning = slaStarted ? (Date.now() - slaStarted.getTime()) > 3 * 24 * 60 * 60 * 1000 : false;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-org-approvals')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <PageHeader title={org.organization_name} description={`Verification Status: ${org.verification_status}`} />
        </div>

        {/* SLA Indicator */}
        {slaElapsed && isUnderVerification && (
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${slaWarning ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-muted text-muted-foreground'}`}>
            <Clock className="h-3.5 w-3.5" />
            {slaElapsed} in review
          </div>
        )}

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {/* Approve/Reject/Return — for under_verification or returned_for_correction */}
          {(isUnderVerification || isReturned) && (
            <>
              <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              {canReturn && (
                <Button variant="outline" onClick={() => setReturnOpen(true)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Return
                </Button>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        onClick={() => setApproveConfirmOpen(true)}
                        disabled={!canApprove || approveOrg.isPending}
                      >
                        {approveOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canApprove && (
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium mb-1">Prerequisites not met:</p>
                      <ul className="list-disc pl-4 text-xs space-y-0.5">
                        {unmetReasons.map((r) => <li key={r}>{r}</li>)}
                      </ul>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Suspend — for verified/active orgs */}
          {(isVerified || isActive) && (
            <Button variant="outline" className="text-destructive" onClick={() => setSuspendOpen(true)}>
              <Ban className="h-4 w-4 mr-1" /> Suspend
            </Button>
          )}

          {/* Reinstate — for suspended orgs */}
          {isSuspended && (
            <Button variant="outline" onClick={() => setReinstateOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-1" /> Reinstate
            </Button>
          )}
        </div>
      </div>

      {/* Suspension info */}
      {isSuspended && org.suspension_reason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6">
          <div className="flex items-start gap-2">
            <Ban className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-foreground">Organization Suspended</h3>
              <p className="text-sm text-muted-foreground mt-1">{org.suspension_reason}</p>
              {org.suspended_at && (
                <p className="text-xs text-muted-foreground mt-1">Suspended {formatDistanceToNow(new Date(org.suspended_at), { addSuffix: true })}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Correction info */}
      {isReturned && org.correction_instructions && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 mb-6">
          <div className="flex items-start gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-foreground">Returned for Correction (Cycle {org.correction_count}/2)</h3>
              <p className="text-sm text-muted-foreground mt-1">{org.correction_instructions}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Workflow Instructions ── */}
      {(isUnderVerification || isReturned) && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 mb-6">
          <div className="flex items-start gap-2 mb-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-foreground">Approval Workflow — Follow These Steps in Order</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                All steps must be completed before the organization can be approved and granted platform access.
              </p>
            </div>
          </div>
          <ol className="space-y-2.5 ml-1">
            <li className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${allDocsVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>1</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Verify All Uploaded Documents</span>
                  {allDocsVerified ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <span className="text-xs text-amber-600 font-medium">({verifiedDocs}/{totalDocs} done)</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Review each document and click Approve or Reject individually.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${billingVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>2</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Verify Billing Payment</span>
                  {billingVerified ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Click Verify Payment and enter Bank Transaction ID, Bank Name, and Payment Received Date.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${canApprove ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>3</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Approve the Organization</span>
                  {canApprove && <span className="text-xs text-primary font-medium">Ready</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Once steps 1 & 2 are complete, the Approve button will be enabled.</p>
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">4</span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Send Welcome Email</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">After approval, scroll to Admin Credentials and send welcome email(s).</p>
              </div>
            </li>
          </ol>
        </div>
      )}

      <div className="grid gap-6">
        <VerificationChecklist
          org={org}
          billing={billing}
          documents={documents}
          adminDelegation={adminDelegation}
          subscription={subscription}
          contacts={contacts}
        />
        <OrgDetailCard org={org} industries={industries} geographies={geographies} />
        <ContactDetailCard contact={primaryContact} allContacts={contacts} />
        {compliance && <ComplianceDetailCard compliance={compliance} org={org} />}
        <SubscriptionDetailCard subscription={subscription} billing={billing} />
        <DocumentReviewCard documents={documents} />
        <AdminCredentialsCard orgUsers={orgUsers} org={org} contacts={contacts} adminDelegation={adminDelegation} />
      </div>

      <RejectOrgDialog open={rejectOpen} onOpenChange={setRejectOpen} orgId={orgId!} />
      <ReturnForCorrectionDialog open={returnOpen} onOpenChange={setReturnOpen} orgId={orgId!} correctionCount={org.correction_count ?? 0} />
      <SuspendOrgDialog open={suspendOpen} onOpenChange={setSuspendOpen} orgId={orgId!} />
      <ReinstateOrgDialog open={reinstateOpen} onOpenChange={setReinstateOpen} orgId={orgId!} />

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
            <AlertDialogAction onClick={() => { approveOrg.mutate(orgId!); setApproveConfirmOpen(false); }}>
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
