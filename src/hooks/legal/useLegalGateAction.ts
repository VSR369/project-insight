/**
 * useLegalGateAction — Reusable hook for gating actions behind legal acceptance.
 * Returns state and handlers to show LegalGateModal before proceeding.
 */
import { useState, useCallback, useRef } from 'react';
import type { TriggerEvent } from '@/types/legal.types';

interface UseLegalGateActionParams {
  triggerEvent: TriggerEvent | string;
  challengeId?: string;
  userRole?: string;
  governanceMode?: string;
}

interface LegalGateActionState {
  showGate: boolean;
  triggerEvent: TriggerEvent | string;
  challengeId?: string;
  userRole?: string;
  governanceMode?: string;
  /** Call this instead of the original action. It shows the gate first. */
  gateAction: (onProceed: () => void) => void;
  /** Pass to LegalGateModal onAllAccepted */
  handleAllAccepted: () => void;
  /** Pass to LegalGateModal onDeclined */
  handleDeclined: () => void;
}

export function useLegalGateAction({
  triggerEvent,
  challengeId,
  userRole = 'ALL',
  governanceMode = 'ALL',
}: UseLegalGateActionParams): LegalGateActionState {
  const [showGate, setShowGate] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const gateAction = useCallback((onProceed: () => void) => {
    pendingAction.current = onProceed;
    setShowGate(true);
  }, []);

  const handleAllAccepted = useCallback(() => {
    setShowGate(false);
    pendingAction.current?.();
    pendingAction.current = null;
  }, []);

  const handleDeclined = useCallback(() => {
    setShowGate(false);
    pendingAction.current = null;
  }, []);

  return {
    showGate,
    triggerEvent,
    challengeId,
    userRole,
    governanceMode,
    gateAction,
    handleAllAccepted,
    handleDeclined,
  };
}
