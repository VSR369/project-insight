/**
 * CuratorSectionPanel — Collapsible panel shell for each curator section.
 * Header extracted to SectionPanelHeader.tsx.
 * Fullscreen modal extracted to SectionFullscreenModal.tsx.
 */

import React, { useState, useEffect, useCallback } from "react";
import type { AiActionType } from "@/types/sections";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { SectionPanelHeader } from "./SectionPanelHeader";
import { SectionFullscreenModal } from "./SectionFullscreenModal";
import { ValidationResultsBar } from "./ValidationResultsBar";
import type { ValidationResult } from "@/lib/cogniblend/postLlmValidation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectionStatus =
  | "not_reviewed" | "pass" | "warning" | "needs_revision" | "view_only"
  | "ai_reviewed" | "pending_response" | "response_received" | "accepted"
  | "stale" | "pending_modification" | "curator_approved";

export interface SectionActionRecord {
  id: string; action_type: string; status: string; addressed_to: string | null;
  priority: string | null; comment_html: string | null; created_at: string;
  responded_at: string | null; response_html: string | null;
}

export interface CuratorSectionPanelProps {
  sectionKey: string; label: string; attribution?: string; filled: boolean;
  status: SectionStatus; isLocked: boolean; isReadOnly: boolean; isApproved: boolean;
  onToggleApproval: () => void; onApproveSection?: () => void; onUndoApproval?: () => void;
  challengeId: string; inlineFlags?: string[]; children: React.ReactNode;
  aiReviewSlot?: React.ReactNode; defaultExpanded?: boolean;
  sectionActions?: SectionActionRecord[]; promptSource?: "supervisor" | "default" | null;
  expandVersion?: number; staleBecauseOf?: string[]; staleAt?: string | null;
  validationResult?: ValidationResult | null; aiAction?: AiActionType;
  forceExpandTick?: number;
}

export { loadExpandState, saveExpandState };

function getStorageKey(challengeId: string) { return `curator_panel_state_${challengeId}`; }

function loadExpandState(challengeId: string): Record<string, boolean> {
  try { const raw = localStorage.getItem(getStorageKey(challengeId)); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function saveExpandState(challengeId: string, state: Record<string, boolean>) {
  try { localStorage.setItem(getStorageKey(challengeId), JSON.stringify(state)); } catch {}
}

export function CuratorSectionPanel({
  sectionKey, label, attribution, filled, status, isLocked, isReadOnly, isApproved,
  onToggleApproval, onApproveSection, onUndoApproval, challengeId, inlineFlags,
  children, aiReviewSlot, defaultExpanded, sectionActions, promptSource,
  expandVersion, staleBecauseOf, staleAt, validationResult, aiAction, forceExpandTick,
}: CuratorSectionPanelProps) {
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = loadExpandState(challengeId);
    if (saved[sectionKey] !== undefined) return saved[sectionKey];
    return defaultExpanded ?? false;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      const s = loadExpandState(challengeId);
      s[sectionKey] = next;
      saveExpandState(challengeId, s);
      return next;
    });
  }, [challengeId, sectionKey]);

  useEffect(() => {
    if (defaultExpanded) {
      const saved = loadExpandState(challengeId);
      if (saved[sectionKey] === undefined) {
        setIsExpanded(true);
        saved[sectionKey] = true;
        saveExpandState(challengeId, saved);
      }
    }
  }, [defaultExpanded]);

  useEffect(() => {
    if (expandVersion === undefined) return;
    const saved = loadExpandState(challengeId);
    if (saved[sectionKey] !== undefined) setIsExpanded(saved[sectionKey]);
  }, [expandVersion, challengeId, sectionKey]);

  // Force-expand + scroll when navigated to via section navigation events
  const panelRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!forceExpandTick || forceExpandTick === 0) return;
    setIsExpanded(true);
    const saved = loadExpandState(challengeId);
    saved[sectionKey] = true;
    saveExpandState(challengeId, saved);
    setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [forceExpandTick, challengeId, sectionKey]);

  // Derived state
  const effectiveStatus: SectionStatus = (() => {
    if (isLocked) {
      if (sectionActions?.find(a => a.action_type === "approval" && a.status === "approved")) return "accepted";
      if (sectionActions?.find(a => a.action_type === "modification_request" && a.status === "responded")) return "response_received";
      if (sectionActions?.find(a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending"))) return "pending_response";
      if (status === "pass" || status === "warning" || status === "needs_revision") return "ai_reviewed";
      return "view_only";
    }
    return status;
  })();

  const isCuratorAccepted = sectionActions?.some(a => a.action_type === "approval" && a.status === "approved") ?? false;
  const pendingModification = sectionActions?.find(a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending"));

  const handleAcceptClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); setShowAcceptConfirm(true); }, []);
  const handleConfirmAccept = useCallback(() => { setShowAcceptConfirm(false); onApproveSection?.(); }, [onApproveSection]);
  const handleUndoClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); onUndoApproval?.(); }, [onUndoApproval]);

  const staleTimeAgo = staleAt ? (() => {
    const diff = Date.now() - new Date(staleAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
  })() : null;

  const accentClass = (() => {
    switch (effectiveStatus) {
      case "pass": case "accepted": case "curator_approved": return "border-l-emerald-400";
      case "warning": return "border-l-amber-400";
      case "needs_revision": return "border-l-red-400";
      case "stale": return "border-l-amber-500";
      case "view_only": case "ai_reviewed": return "border-l-blue-400";
      default: return "border-l-transparent";
    }
  })();

  return (
    <>
      <div ref={panelRef} className={cn("rounded-xl shadow-sm hover:shadow-md transition-shadow border border-border/60 bg-card mb-4 overflow-hidden border-l-4", accentClass)}>
        <SectionPanelHeader
          sectionKey={sectionKey} label={label} attribution={attribution} filled={filled}
          effectiveStatus={effectiveStatus} isExpanded={isExpanded} isLocked={isLocked}
          isReadOnly={isReadOnly} isApproved={isApproved} isCuratorAccepted={isCuratorAccepted}
          onToggleApproval={onToggleApproval} onToggleExpand={toggleExpand}
          onFullscreen={() => setIsFullscreen(true)} onAcceptClick={handleAcceptClick}
          onUndoClick={handleUndoClick} onUndoApproval={onUndoApproval}
          promptSource={promptSource} inlineFlags={inlineFlags} status={status}
          staleBecauseOf={staleBecauseOf} staleAt={staleAt} staleTimeAgo={staleTimeAgo}
          aiAction={aiAction}
        />

        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border/40">
            {children}

            {isLocked && pendingModification && (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-2">
                <Clock className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 dark:text-orange-300">Comments Sent to Coordinator</p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                    Priority: <span className="capitalize">{pendingModification.priority}</span> — Sent {new Date(pendingModification.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {aiReviewSlot && (
              <div className="relative my-5">
                <div className="border-t border-border" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 py-0.5 text-[11px] font-medium text-muted-foreground border border-border rounded-full inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />AI Analysis
                </span>
              </div>
            )}
            {aiReviewSlot}

            {validationResult && (validationResult.corrections.length > 0 || validationResult.passedChecks.length > 0) && (
              <ValidationResultsBar result={validationResult} />
            )}
            {inlineFlags && inlineFlags.length > 1 && (
              <div className="mt-2 space-y-1">
                {inlineFlags.slice(1).map((flag, i) => (
                  <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />{flag}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SectionFullscreenModal
        open={isFullscreen} onOpenChange={setIsFullscreen}
        label={label} attribution={attribution} effectiveStatus={effectiveStatus}
        isLocked={isLocked} aiReviewSlot={aiReviewSlot} validationResult={validationResult}
      >
        {children}
      </SectionFullscreenModal>

      <AlertDialog open={showAcceptConfirm} onOpenChange={setShowAcceptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this section?</AlertDialogTitle>
            <AlertDialogDescription>
              Confirming that <span className="font-medium text-foreground">{label}</span> has been reviewed and is approved for challenge publication.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>Confirm Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
