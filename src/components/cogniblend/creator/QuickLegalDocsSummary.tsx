/**
 * QuickLegalDocsSummary — Pre-submit read-only card showing
 * which platform legal templates will be auto-applied for QUICK mode.
 */

import { FileCheck, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuickLegalDocsSummaryProps {
  engagementModel: string;
}

const MP_LEGAL_DOCS = [
  { code: 'PMA', label: 'Platform Membership Agreement' },
  { code: 'CA', label: 'Confidentiality Agreement' },
  { code: 'PSA', label: 'Professional Services Agreement' },
  { code: 'IPAA', label: 'IP Assignment Agreement' },
  { code: 'DPA', label: 'Data Protection Addendum' },
];

const AGG_LEGAL_DOCS = [
  { code: 'PMA', label: 'Platform Membership Agreement' },
  { code: 'CA', label: 'Confidentiality Agreement' },
  { code: 'PSA', label: 'Professional Services Agreement' },
];

export function QuickLegalDocsSummary({ engagementModel }: QuickLegalDocsSummaryProps) {
  const docs = engagementModel === 'AGG' ? AGG_LEGAL_DOCS : MP_LEGAL_DOCS;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">Legal Templates (Auto-Applied)</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Standard platform agreements will be auto-applied on submission. These are non-negotiable for Express mode.
      </p>

      <ul className="space-y-1.5">
        {docs.map((doc) => (
          <li key={doc.code} className="flex items-center gap-2">
            <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs text-foreground">{doc.label}</span>
            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-300 bg-emerald-50">
              Auto-accepted
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
