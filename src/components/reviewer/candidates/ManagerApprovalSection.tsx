import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CandidateDetail } from "@/hooks/queries/useCandidateDetail";

interface ManagerApprovalSectionProps {
  candidate: CandidateDetail;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  badgeClass: string;
  icon: React.ReactNode;
  message: string;
  alertVariant: 'default' | 'destructive';
  alertClass: string;
}> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-4 w-4" />,
    message: "A validation request has been sent to the manager's email. The provider's affiliation will be confirmed once the manager approves.",
    alertVariant: 'default',
    alertClass: "bg-amber-50 border-amber-200 text-amber-800",
  },
  approved: {
    label: "Validated",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-4 w-4" />,
    message: "Manager has approved this provider's organizational affiliation.",
    alertVariant: 'default',
    alertClass: "bg-green-50 border-green-200 text-green-800",
  },
  declined: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="h-4 w-4" />,
    message: "Manager has declined this provider's participation request.",
    alertVariant: 'destructive',
    alertClass: "bg-red-50 border-red-200 text-red-800",
  },
  withdrawn: {
    label: "Withdrawn",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    icon: <AlertTriangle className="h-4 w-4" />,
    message: "The approval request was withdrawn by the provider.",
    alertVariant: 'default',
    alertClass: "bg-gray-50 border-gray-200 text-gray-800",
  },
};

export function ManagerApprovalSection({ candidate }: ManagerApprovalSectionProps) {
  // Only render for ORG_REP mode
  const isOrgRep = candidate.participationModeCode?.toUpperCase() === "ORG_REP";
  
  if (!isOrgRep) {
    return null;
  }

  const status = candidate.orgApprovalStatus?.toLowerCase() || 'pending';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Manager Approval Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <dt className="text-sm font-medium text-muted-foreground">Approval Status</dt>
          <dd>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1.5 w-fit px-3 py-1 ${config.badgeClass}`}
            >
              {config.icon}
              {config.label}
            </Badge>
          </dd>
        </div>

        <Alert className={config.alertClass}>
          <AlertDescription className="flex items-start gap-2">
            {status === 'pending' && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            {status === 'approved' && <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
            {status === 'declined' && <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
            {status === 'withdrawn' && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{config.message}</span>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
