import { format } from 'date-fns';
import { Clock, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SolutionStatusBadge } from '@/components/cogniblend/SolutionStatusBadge';
import type { SolutionDisplayStatus } from '@/constants/solutionStatus.constants';
import type { ManagedSubmission } from '@/hooks/cogniblend/useManageChallenge';
import { useDeadlineCountdown } from '@/hooks/cogniblend/useDeadlineCountdown';

const SUBMISSION_STATUS_MAP: Record<string, SolutionDisplayStatus> = {
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  under_review: 'UNDER_SCREENING',
  under_screening: 'UNDER_SCREENING',
  shortlisted: 'SHORTLISTED',
  accepted: 'SELECTED',
  rejected: 'REJECTED',
  withdrawn: 'WITHDRAWN',
};

interface ManageSubmissionsCardProps {
  submissions: ManagedSubmission[];
  submissionCount: number;
  submissionDeadline: string | null;
  governanceProfile: string;
  canExtendDeadline: boolean;
  onExtend: () => void;
}

export function ManageSubmissionsCard({
  submissions,
  submissionCount,
  submissionDeadline,
  governanceProfile,
  canExtendDeadline,
  onExtend,
}: ManageSubmissionsCardProps) {
  const countdown = useDeadlineCountdown(submissionDeadline);
  const isBlind = governanceProfile !== 'QUICK';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <Users className="h-5 w-5 text-primary" /> Submissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-6">
          <div>
            <span className="text-3xl lg:text-4xl font-extrabold text-foreground">{submissionCount}</span>
            <span className="ml-2 text-sm text-muted-foreground">abstracts received</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{countdown}</span>
          </div>
        </div>
        {canExtendDeadline && (
          <Button variant="outline" size="sm" className="min-h-11" onClick={onExtend}>
            Extend deadlines
          </Button>
        )}
        <Separator />
        {submissions.length === 0 ? (
          <p className="py-2 text-xs italic text-muted-foreground">
            No submissions yet. Solution Providers can submit until the deadline.
          </p>
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full text-left text-xs lg:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 font-semibold text-muted-foreground">Solution Provider</th>
                  <th className="pb-2 pr-4 font-semibold text-muted-foreground">Date</th>
                  <th className="pb-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const statusKey = submission.status.toLowerCase().replace(/\s+/g, '_');
                  const status = SUBMISSION_STATUS_MAP[statusKey] ?? 'DRAFT';
                  return (
                    <tr key={submission.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium text-foreground">
                        <span className="flex items-center gap-1.5">
                          {isBlind && <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />}
                          {submission.solverLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {format(new Date(submission.submittedAt), 'dd MMM yyyy')}
                      </td>
                      <td className="py-2">
                        <SolutionStatusBadge currentPhase={null} phaseStatus={null} overrideStatus={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {isBlind && submissions.length > 0 && (
          <p className="flex items-center gap-1 text-[10px] italic text-muted-foreground">
            <ShieldCheck className="h-3 w-3" /> Solution Provider identities anonymised until evaluation phase.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
