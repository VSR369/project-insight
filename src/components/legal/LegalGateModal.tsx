/**
 * LegalGateModal — Shows pending legal documents for a trigger event.
 * Sequentially presents each document with scroll tracking + checkbox gate.
 */
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLegalGate } from '@/hooks/legal/useLegalGate';
import { useLegalAcceptanceLog } from '@/hooks/legal/useLegalAcceptance';
import { LegalDocumentViewer } from './LegalDocumentViewer';
import { LegalGateActions } from './LegalGateActions';
import { useLegalDocTemplateById } from '@/hooks/queries/useLegalDocumentTemplates';
import type { PendingLegalDocument, TriggerEvent } from '@/types/legal.types';

interface LegalGateModalProps {
  triggerEvent: TriggerEvent | string;
  challengeId?: string;
  userRole?: string;
  governanceMode?: string;
  onAllAccepted: () => void;
  onDeclined: () => void;
}

export function LegalGateModal({
  triggerEvent, challengeId, userRole = 'ALL',
  governanceMode = 'ALL', onAllAccepted, onDeclined,
}: LegalGateModalProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [isChecked, setIsChecked] = React.useState(false);

  const { data: gateResult, isLoading } = useLegalGate({
    triggerEvent, challengeId, userRole, governanceMode,
  });
  const acceptMutation = useLegalAcceptanceLog();

  const pending = gateResult?.pending_documents ?? [];
  const currentDoc: PendingLegalDocument | undefined = pending[currentIndex];

  const { data: fullTemplate } = useLegalDocTemplateById(currentDoc?.template_id);

  // Auto-pass if gate is open
  React.useEffect(() => {
    if (gateResult?.gate_open) onAllAccepted();
  }, [gateResult?.gate_open, onAllAccepted]);

  // Reset state when moving to next doc
  React.useEffect(() => {
    setScrollProgress(0);
    setIsChecked(false);
  }, [currentIndex]);

  if (isLoading) {
    return (
      <Dialog open>
        <DialogContent className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!currentDoc || gateResult?.gate_open) return null;

  const htmlContent = fullTemplate?.content ?? fullTemplate?.template_content ?? '';

  const handleAction = async (action: 'ACCEPTED' | 'DECLINED') => {
    if (!user?.id || !currentDoc) return;
    await acceptMutation.mutateAsync({
      userId: user.id,
      templateId: currentDoc.template_id,
      documentCode: currentDoc.document_code,
      documentSection: currentDoc.document_section,
      documentVersion: currentDoc.document_version,
      challengeId: challengeId ?? null,
      triggerEvent,
      action,
    });
    if (action === 'DECLINED') { onDeclined(); return; }
    if (currentIndex + 1 < pending.length) setCurrentIndex(currentIndex + 1);
    else onAllAccepted();
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[90vw] w-full max-h-[90vh] h-[90vh] flex flex-col overflow-hidden p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{currentDoc.document_code}</Badge>
            <DialogTitle className="text-lg">{currentDoc.document_name}</DialogTitle>
            <Badge variant="outline">v{currentDoc.document_version}</Badge>
            {pending.length > 1 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {currentIndex + 1} of {pending.length}
              </span>
            )}
          </div>
          {currentDoc.summary && (
            <p className="text-sm text-muted-foreground mt-1">{currentDoc.summary}</p>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 px-6">
          <LegalDocumentViewer
            content={htmlContent}
            onScrollProgress={setScrollProgress}
            className="h-full"
          />
        </div>

        <div className="px-6 pb-6 shrink-0">
          <LegalGateActions
            scrollProgress={scrollProgress}
            isChecked={isChecked}
            onCheckedChange={setIsChecked}
            onAccept={() => handleAction('ACCEPTED')}
            onDecline={() => handleAction('DECLINED')}
            isSubmitting={acceptMutation.isPending}
            documentName={currentDoc.document_name}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
