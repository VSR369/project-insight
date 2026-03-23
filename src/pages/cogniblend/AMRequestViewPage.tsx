/**
 * AMRequestViewPage — Role-aware challenge view/edit page.
 * AM/RQ → SimpleIntakeForm (same layout as "New Challenge" creation).
 * CA/CR → ConversationalIntakeContent (existing behavior).
 * Defaults to read-only "view" mode with toggle to "edit".
 * Route: /cogni/my-requests/:id/view
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Eye, Lock } from 'lucide-react';
import { ConversationalIntakeContent } from '@/pages/cogniblend/ConversationalIntakePage';
import { SimpleIntakeForm } from '@/components/cogniblend/SimpleIntakeForm';
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Phase → owner label mapping */
const PHASE_OWNER_LABELS: Record<number, string> = {
  1: 'Intake',
  2: 'Spec Review (CR/CA)',
  3: 'Curation (CU)',
  4: 'Approval (ID)',
  5: 'Active',
  6: 'Published',
};

function getPhaseOwnerLabel(phase: number): string {
  return PHASE_OWNER_LABELS[phase] ?? `Phase ${phase}`;
}

export default function AMRequestViewPage() {
  const { id } = useParams<{ id: string }>();
  const { activeRole } = useCogniRoleContext();
  const [pageMode, setPageMode] = useState<'view' | 'edit'>('view');

  const { data: challenge } = useChallengeDetail(id);
  const currentPhase = challenge?.current_phase ?? 1;

  const isAmRq = activeRole === 'AM' || activeRole === 'RQ';
  const isCaCr = activeRole === 'CA' || activeRole === 'CR';

  /** Phase-based edit permission */
  const editAllowed = useMemo(() => {
    if (isAmRq) return currentPhase <= 1;
    if (isCaCr) return currentPhase <= 2;
    return false;
  }, [isAmRq, isCaCr, currentPhase]);

  const effectiveMode = editAllowed ? pageMode : 'view';

  return (
    <div className="w-full max-w-[960px] px-6 pt-2 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CreationContextBar />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!editAllowed && currentPhase > 1 && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              <Lock className="h-3 w-3 mr-1" />
              With {getPhaseOwnerLabel(currentPhase)}
            </Badge>
          )}

          {editAllowed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageMode(pageMode === 'view' ? 'edit' : 'view')}
            >
              {pageMode === 'view' ? (
                <><Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit</>
              ) : (
                <><Eye className="h-3.5 w-3.5 mr-1.5" /> Back to View</>
              )}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" disabled>
                    <Lock className="h-3.5 w-3.5 mr-1.5" /> View Only
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This challenge is now with {getPhaseOwnerLabel(currentPhase)}. Editing is locked.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {isAmRq ? (
        <SimpleIntakeForm challengeId={id} mode={effectiveMode} />
      ) : (
        <ConversationalIntakeContent challengeId={id} mode={effectiveMode} hideSpecReview />
      )}
    </div>
  );
}
