/**
 * CuratorPackReviewPanel — CONTROLLED-path panel shown to the Curator
 * after both LC and FC complete review (status='pending_curator_review').
 *
 * The Curator can either Forward the pack to the Creator (or auto-publish
 * for AGG opt-out) or Return it to LC/FC via the existing unfreeze flow.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Rocket, Loader2 } from 'lucide-react';
import { LegalDocsSummaryCard } from './LegalDocsSummaryCard';
import { EscrowStatusCard } from './EscrowStatusCard';
import { useCuratorForwardPack } from '@/hooks/cogniblend/useCuratorForwardPack';
import { LcReturnToCurator } from '@/components/cogniblend/lc/LcReturnToCurator';

interface CuratorPackReviewPanelProps {
  challengeId: string;
  userId: string;
  operatingModel: string | null;
  governanceMode: string;
  creatorApprovalStatus: string | null;
  extendedBrief: unknown;
}

export function CuratorPackReviewPanel({
  challengeId,
  userId,
  operatingModel,
  governanceMode,
  creatorApprovalStatus,
  extendedBrief,
}: CuratorPackReviewPanelProps) {
  const [notes, setNotes] = useState('');
  const forwardMut = useCuratorForwardPack(challengeId);

  const creatorRequired = useMemo(() => {
    const eb = typeof extendedBrief === 'string'
      ? (() => { try { return JSON.parse(extendedBrief); } catch { return {}; } })()
      : (extendedBrief as Record<string, unknown>) ?? {};
    return eb?.creator_approval_required === true;
  }, [extendedBrief]);

  // Visibility: CONTROLLED + pending_curator_review only
  if (governanceMode !== 'CONTROLLED' || creatorApprovalStatus !== 'pending_curator_review') {
    return null;
  }

  const buttonLabel = creatorRequired ? 'Forward Pack to Creator' : 'Forward & Auto-Publish';
  const ButtonIcon = creatorRequired ? Send : Rocket;

  const handleForward = () => {
    forwardMut.mutate({ userId, notes: notes.trim() || undefined });
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Pack Ready for Your Review
          <Badge variant="outline" className="ml-auto text-xs">
            {operatingModel} · {governanceMode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Both Legal and Financial reviews are complete. Review the attached documents and
          escrow details below, then forward the pack
          {creatorRequired
            ? ' to the Creator for final approval.'
            : ' — Creator approval is not required, the challenge will be published immediately.'}
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          <LegalDocsSummaryCard challengeId={challengeId} />
          <EscrowStatusCard challengeId={challengeId} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="curator-pack-notes">
            Curator notes (optional)
          </label>
          <Textarea
            id="curator-pack-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={creatorRequired
              ? 'Add a note for the Creator about this pack…'
              : 'Add a note for the audit trail…'}
            className="min-h-[80px]"
          />
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:justify-between">
          <LcReturnToCurator
            challengeId={challengeId}
            userId={userId}
            disabled={forwardMut.isPending}
          />
          <Button
            onClick={handleForward}
            disabled={forwardMut.isPending}
            size="default"
          >
            {forwardMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ButtonIcon className="h-4 w-4 mr-2" />
            )}
            {buttonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
