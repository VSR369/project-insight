/**
 * CuratorSectionPanel — Collapsible panel shell for each curator section.
 *
 * Features:
 * - Inline expand/collapse with chevron toggle
 * - Fullscreen modal overlay (⤢ button)
 * - Status badge (gray/amber/red/green/blue/teal)
 * - Accept Section button in HEADER for locked sections
 * - Confirmation dialog for Accept + Undo after acceptance
 * - localStorage persistence of expand state per challenge ID
 * - Auto-expand for sections with warnings/blocks
 */

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Clock,
  Undo2,
  Sparkles,
} from "lucide-react";
import { SECTION_FORMAT_CONFIG, AI_REVIEW_DISABLED_SECTIONS } from "@/lib/cogniblend/curationSectionFormats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectionStatus =
  | "not_reviewed"
  | "pass"
  | "warning"
  | "needs_revision"
  | "view_only"
  | "ai_reviewed"
  | "pending_response"
  | "response_received"
  | "accepted"
  // Legacy (kept for backward compat)
  | "pending_modification"
  | "curator_approved";

export interface SectionActionRecord {
  id: string;
  action_type: string;
  status: string;
  addressed_to: string | null;
  priority: string | null;
  comment_html: string | null;
  created_at: string;
  responded_at: string | null;
  response_html: string | null;
}

export interface CuratorSectionPanelProps {
  sectionKey: string;
  label: string;
  attribution?: string;
  filled: boolean;
  status: SectionStatus;
  isLocked: boolean;
  isReadOnly: boolean;
  isApproved: boolean;
  onToggleApproval: () => void;
  onApproveSection?: () => void;
  onUndoApproval?: () => void;
  challengeId: string;
  inlineFlags?: string[];
  /** Content rendered inside the panel body */
  children: React.ReactNode;
  /** AI review content rendered below the main content */
  aiReviewSlot?: React.ReactNode;
  /** Default open override (e.g. for sections with warnings) */
  defaultExpanded?: boolean;
  /** Existing section action records for this section */
  sectionActions?: SectionActionRecord[];
  /** Whether AI used supervisor-configured or default prompt */
  promptSource?: "supervisor" | "default" | null;
  /** Increment to force re-read expand state from localStorage (for expand/collapse all) */
  expandVersion?: number;
}

// Export localStorage helpers so parent can bulk-update expand state
export { loadExpandState, saveExpandState };

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function getStorageKey(challengeId: string) {
  return `curator_panel_state_${challengeId}`;
}

function loadExpandState(challengeId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getStorageKey(challengeId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveExpandState(challengeId: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(getStorageKey(challengeId), JSON.stringify(state));
  } catch {
    // Silently fail if localStorage is full
  }
}

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: SectionStatus }) {
  switch (status) {
    case "pass":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
          Pass
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] hover:bg-amber-100">
          Warning
        </Badge>
      );
    case "needs_revision":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] hover:bg-red-100">
          Needs Revision
        </Badge>
      );
    case "view_only":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] hover:bg-blue-100">
          <Eye className="h-3 w-3 mr-1" />View Only
        </Badge>
      );
    case "ai_reviewed":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] hover:bg-blue-100">
          AI Reviewed
        </Badge>
      );
    case "pending_response":
    case "pending_modification":
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] hover:bg-orange-100">
          <Clock className="h-3 w-3 mr-1" />Pending Response
        </Badge>
      );
    case "response_received":
      return (
        <Badge className="bg-teal-100 text-teal-800 border-teal-300 text-[10px] hover:bg-teal-100">
          Response Received
        </Badge>
      );
    case "accepted":
    case "curator_approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
          <ShieldCheck className="h-3 w-3 mr-1" />Accepted
        </Badge>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CuratorSectionPanel({
  sectionKey,
  label,
  attribution,
  filled,
  status,
  isLocked,
  isReadOnly,
  isApproved,
  onToggleApproval,
  onApproveSection,
  onUndoApproval,
  challengeId,
  inlineFlags,
  children,
  aiReviewSlot,
  defaultExpanded,
  sectionActions,
  promptSource,
  expandVersion,
}: CuratorSectionPanelProps) {
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  // ── Expand/collapse state with localStorage persistence ──
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = loadExpandState(challengeId);
    if (saved[sectionKey] !== undefined) return saved[sectionKey];
    if (defaultExpanded) return true;
    return false;
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Persist expand state changes
  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      const state = loadExpandState(challengeId);
      state[sectionKey] = next;
      saveExpandState(challengeId, state);
      return next;
    });
  }, [challengeId, sectionKey]);

  // Auto-expand on status change to warning/needs_revision — only if user hasn't
  // explicitly set this section's state in localStorage
  useEffect(() => {
    if (defaultExpanded) {
      const saved = loadExpandState(challengeId);
      // Only auto-expand if there's no explicit user choice persisted
      if (saved[sectionKey] === undefined) {
        setIsExpanded(true);
        saved[sectionKey] = true;
        saveExpandState(challengeId, saved);
      }
    }
  }, [defaultExpanded]); // intentionally limited deps

  // Re-sync from localStorage when parent triggers expand/collapse all
  useEffect(() => {
    if (expandVersion === undefined) return;
    const saved = loadExpandState(challengeId);
    if (saved[sectionKey] !== undefined) {
      setIsExpanded(saved[sectionKey]);
    }
  }, [expandVersion, challengeId, sectionKey]);

  // Derive effective status from action records
  const effectiveStatus: SectionStatus = (() => {
    if (isLocked) {
      const approved = sectionActions?.find(a => a.action_type === "approval" && a.status === "approved");
      if (approved) return "accepted";
      const responded = sectionActions?.find(a => a.action_type === "modification_request" && a.status === "responded");
      if (responded) return "response_received";
      const pendingMod = sectionActions?.find(a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending"));
      if (pendingMod) return "pending_response";
      // Check if AI review was run for this section (status comes from parent)
      if (status === "pass" || status === "warning" || status === "needs_revision") return "ai_reviewed";
      return "view_only";
    }
    return status;
  })();

  const isCuratorAccepted = sectionActions?.some(
    a => a.action_type === "approval" && a.status === "approved"
  ) ?? false;

  const pendingModification = sectionActions?.find(
    a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending")
  );

  const handleAcceptClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAcceptConfirm(true);
  }, []);

  const handleConfirmAccept = useCallback(() => {
    setShowAcceptConfirm(false);
    onApproveSection?.();
  }, [onApproveSection]);

  const handleUndoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUndoApproval?.();
  }, [onUndoApproval]);

  // Detect if content is empty for placeholder display
  const isContentEmpty = !filled;

  return (
    <>
      <div className="rounded-xl shadow-sm border border-gray-100 bg-white mb-4 overflow-hidden">
        {/* ── Panel Header (always visible) ── */}
        <button
          type="button"
          onClick={toggleExpand}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3 text-left transition-colors",
            "hover:bg-muted/40",
            isExpanded && "bg-muted/20",
          )}
        >
          {/* Chevron */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Approval checkbox */}
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isApproved}
              onCheckedChange={onToggleApproval}
              className="shrink-0"
              disabled={isReadOnly}
            />
          </div>

          {/* Filled indicator */}
          {filled ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}

          {/* Label */}
          <span className="text-sm font-medium truncate flex-1">{label}</span>

          {/* Attribution */}
          {attribution && (
            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0 hover:bg-gray-100 shrink-0">
              {attribution}
            </Badge>
          )}

          {/* Prompt source indicator */}
          {promptSource === "supervisor" && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1.5 py-0 hover:bg-emerald-50 shrink-0">
              ✅ Supervisor
            </Badge>
          )}
          {promptSource === "default" && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5 py-0 hover:bg-amber-50 shrink-0">
              ⚠️ Default AI
            </Badge>
          )}

          {/* Lock icon for restricted sections */}
          {isLocked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}

          {/* Inline AI flag preview */}
          {inlineFlags && inlineFlags.length > 0 && (
            <span className="text-[10px] text-amber-700 truncate shrink min-w-0 max-w-[200px]">
              <AlertTriangle className="h-3 w-3 inline mr-0.5" />
              {inlineFlags[0]}
            </span>
          )}

          {/* Status badge */}
          <StatusBadge status={effectiveStatus} />

          {/* Fullscreen expand button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
            className="shrink-0"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              tabIndex={-1}
              type="button"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Accept Section button in HEADER — locked sections only (always visible regardless of isReadOnly) */}
          {isLocked && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              {isCuratorAccepted ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Accepted</span>
                  {onUndoApproval && (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground underline hover:text-foreground transition-colors"
                      onClick={handleUndoClick}
                    >
                      <Undo2 className="h-3 w-3 inline mr-0.5" />Undo
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  onClick={handleAcceptClick}
                  type="button"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Accept Section
                </Button>
              )}
            </div>
          )}
        </button>

        {/* ── Panel Body (collapsible) ── */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border/40">
            {/* Empty state placeholder */}
            {isContentEmpty ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 py-10 flex flex-col items-center justify-center gap-2">
                <p className="text-sm text-gray-400 text-center">
                  Click to add content or Generate with AI{" "}
                  <Sparkles className="h-4 w-4 inline text-amber-400" />
                </p>
              </div>
            ) : (
              children
            )}

            {/* Pending modification banner — informational only */}
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

            {/* Visual divider between content and AI review */}
            {aiReviewSlot && filled && (
              <div className="relative my-4">
                <div className="border-t border-dashed border-gray-300" />
                <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-400">
                  vs AI Suggestion
                </span>
              </div>
            )}

            {/* AI Review slot */}
            {aiReviewSlot}

            {/* Expanded inline flags */}
            {inlineFlags && inlineFlags.length > 1 && (
              <div className="mt-2 space-y-1">
                {inlineFlags.slice(1).map((flag, i) => (
                  <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {flag}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fullscreen Modal ── */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="w-[calc(100vw-80px)] max-w-none h-[calc(100vh-80px)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {label}
              {attribution && (
                <span className="text-sm text-muted-foreground font-normal">
                  ({attribution})
                </span>
              )}
              <StatusBadge status={effectiveStatus} />
            </DialogTitle>
          </DialogHeader>

          {/* Read-only banner for locked sections */}
          {isLocked && (
            <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 shrink-0">
              <Eye className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                This section is view-only. Use the Accept Section button in the panel header to approve.
              </p>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            {children}
            {aiReviewSlot}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Accept Section Confirmation Dialog ── */}
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
