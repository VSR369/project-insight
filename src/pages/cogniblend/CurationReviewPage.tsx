/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Thin orchestrator: all logic lives in useCurationPageOrchestrator,
 * all UI sections in CurationHeaderBar, CurationSectionList, CurationRightRail.
 */

import { useState } from "react";
import { useCurationPageOrchestrator } from "@/hooks/cogniblend/useCurationPageOrchestrator";
import { useFreezeForLegalReview, useAssembleCpa } from "@/hooks/cogniblend/useFreezeActions";
import { LegalReviewPanel } from "@/components/cogniblend/curation/LegalReviewPanel";
import { CuratorCpaReviewPanel } from "@/components/cogniblend/curation/CuratorCpaReviewPanel";
import { usePwaStatus } from "@/hooks/cogniblend/usePwaStatus";
import { PwaAcceptanceGate } from "@/components/cogniblend/workforce/PwaAcceptanceGate";
import { CurationHeaderBar } from "@/components/cogniblend/curation/CurationHeaderBar";
import { CurationSectionList } from "@/components/cogniblend/curation/CurationSectionList";
import { CurationRightRail } from "@/components/cogniblend/curation/CurationRightRail";
import { SendForModificationModal } from "@/components/cogniblend/curation/SendForModificationModal";
import { PreFlightGateDialog } from "@/components/cogniblend/curation/PreFlightGateDialog";
import { FreezeStatusBanner } from "@/components/cogniblend/curation/FreezeStatusBanner";
import { ContextLibraryDrawer } from "@/components/cogniblend/curation/ContextLibraryDrawer";
import { GROUPS, SECTION_MAP } from "@/lib/cogniblend/curationSectionDefs";
import { getSectionDisplayName } from "@/lib/cogniblend/sectionDependencies";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronsDownUp, ChevronsUpDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CurationReviewPage() {
  const o = useCurationPageOrchestrator();
  const freezeMut = useFreezeForLegalReview(o.challengeId ?? '');
  const assembleMut = useAssembleCpa(o.challengeId ?? '');
  const [pwaAccepted, setPwaAccepted] = useState(false);

  const opModel = (o.challenge as any)?.operating_model ?? 'IP';
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(
    opModel === 'MP' ? o.user?.id : undefined
  );

  const handleFreezeForLegal = async () => {
    if (!o.user?.id) return;
    try {
      await freezeMut.mutateAsync(o.user.id);
      await assembleMut.mutateAsync(o.user.id);
    } catch { /* errors handled by individual mutation onError */ }
  };

  // ── Loading / not-found ──
  if (o.isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
          <div><Skeleton className="h-60 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!o.challenge) {
    return <div className="p-6 text-center text-muted-foreground">Challenge not found.</div>;
  }

  if (opModel === 'MP' && !hasPwa && !pwaAccepted && !pwaLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PwaAcceptanceGate userId={o.user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }



  const isReadOnly = false;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <FreezeStatusBanner
        lockStatus={(o.challenge as any).curation_lock_status ?? 'OPEN'}
        frozenAt={(o.challenge as any).curation_frozen_at}
      />
      <CurationHeaderBar
        challengeId={o.challengeId!}
        challengeTitle={o.challenge.title}
        governanceProfile={(o.challenge as any).governance_mode_override ?? o.challenge.governance_profile}
        governanceModeOverride={(o.challenge as any).governance_mode_override}
        operatingModel={o.challenge.operating_model}
        currentPhase={o.challenge.current_phase}
        phaseStatus={o.challenge.phase_status}
        problemStatement={o.challenge.problem_statement}
        extendedBrief={o.challenge.extended_brief}
        rewardStructure={o.challenge.reward_structure}
        phaseSchedule={o.challenge.phase_schedule}
        challenge={o.challenge as any}
        isReadOnly={isReadOnly}
        orgTypeName={o.orgTypeName}
        onNavigateBack={() => o.navigate("/cogni/curation")}
        guidedMode={o.guidedMode}
        onGuidedModeChange={o.setGuidedMode}
        userId={o.user?.id}
        userRoleCodes={o.userRoleCodes}
        aiReviewCounts={o.aiReviewCounts}
        onAcceptAllPassing={o.handleAcceptAllPassing}
        onReviewWarnings={o.handleReviewWarnings}
        phaseDescription={o.phaseDescription}
        legalEscrowBlocked={o.legalEscrowBlocked}
        blockingReason={o.blockingReason}
        groups={GROUPS}
        groupProgress={o.groupProgress}
        groupReadiness={o.groupReadiness}
        activeGroup={o.activeGroup}
        onGroupClick={o.handleGroupClick}
        staleCountByGroup={o.staleCountByGroup}
        optimisticIndustrySegId={o.optimisticIndustrySegId}
        industrySegments={o.industrySegments}
      />

      {/* ═══ MAIN LAYOUT: Content + Right Rail ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT — Main Content (3/4) */}
        <div className="lg:col-span-3">
          <Card className={cn("border-2", o.activeGroupDef.colorBorder)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{o.activeGroupDef.label}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => o.handleExpandCollapseAll(true)}>
                    <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />Expand All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => o.handleExpandCollapseAll(false)}>
                    <ChevronsDownUp className="h-3.5 w-3.5 mr-1" />Collapse All
                  </Button>
                  {o.staleSections.length > 0 && (
                    <Button
                      variant={o.showOnlyStale ? "default" : "outline"}
                      size="sm"
                      className={cn("h-7 px-2.5 text-xs", o.showOnlyStale ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-amber-700 border-amber-300 hover:bg-amber-50")}
                      onClick={() => o.setShowOnlyStale(!o.showOnlyStale)}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      {o.showOnlyStale ? "Show All Sections" : `Show Only Stale (${o.staleSections.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CurationSectionList
                challenge={o.challenge}
                challengeId={o.challengeId!}
                activeGroupDef={o.activeGroupDef}
                activeGroup={o.activeGroup}
                showOnlyStale={o.showOnlyStale}
                staleKeySet={o.staleKeySet}
                staleCountByGroup={o.staleCountByGroup}
                setShowOnlyStale={o.setShowOnlyStale}
                setActiveGroup={o.setActiveGroup}
                editingSection={o.editingSection}
                setEditingSection={o.setEditingSection}
                savingSection={o.savingSection}
                setSavingSection={o.setSavingSection}
                isReadOnly={isReadOnly}
                aiReviews={o.aiReviews}
                approvedSections={o.approvedSections}
                toggleSectionApproval={o.toggleSectionApproval}
                sectionAIFlags={o.sectionAIFlags}
                highlightWarnings={o.highlightWarnings}
                aiSuggestedComplexity={o.aiSuggestedComplexity}
                groupReadiness={o.groupReadiness}
                sectionReadiness={o.sectionReadiness}
                dismissedPrereqBanner={o.dismissedPrereqBanner}
                setDismissedPrereqBanner={o.setDismissedPrereqBanner}
                masterData={o.masterData}
                complexityParams={o.complexityParams}
                industrySegments={o.industrySegments}
                solutionTypeGroups={o.solutionTypeGroups}
                solutionTypesData={o.solutionTypesData}
                solutionTypeMap={o.solutionTypeMap}
                handleSaveText={o.handleSaveText}
                handleSaveDeliverables={o.handleSaveDeliverables}
                handleSaveStructuredDeliverables={o.handleSaveStructuredDeliverables}
                handleSaveEvalCriteria={o.handleSaveEvalCriteria}
                handleSaveOrgPolicyField={o.handleSaveOrgPolicyField}
                handleSaveMaturityLevel={o.handleSaveMaturityLevel}
                handleSaveSolutionTypes={o.handleSaveSolutionTypes}
                handleSaveExtendedBrief={o.handleSaveExtendedBrief}
                handleSaveComplexity={o.handleSaveComplexity}
                handleLockComplexity={o.handleLockComplexity}
                handleUnlockComplexity={o.handleUnlockComplexity}
                handleAcceptRefinement={o.handleAcceptRefinement}
                handleAcceptExtendedBriefRefinement={o.handleAcceptExtendedBriefRefinement}
                handleSingleSectionReview={o.handleSingleSectionReview}
                handleMarkAddressed={o.handleMarkAddressed}
                handleComplexityReReview={o.handleComplexityReReview}
                handleApproveLockedSection={o.handleApproveLockedSection}
                handleUndoApproval={o.handleUndoApproval}
                handleAddDomainTag={o.handleAddDomainTag}
                handleRemoveDomainTag={o.handleRemoveDomainTag}
                handleIndustrySegmentChange={o.handleIndustrySegmentChange}
                handleAcceptAllLegalDefaults={o.handleAcceptAllLegalDefaults}
                saveSectionMutation={o.saveSectionMutation}
                challengeCtx={o.challengeCtx}
                optimisticIndustrySegId={o.optimisticIndustrySegId}
                escrowEnabled={o.escrowEnabled}
                setEscrowEnabled={o.setEscrowEnabled}
                isAcceptingAllLegal={o.isAcceptingAllLegal}
                legalDocs={o.legalDocs}
                legalDetails={o.legalDetails}
                escrowRecord={o.escrowRecord}
                rewardStructureRef={o.rewardStructureRef}
                complexityModuleRef={o.complexityModuleRef}
                curationStore={o.curationStore}
                staleSections={o.staleSections}
                getSectionActions={o.getSectionActions}
                setLockedSendState={o.setLockedSendState}
                setContextLibraryOpen={o.setContextLibraryOpen}
                expandVersion={o.expandVersion}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT RAIL (1/4) */}
        <CurationRightRail
          challengeId={o.challengeId!}
          challengeCurrencyCode={o.challenge?.currency_code ?? 'USD'}
          phaseStatus={o.challenge.phase_status ?? null}
          operatingModel={o.challenge.operating_model}
          isReadOnly={isReadOnly}
          aiQuality={o.aiQuality}
          aiQualityLoading={o.aiQualityLoading}
          onAIQualityAnalysis={o.handleAIQualityAnalysis}
          challengeCtx={o.challengeCtx}
          allSectionKeys={GROUPS.flatMap(g => g.sectionKeys).filter(Boolean)}
          completenessResult={o.completenessResult}
          completenessCheckDefs={o.completenessCheckDefs}
          completenessRunning={o.completenessRunning}
          onRunCompletenessCheck={o.runCompletenessCheck}
          onNavigateToSection={o.handleNavigateToSection}
          onOpenContextLibrary={() => o.setContextLibraryOpen(true)}
          aiReviewLoading={o.aiReviewLoading}
          onAIReview={o.handleAIReview}
          waveProgress={o.waveProgress}
          onCancelReview={o.cancelReview}
          budgetShortfall={o.budgetShortfall}
          curationStore={o.curationStore}
          onDismissBudgetShortfall={() => o.setBudgetShortfall(null)}
          onModifyRewardManually={() => {
            const group = GROUPS.find(g => g.sectionKeys.includes('reward_structure'));
            if (group) o.setActiveGroup(group.id);
            o.setBudgetShortfall(null);
          }}
          onAcceptBudgetRevision={o.handleAcceptBudgetRevision}
          phase2Status={o.phase2Status}
          triageTotalCount={o.triageTotalCount}
          aiReviews={o.aiReviews}
          staleSections={o.staleSections}
          showOnlyStale={o.showOnlyStale}
          setShowOnlyStale={o.setShowOnlyStale}
          groups={GROUPS}
          sectionMap={SECTION_MAP}
          getSectionDisplayName={getSectionDisplayName}
          setActiveGroup={o.setActiveGroup}
          allComplete={o.allComplete}
          checklistSummary={o.checklistSummary}
          completedCount={o.completedCount}
          legalEscrowBlocked={o.legalEscrowBlocked}
          blockingReason={o.blockingReason}
          onReReviewStale={o.reReviewStale}
          setAiReviewLoading={o.setAiReviewLoading}
          userId={o.user?.id}
          lockStatus={(o.challenge as any).curation_lock_status ?? 'OPEN'}
          governanceMode={((o.challenge as any).governance_mode_override ?? o.challenge.governance_profile) ?? 'QUICK'}
          currentPhase={o.challenge.current_phase}
          onFreezeForLegal={handleFreezeForLegal}
        />

        {/* STRUCTURED + FROZEN: curator-led CPA review panel */}
        {(o.challenge as any)?.curation_lock_status === 'FROZEN' &&
          ((o.challenge as any)?.governance_mode_override ?? (o.challenge as any)?.governance_profile ?? 'STRUCTURED').toUpperCase() === 'STRUCTURED' && (
          <CuratorCpaReviewPanel
            challengeId={o.challengeId!}
            userId={o.user?.id ?? ''}
          />
        )}
      </div>

      {/* ═══ MODALS & OVERLAYS ═══ */}
      <SendForModificationModal
        open={o.lockedSendState.open}
        onOpenChange={(open) => o.setLockedSendState(prev => ({ ...prev, open }))}
        challengeId={o.challengeId!}
        sectionKey={o.lockedSendState.sectionKey}
        sectionLabel={o.lockedSendState.sectionLabel}
        initialComment={o.lockedSendState.initialComment}
        aiOriginalComments={o.lockedSendState.aiOriginalComments}
      />

      <PreFlightGateDialog
        result={o.preFlightResult}
        open={o.preFlightDialogOpen}
        onOpenChange={o.setPreFlightDialogOpen}
        onGoToSection={o.handlePreFlightGoToSection}
        onProceed={o.executeWavesWithBudgetCheck}
      />

      {o.guidedMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" className="shadow-lg gap-2 rounded-full px-6" onClick={o.handleGuidedNext}>
            Next: {o.guidedNextLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {o.challengeId && (
        <ContextLibraryDrawer
          challengeId={o.challengeId}
          challengeTitle={o.challenge?.title}
          open={o.contextLibraryOpen}
          onOpenChange={o.setContextLibraryOpen}
        />
      )}
    </div>
  );
}
