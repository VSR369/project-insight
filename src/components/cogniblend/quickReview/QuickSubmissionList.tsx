/**
 * QuickSubmissionList — Left-side list of submissions for QuickReviewPage.
 * Pure presentational; no data calls.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { QuickSubmission } from '@/hooks/cogniblend/useQuickReview';

interface QuickSubmissionListProps {
  submissions: QuickSubmission[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_VARIANT: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACCEPTED: { label: 'Accepted', variant: 'default' },
  DECLINED: { label: 'Declined', variant: 'destructive' },
  PENDING: { label: 'Pending', variant: 'secondary' },
  SUBMITTED: { label: 'Pending', variant: 'secondary' },
};

export function QuickSubmissionList({ submissions, selectedId, onSelect }: QuickSubmissionListProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Submissions</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[480px]">
          <ul className="space-y-1.5 pr-2">
            {submissions.map((s) => {
              const isActive = s.id === selectedId;
              const meta = STATUS_VARIANT[s.status?.toUpperCase()] ?? STATUS_VARIANT.PENDING;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      'w-full text-left rounded-md border p-3 transition-colors',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{s.submitterName}</p>
                      <Badge variant={meta.variant} className="shrink-0 text-[10px]">{meta.label}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(s.submittedAt).toLocaleString()}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
