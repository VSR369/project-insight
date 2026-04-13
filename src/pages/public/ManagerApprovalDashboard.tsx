/**
 * ManagerApprovalDashboard — Manager approval page.
 * Uses useManagerDecision hook (R2 compliance). Split into sub-components.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Building2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useManagerDecision } from '@/hooks/queries/useManagerApproval';
import { ManagerDeclineDialog } from '@/components/public/ManagerDeclineDialog';
import { ManagerProviderDetails } from '@/components/public/ManagerProviderDetails';

interface ManagerSessionData {
  orgId: string;
  orgName: string;
  providerName: string;
  providerEmail: string;
  providerDesignation?: string;
  managerName: string;
  requestDate: string;
  approvalToken: string;
}

export default function ManagerApprovalDashboard() {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<ManagerSessionData | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'decline' | null>(null);
  const managerDecision = useManagerDecision();

  useEffect(() => {
    const stored = sessionStorage.getItem('managerSession');
    if (!stored) { navigate('/manager-portal'); return; }
    setSessionData(JSON.parse(stored));
  }, [navigate]);

  const handleDecision = async (action: 'approve' | 'decline', reason?: string) => {
    if (!sessionData) return;
    try {
      await managerDecision.mutateAsync({
        orgId: sessionData.orgId,
        approvalToken: sessionData.approvalToken,
        decision: action,
        declineReason: reason,
      });
      setDecision(action);
      setIsComplete(true);
      setDeclineDialogOpen(false);
      sessionStorage.removeItem('managerSession');
      toast.success(action === 'approve' ? 'Request approved!' : 'Request declined');
    } catch {
      // Error handled by mutation hook
    }
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    const isApproved = decision === 'approve';
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${isApproved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {isApproved ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
            </div>
            <h2 className="text-xl font-semibold mb-2">{isApproved ? 'Request Approved!' : 'Request Declined'}</h2>
            <p className="text-muted-foreground">
              You have {isApproved ? 'approved' : 'declined'} {sessionData.providerName}'s request to represent {sessionData.orgName}.
            </p>
            <p className="text-sm text-muted-foreground mt-4">You can close this window now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">CogniBlend</h1>
              <p className="text-sm text-muted-foreground">Manager Portal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { sessionStorage.removeItem('managerSession'); navigate('/manager-portal'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Participation Request</CardTitle>
            <CardDescription>
              {sessionData.providerName} is requesting to join CogniBlend as a solution provider representing your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ManagerProviderDetails sessionData={sessionData} />
            <div className="flex items-center justify-between py-3 border-t border-b">
              <span className="text-sm text-muted-foreground">Current Status</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Approval</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleDecision('approve')} disabled={managerDecision.isPending}>
                {managerDecision.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => setDeclineDialogOpen(true)} disabled={managerDecision.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Decline
              </Button>
            </div>
          </CardContent>
        </Card>

        <ManagerDeclineDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          providerName={sessionData.providerName}
          isProcessing={managerDecision.isPending}
          onDecline={(reason) => handleDecision('decline', reason)}
        />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Logged in as {sessionData.managerName}
        </p>
      </div>
    </div>
  );
}
