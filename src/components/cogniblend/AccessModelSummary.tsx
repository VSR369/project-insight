/**
 * AccessModelSummary — Reusable card showing the 3-tier access model.
 * Used in the wizard (Step 4) and on the published challenge view.
 */

import { Eye, UserPlus, FileText, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AccessModelSummaryProps {
  visibility: string;
  enrollment: string;
  submission: string;
  /** Legacy eligibility field — shown as fallback if enrollment/submission are empty */
  eligibility?: string;
  className?: string;
}

const VIS_LABELS: Record<string, string> = {
  public: 'Public — Everyone',
  registered_users: 'Registered Users',
  platform_members: 'Platform Members',
  curated_experts: 'Curated Experts',
  invited_only: 'Invited Only',
};

const ENR_LABELS: Record<string, string> = {
  open_auto: 'Open Enrollment (auto-approved)',
  curator_approved: 'Curator-Approved',
  direct_nda: 'Direct Registration (NDA)',
  org_curated: 'Organization-Curated',
  invitation_only: 'Invitation Only',
};

const SUB_LABELS: Record<string, string> = {
  all_enrolled: 'All Enrolled Participants',
  shortlisted_only: 'Shortlisted Only',
  invited_solvers: 'Invited Solvers Only',
};

export function AccessModelSummary({ visibility, enrollment, submission, className }: AccessModelSummaryProps) {
  const visLabel = VIS_LABELS[visibility] || visibility;
  const enrLabel = ENR_LABELS[enrollment] || enrollment;
  const subLabel = SUB_LABELS[submission] || submission;

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 space-y-3',
      className,
    )}>
      <p className="text-sm font-bold text-foreground">Access Model Summary</p>
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-start gap-2">
          <Eye className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            <span className="text-muted-foreground">Visible to </span>
            <Badge variant="secondary" className="text-[11px] ml-1">{visLabel}</Badge>
          </span>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" />
        </div>
        <div className="flex items-start gap-2">
          <UserPlus className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            <span className="text-muted-foreground">Enrollment via </span>
            <Badge variant="secondary" className="text-[11px] ml-1">{enrLabel}</Badge>
          </span>
        </div>
        <div className="flex items-center justify-center">
          <ChevronRight className="h-3 w-3 text-muted-foreground rotate-90" />
        </div>
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            <span className="text-muted-foreground">Submission allowed for </span>
            <Badge variant="secondary" className="text-[11px] ml-1">{subLabel}</Badge>
          </span>
        </div>
      </div>
    </div>
  );
}
