/**
 * QuickPublishSuccessScreen — Post-submit confirmation for QUICK mode.
 * Shows published status, auto-applied legal docs, solver notification summary.
 */

import { CheckCircle2, FileCheck, Users, Plus, LayoutDashboard, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuickPublishSuccessScreenProps {
  challengeId: string;
  challengeTitle: string;
  engagementModel: string;
}

const LEGAL_DOCS_APPLIED = [
  'Platform Membership Agreement',
  'Confidentiality Agreement',
  'Professional Services Agreement',
];

export function QuickPublishSuccessScreen({
  challengeId,
  challengeTitle,
  engagementModel,
}: QuickPublishSuccessScreenProps) {
  const navigate = useNavigate();
  const isMarketplace = engagementModel === 'MP';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 max-w-lg mx-auto">
      {/* Success header */}
      <div className="text-center space-y-2">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold text-emerald-700">Challenge Published & Live</h1>
        <p className="text-base text-foreground font-medium">{challengeTitle}</p>
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
          {isMarketplace ? 'Marketplace' : 'Aggregator'}
        </Badge>
      </div>

      {/* Legal docs applied */}
      <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground">Legal Templates Applied</p>
        <ul className="space-y-1">
          {LEGAL_DOCS_APPLIED.map((doc) => (
            <li key={doc} className="flex items-center gap-2 text-xs text-foreground">
              <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{doc}</span>
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-300 bg-emerald-50">
                Auto-accepted
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Solver notification */}
      <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Solution Provider Notifications</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Registered Solution Providers have been notified. Certified Solution Providers receive immediate alerts; standard Solution Providers are notified with a 48-hour delay.
        </p>
        <p className="text-xs text-muted-foreground">
          {isMarketplace
            ? 'Marketplace mode — Solution Providers can contact you directly.'
            : 'Aggregator mode — platform manages all communication.'}
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Button className="w-full sm:w-auto" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
          <Eye className="h-4 w-4 mr-1.5" />View Published Challenge
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/cogni/challenges/create')}>
          <Plus className="h-4 w-4 mr-1.5" />Create Another
        </Button>
        <Button variant="ghost" className="w-full sm:w-auto" onClick={() => navigate('/cogni/dashboard')}>
          <LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard
        </Button>
      </div>
    </div>
  );
}
