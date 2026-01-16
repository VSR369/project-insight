import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Building2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  User, 
  Mail, 
  Briefcase,
  Calendar,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('managerSession');
    if (!stored) {
      navigate('/manager-portal');
      return;
    }
    setSessionData(JSON.parse(stored));
  }, [navigate]);

  const handleDecision = async (action: 'approve' | 'decline') => {
    if (!sessionData) return;

    setIsProcessing(true);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('process-manager-decision', {
        body: {
          orgId: sessionData.orgId,
          approvalToken: sessionData.approvalToken,
          decision: action,
          declineReason: action === 'decline' ? declineReason : undefined,
        },
      });

      if (fnError || !result?.success) {
        toast.error(result?.error || fnError?.message || 'Failed to process decision');
        return;
      }

      setDecision(action);
      setIsComplete(true);
      setDeclineDialogOpen(false);

      // Clear session data
      sessionStorage.removeItem('managerSession');

      toast.success(action === 'approve' ? 'Request approved!' : 'Request declined');

    } catch (err: any) {
      console.error('Decision error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('managerSession');
    navigate('/manager-portal');
  };

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Completion screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            {decision === 'approve' ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Request Approved!</h2>
                <p className="text-muted-foreground">
                  You have approved {sessionData.providerName}'s request to represent {sessionData.orgName} on CogniBlend.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Request Declined</h2>
                <p className="text-muted-foreground">
                  You have declined {sessionData.providerName}'s request to represent {sessionData.orgName}.
                </p>
              </>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              You can close this window now.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Review Participation Request
            </CardTitle>
            <CardDescription>
              {sessionData.providerName} is requesting to join CogniBlend as a solution provider representing your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Provider Name</p>
                  <p className="font-medium">{sessionData.providerName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Provider Email</p>
                  <p className="font-medium">{sessionData.providerEmail}</p>
                </div>
              </div>

              {sessionData.providerDesignation && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Designation</p>
                    <p className="font-medium">{sessionData.providerDesignation}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Organization</p>
                  <p className="font-medium">{sessionData.orgName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Request Date</p>
                  <p className="font-medium">
                    {format(new Date(sessionData.requestDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between py-3 border-t border-b">
              <span className="text-sm text-muted-foreground">Current Status</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Pending Approval
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700" 
                onClick={() => handleDecision('approve')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => setDeclineDialogOpen(true)}
                disabled={isProcessing}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Decline Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to decline {sessionData.providerName}'s request? 
                You can optionally provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="declineReason">Reason (Optional)</Label>
              <Textarea
                id="declineReason"
                placeholder="e.g., Not authorized to represent this organization"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeclineDialogOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDecision('decline')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm Decline
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Logged in as {sessionData.managerName}
        </p>
      </div>
    </div>
  );
}
