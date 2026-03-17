/**
 * AmendmentCard — Card 3 on the Challenge Management page.
 *
 * Displays amendment history table and "Initiate Amendment" button (ID role only).
 */

import { useState } from 'react';
import { PenLine, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAmendmentHistory, AmendmentRecord } from '@/hooks/cogniblend/useAmendments';
import { InitiateAmendmentModal } from '@/components/cogniblend/manage/InitiateAmendmentModal';
import { format } from 'date-fns';

/* ─── Types ──────────────────────────────────────────────── */

interface AmendmentCardProps {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  canInitiate: boolean;
}

/* ─── Status badge styles ────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  INITIATED: 'bg-[hsl(38,60%,92%)] text-[hsl(38,68%,35%)]',
  IMPLEMENTING: 'bg-[hsl(210,60%,95%)] text-[hsl(210,68%,40%)]',
  UNDER_REVIEW: 'bg-[hsl(270,40%,93%)] text-[hsl(270,50%,40%)]',
  APPROVED: 'bg-[hsl(155,40%,93%)] text-[hsl(155,68%,30%)]',
  REJECTED: 'bg-[hsl(1,50%,93%)] text-[hsl(1,60%,45%)]',
};

/* ─── Helpers ────────────────────────────────────────────── */

function parseScopeAreas(scopeOfChange: string | null): string {
  if (!scopeOfChange) return '—';
  try {
    const parsed = JSON.parse(scopeOfChange);
    if (Array.isArray(parsed?.areas)) return parsed.areas.join(', ');
  } catch {
    // plain text fallback
  }
  return scopeOfChange;
}

/* ─── Component ──────────────────────────────────────────── */

export function AmendmentCard({ challengeId, challengeTitle, userId, canInitiate }: AmendmentCardProps) {
  const { data: amendments = [], isLoading } = useAmendmentHistory(challengeId);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <PenLine className="h-4.5 w-4.5 text-[hsl(38,70%,50%)]" />
            Post-Publication Amendments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Initiate button */}
          {canInitiate && (
            <Button
              variant="outline"
              size="sm"
              className="border-[hsl(38,60%,55%)] text-[hsl(38,70%,40%)] hover:bg-[hsl(38,60%,96%)]"
              onClick={() => setModalOpen(true)}
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              Initiate Amendment
            </Button>
          )}

          {/* Amendment history table */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground italic py-2">Loading amendments…</p>
          ) : amendments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No amendments have been made to this challenge.
            </p>
          ) : (
            <>
              <Separator />
              <div className="relative w-full overflow-auto">
                <table className="w-full text-left text-xs lg:text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 pr-3 font-semibold text-muted-foreground">#</th>
                      <th className="pb-2 pr-3 font-semibold text-muted-foreground">Date</th>
                      <th className="pb-2 pr-3 font-semibold text-muted-foreground">Scope</th>
                      <th className="pb-2 pr-3 font-semibold text-muted-foreground">Status</th>
                      <th className="pb-2 font-semibold text-muted-foreground">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amendments.map((a) => {
                      const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.INITIATED;
                      return (
                        <tr key={a.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-3 font-medium text-foreground">
                            {a.amendmentNumber}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(a.createdAt), 'dd MMM yyyy')}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground max-w-[140px] truncate">
                            {parseScopeAreas(a.scopeOfChange)}
                            {a.isMaterial && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[hsl(38,70%,45%)]" title="Material change">
                                <AlertTriangle className="h-3 w-3" />
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] lg:text-xs font-medium ${style}`}>
                              {a.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground max-w-[180px] truncate">
                            {a.reason ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <InitiateAmendmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        challengeId={challengeId}
        challengeTitle={challengeTitle}
        userId={userId}
      />
    </>
  );
}
