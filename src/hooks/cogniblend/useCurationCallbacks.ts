/**
 * useCurationCallbacks — Navigation, budget, and guided-mode callbacks
 * extracted from useCurationPageOrchestrator.
 */

import { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GROUPS } from '@/lib/cogniblend/curationSectionDefs';
import { toast } from 'sonner';
import type { SectionKey } from '@/types/sections';

interface GroupProgress {
  done: number;
  total: number;
}

interface UseCurationCallbacksOptions {
  challengeId: string | undefined;
  activeGroup: string;
  setActiveGroup: (g: string) => void;
  curationStore: any;
  setBudgetShortfall: (v: any) => void;
  groupProgress: Record<string, GroupProgress>;
}

export function useCurationCallbacks({
  challengeId,
  activeGroup,
  setActiveGroup,
  curationStore,
  setBudgetShortfall,
  groupProgress,
}: UseCurationCallbacksOptions) {
  // ── Navigation helpers ──
  const handleNavigateToSection = useCallback((sectionKey: string) => {
    const group = GROUPS.find((g) => g.sectionKeys.includes(sectionKey));
    if (group) setActiveGroup(group.id);
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

  // ── Budget revision handler ──
  const handleAcceptBudgetRevision = useCallback(async (shortfall: any) => {
    try {
      if (curationStore && shortfall) {
        const existingReward = curationStore.getState().getSectionEntry('reward_structure' as SectionKey);
        const updatedData = {
          ...(typeof existingReward.data === 'object' && existingReward.data ? existingReward.data : {}),
          _budgetRevised: true,
          _revisedReward: shortfall.originalBudget,
          _revisionStrategy: shortfall.strategy,
        };
        curationStore.getState().setSectionData('reward_structure' as SectionKey, updatedData as Record<string, unknown>);
      }
      const { data: crRoles } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId!)
        .eq('role_code', 'CR')
        .limit(1);
      const crUserId = crRoles?.[0]?.user_id;
      if (crUserId) {
        await supabase.from('cogni_notifications').insert({
          user_id: crUserId,
          challenge_id: challengeId!,
          notification_type: 'budget_revision',
          title: 'Budget Revision Requires Approval',
          message: `Budget shortfall detected (${shortfall.gapPercentage}% gap). Strategy: ${shortfall.strategy}. Original: ${shortfall.originalBudget}, Minimum: ${shortfall.minimumViableReward}.`,
        });
      }
      toast.success('Revision accepted. Notification sent to Creator.');
    } catch {
      toast.error('Failed to send notification to Creator.');
    }
    setBudgetShortfall(null);
  }, [curationStore, challengeId, setBudgetShortfall]);

  // ── Guided mode next handler ──
  const handleGuidedNext = useCallback(() => {
    const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
    for (let i = currentIdx + 1; i < GROUPS.length; i++) {
      const gp = groupProgress[GROUPS[i].id];
      if (gp && gp.done < gp.total) {
        setActiveGroup(GROUPS[i].id);
        return;
      }
    }
    toast.success('All tabs reviewed!');
  }, [activeGroup, groupProgress]);

  const guidedNextLabel = useMemo(() => {
    const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
    for (let i = currentIdx + 1; i < GROUPS.length; i++) {
      const gp = groupProgress[GROUPS[i].id];
      if (gp && gp.done < gp.total) return GROUPS[i].label;
    }
    return 'All Complete';
  }, [activeGroup, groupProgress]);

  const handlePreFlightGoToSection = useCallback((sectionKey: string) => {
    const group = GROUPS.find(g => g.sectionKeys.includes(sectionKey));
    if (group) setActiveGroup(group.id);
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  return {
    handleNavigateToSection,
    handleGroupClick,
    handleAcceptBudgetRevision,
    handleGuidedNext,
    guidedNextLabel,
    handlePreFlightGoToSection,
  };
}
