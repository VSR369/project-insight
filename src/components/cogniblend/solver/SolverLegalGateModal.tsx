/**
 * SolverLegalGateModal — Phase-triggered Tier 2 legal acceptance modal.
 * Presents each pending legal document sequentially using ScrollToAcceptLegal.
 * Blocks solution progression until all docs are accepted.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollToAcceptLegal } from '@/components/cogniblend/solver/ScrollToAcceptLegal';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { useAuth } from '@/hooks/useAuth';
import { FileText, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import type { PendingLegalDoc } from '@/hooks/cogniblend/useSolverLegalGate';

/* ─── Types ──────────────────────────────────────────────── */

interface SolverLegalGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  pendingDocs: PendingLegalDoc[];
  /** Called when all docs are accepted */
  onAllAccepted: () => void;
}

/* ─── Placeholder template content ───────────────────────── */

function getPlaceholderContent(doc: PendingLegalDoc): string {
  return `${doc.document_name}\n\n${doc.description ?? 'This document contains the terms and conditions for this phase of the challenge lifecycle.'}\n\n---\n\nBy accepting this document, you agree to the terms outlined above as they pertain to your participation in this challenge.\n\nThis is a legally binding agreement. Please read carefully before accepting.\n\n[Template Version: Standard]\n[Tier: 2 — Solution Phase]\n[Trigger Phase: ${doc.trigger_phase}]`;
}

/* ─── Component ──────────────────────────────────────────── */

export function SolverLegalGateModal({
  open,
  onOpenChange,
  challengeId,
  pendingDocs,
  onAllAccepted,
}: SolverLegalGateModalProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [scrollConfirmed, setScrollConfirmed] = useState(false);

  const recordAcceptance = useRecordLegalAcceptance();

  const currentDoc = pendingDocs[currentIndex];
  const isLast = currentIndex === pendingDocs.length - 1;
  const progress = pendingDocs.length > 0 ? currentIndex + 1 : 0;

  const handleAcceptCurrent = async () => {
    if (!currentDoc || !user?.id) return;

    await recordAcceptance.mutateAsync({
      challengeId,
      userId: user.id,
      documentType: currentDoc.document_type,
      documentName: currentDoc.document_name,
      tier: 'TIER_2',
      phaseTriggered: currentDoc.trigger_phase,
      scrollConfirmed,
    });

    if (isLast) {
      onAllAccepted();
      onOpenChange(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setAccepted(false);
      setScrollConfirmed(false);
    }
  };

  if (!currentDoc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base">Legal Acceptance Required</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The following legal document must be accepted before you can proceed with this phase.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          {/* Progress indicator */}
          {pendingDocs.length > 1 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                Document {progress} of {pendingDocs.length}
              </Badge>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(progress / pendingDocs.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Document header */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">{currentDoc.document_name}</p>
              {currentDoc.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{currentDoc.description}</p>
              )}
              <Badge variant="secondary" className="text-[10px] mt-1.5">
                Phase {currentDoc.trigger_phase} • Tier 2
              </Badge>
            </div>
          </div>

          {/* ScrollToAcceptLegal */}
          <ScrollToAcceptLegal
            documentContent={getPlaceholderContent(currentDoc)}
            accepted={accepted}
            onAcceptedChange={setAccepted}
            onScrollConfirmed={setScrollConfirmed}
            acceptLabel={`I have read and agree to the ${currentDoc.document_name}.`}
            maxHeight={280}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="mr-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAcceptCurrent}
            disabled={!accepted || recordAcceptance.isPending}
          >
            {recordAcceptance.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : isLast ? (
              <ShieldCheck className="h-4 w-4 mr-1.5" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1.5" />
            )}
            {isLast ? 'Accept & Proceed' : 'Accept & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
