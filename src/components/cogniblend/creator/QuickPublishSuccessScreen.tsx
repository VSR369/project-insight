/**
 * QuickPublishSuccessScreen — Post-submit confirmation for QUICK mode.
 * Shows published status, routing summary (Sent to / Visibility / Cadence),
 * and a CTA to the new Quick review workspace.
 */

import { CheckCircle2, FileCheck, Users, Eye, Clock, Plus, LayoutDashboard, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SOLVER_AUDIENCE_LABELS,
  VISIBILITY_LABELS,
  ENGAGEMENT_LABELS,
  NOTIFICATION_CADENCE_COPY,
  type SolverAudience,
  type EngagementCode,
} from '@/constants/solverRouting.constants';

interface QuickPublishSuccessScreenProps {
  challengeId: string;
  challengeTitle: string;
  engagementModel: string;
  solverAudience?: SolverAudience;
  visibility?: string | null;
}

const LEGAL_DOCS_APPLIED = [
  'Platform Membership Agreement',
  'Confidentiality Agreement',
  'Professional Services Agreement',
  'Challenge Participation Agreement',
];

function normalizeEngagement(model: string): EngagementCode {
  const upper = (model ?? '').toUpperCase();
  return upper === 'AGG' || upper === 'AGGREGATOR' ? 'AGG' : 'MP';
}

interface SummaryRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function SummaryRow({ icon: Icon, label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export function QuickPublishSuccessScreen({
  challengeId,
  challengeTitle,
  engagementModel,
  solverAudience = 'ALL',
  visibility,
}: QuickPublishSuccessScreenProps) {
  const navigate = useNavigate();
  const engagement = normalizeEngagement(engagementModel);
  const visibilityKey = (visibility ?? 'PUBLIC').toUpperCase();
  const audienceLabel = SOLVER_AUDIENCE_LABELS[engagement][solverAudience];
  const visibilityLabel = VISIBILITY_LABELS[visibilityKey] ?? VISIBILITY_LABELS.PUBLIC;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 max-w-lg mx-auto">
      {/* Success header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Challenge Published &amp; Live</h1>
        <p className="text-base text-foreground font-medium">{challengeTitle}</p>
        <Badge variant="outline" className="border-border bg-muted text-foreground">
          {ENGAGEMENT_LABELS[engagement]}
        </Badge>
      </div>

      {/* Routing summary */}
      <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Routing summary</p>
        <SummaryRow icon={Users} label="Sent to" value={audienceLabel} />
        <SummaryRow icon={Eye} label="Visibility" value={visibilityLabel} />
        <SummaryRow
          icon={Clock}
          label="Cadence"
          value={`${NOTIFICATION_CADENCE_COPY.certified} ${NOTIFICATION_CADENCE_COPY.standard}`}
        />
      </div>

      {/* Legal docs applied */}
      <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Legal Templates Applied</p>
        <ul className="space-y-1">
          {LEGAL_DOCS_APPLIED.map((doc) => (
            <li key={doc} className="flex items-center gap-2 text-xs text-foreground">
              <FileCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{doc}</span>
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 border-border bg-muted text-foreground">
                Auto-accepted
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Button className="w-full sm:w-auto" onClick={() => navigate(`/cogni/q/${challengeId}/review`)}>
          <Inbox className="h-4 w-4 mr-1.5" />Open challenge workspace
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/cogni/challenges/create')}>
          <Plus className="h-4 w-4 mr-1.5" />Create another
        </Button>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate('/cogni/dashboard')}>
          <LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard
        </Button>
      </div>
    </div>
  );
}
