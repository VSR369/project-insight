/**
 * ApprovalActionBar — Fixed bottom bar with Approve, Return, Reject buttons.
 *
 * Approve flow:
 *   1. Click "Approve" (only active on Overview tab) → switches to Publication Config
 *   2. Configure visibility + eligibility + finalize complexity
 *   3. "Confirm Approval" becomes active → saves config, calls complete_phase
 *
 * Return flow now supports structured modification points.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import {
  useReturnForModification,
  useRejectChallenge,
} from '@/hooks/cogniblend/useApprovalActions';
import ApprovalReturnModal from './ApprovalReturnModal';
import ApprovalRejectModal from './ApprovalRejectModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  CheckCircle2,
  RotateCcw,
  XCircle,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'overview' | 'evaluation' | 'legal' | 'publication';

interface ApprovalActionBarProps {
  challengeId: string;
  challenge: {
    title: string;
    governance_profile: string | null;
  };
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isApproved: boolean;
  setIsApproved: (v: boolean) => void;
  pubConfigReady: boolean;
  pubConfigValues: { visibility: string; eligibility: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApprovalActionBar({
  challengeId,
  challenge,
  activeTab,
  setActiveTab,
  isApproved,
  setIsApproved,
  pubConfigReady,
  pubConfigValues,
}: ApprovalActionBarProps) {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const [returnOpen, setReturnOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Hooks
  // ══════════════════════════════════════
  const { user } = useAuth();
  const navigate = useNavigate();
  const returnMutation = useReturnForModification();
  const rejectMutation = useRejectChallenge();
  const completePhase = useCompletePhase();

  // ══════════════════════════════════════
  // SECTION 3: Handlers
  // ══════════════════════════════════════

  /** Step 1: ID clicks Approve → unlock Publication Config */
  const handleApprove = () => {
    setIsApproved(true);
    setActiveTab('publication');
    toast.info(
      'Challenge approved. Please configure visibility and eligibility before publishing.',
      { duration: 5000 },
    );
  };

  /** Step 2: Confirm Approval → save config + complete_phase */
  const handleConfirmApproval = async () => {
    if (!user?.id) return;
    setIsConfirming(true);
    try {
      // Save visibility + eligibility
      const { error } = await supabase
        .from('challenges')
        .update({
          visibility: pubConfigValues.visibility,
          eligibility: pubConfigValues.eligibility,
          updated_by: user.id,
        })
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Complete phase 4 → 5 (with auto-advance logic)
      await completePhase.mutateAsync({
        challengeId,
        userId: user.id,
      });

      // Navigate back to queue after short delay
      setTimeout(() => navigate('/cogni/approval'), 2000);
    } catch {
      toast.error('Failed to confirm approval. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  /** Return for Modification */
  const handleReturn = (reason: string) => {
    if (!user?.id) return;
    returnMutation.mutate(
      {
        challengeId,
        userId: user.id,
        reason,
        governanceProfile: challenge.governance_profile,
      },
      {
        onSuccess: () => {
          setReturnOpen(false);
          setTimeout(() => navigate('/cogni/approval'), 1500);
        },
      },
    );
  };

  /** Reject */
  const handleReject = (reason: string) => {
    if (!user?.id) return;
    rejectMutation.mutate(
      {
        challengeId,
        userId: user.id,
        reason,
      },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setTimeout(() => navigate('/cogni/approval'), 1500);
        },
      },
    );
  };

  // ══════════════════════════════════════
  // SECTION 4: Derived state
  // ══════════════════════════════════════
  const approveDisabled = !isApproved && activeTab !== 'overview';
  const confirmDisabled = !pubConfigReady || isConfirming;

  // ══════════════════════════════════════
  // SECTION 5: Render
  // ══════════════════════════════════════
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          {/* Left: Return + Reject */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-50"
              onClick={() => setReturnOpen(true)}
              disabled={returnMutation.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              <span className="hidden lg:inline">Return for Modification</span>
              <span className="lg:hidden">Return</span>
            </Button>

            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setRejectOpen(true)}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              <span className="hidden lg:inline">Reject</span>
              <span className="lg:hidden">Reject</span>
            </Button>
          </div>

          {/* Right: Approve / Confirm */}
          <div>
            {!isApproved ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApprove}
                disabled={approveDisabled}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmApproval}
                disabled={confirmDisabled}
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                {isConfirming ? 'Confirming...' : 'Confirm Approval'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ApprovalReturnModal
        open={returnOpen}
        onOpenChange={setReturnOpen}
        onConfirm={handleReturn}
        isPending={returnMutation.isPending}
      />
      <ApprovalRejectModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        isPending={rejectMutation.isPending}
      />
    </>
  );
}
