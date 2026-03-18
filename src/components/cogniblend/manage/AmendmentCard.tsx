/**
 * AmendmentCard — Card 3 on the Challenge Management page.
 *
 * Displays amendment history with expandable detail panels and "Initiate Amendment" button (ID role only).
 */

import { useState } from 'react';
import { PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAmendmentHistory } from '@/hooks/cogniblend/useAmendments';
import { InitiateAmendmentModal } from '@/components/cogniblend/manage/InitiateAmendmentModal';
import { AmendmentDetailPanel } from '@/components/cogniblend/manage/AmendmentDetailPanel';

/* ─── Types ──────────────────────────────────────────────── */

interface AmendmentCardProps {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  canInitiate: boolean;
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

          {/* Amendment history */}
          {isLoading ? (
            <p className="text-xs text-muted-foreground italic py-2">Loading amendments…</p>
          ) : amendments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No amendments have been made to this challenge.
            </p>
          ) : (
            <>
              <Separator />
              <div className="space-y-2">
                {amendments.map((a) => (
                  <AmendmentDetailPanel
                    key={a.id}
                    amendmentId={a.id}
                    challengeId={challengeId}
                    amendmentNumber={a.amendmentNumber}
                    status={a.status}
                    scopeOfChange={a.scopeOfChange}
                    reason={a.reason}
                    isMaterial={a.isMaterial}
                    createdAt={a.createdAt}
                    withdrawalDeadline={a.withdrawalDeadline}
                    canEdit={canInitiate}
                  />
                ))}
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
