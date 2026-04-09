/**
 * LegalReviewPanel — Freeze/assemble controls for curation right rail.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Lock, Unlock, FileText, Loader2, Scale } from 'lucide-react';
import {
  useFreezeForLegalReview,
  useUnfreezeForRecuration,
  useAssembleCpa,
} from '@/hooks/cogniblend/useFreezeActions';

interface LegalReviewPanelProps {
  challengeId: string;
  userId: string;
  lockStatus: string;
  governanceMode: string;
  currentPhase: number | null;
}

export function LegalReviewPanel({
  challengeId,
  userId,
  lockStatus,
  governanceMode,
  currentPhase,
}: LegalReviewPanelProps) {
  const freezeMut = useFreezeForLegalReview(challengeId);
  const unfreezeMut = useUnfreezeForRecuration(challengeId);
  const assembleMut = useAssembleCpa(challengeId);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const isQuick = governanceMode === 'QUICK';
  const canFreeze = lockStatus === 'OPEN' && currentPhase === 2;
  const isFrozen = lockStatus === 'FROZEN';

  const handleFreeze = () => {
    freezeMut.mutate(userId);
  };

  const handleAssemble = () => {
    assembleMut.mutate(userId);
  };

  const handleReturn = () => {
    if (returnReason.trim().length < 10) return;
    unfreezeMut.mutate(
      { userId, reason: returnReason.trim() },
      { onSuccess: () => { setShowReturnDialog(false); setReturnReason(''); } },
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Legal Review
            <Badge
              variant="outline"
              className={`ml-auto text-xs ${
                isFrozen
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {lockStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isQuick && lockStatus === 'OPEN' && (
            <p className="text-xs text-muted-foreground">
              Quick mode — legal freeze is optional. Submission proceeds directly.
            </p>
          )}

          {canFreeze && (
            <Button
              size="sm"
              className="w-full"
              onClick={handleFreeze}
              disabled={freezeMut.isPending}
            >
              {freezeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Lock className="h-4 w-4 mr-1.5" />
              )}
              Freeze for Legal Review
            </Button>
          )}

          {isFrozen && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleAssemble}
                disabled={assembleMut.isPending}
              >
                {assembleMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5" />
                )}
                Assemble CPA
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-amber-600"
                onClick={() => setShowReturnDialog(true)}
              >
                <Unlock className="h-4 w-4 mr-1.5" />
                Return to Curation
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Curation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for returning (min 10 characters)</Label>
            <Textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Explain why the challenge needs re-curation..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>Cancel</Button>
            <Button
              onClick={handleReturn}
              disabled={returnReason.trim().length < 10 || unfreezeMut.isPending}
            >
              {unfreezeMut.isPending ? 'Returning…' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
