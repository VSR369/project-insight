/**
 * CuratorSectionPanel — Collapsible panel shell for each curator section.
 *
 * Features:
 * - Inline expand/collapse with chevron toggle
 * - Fullscreen modal overlay (⤢ button)
 * - Status badge (gray/amber/red/green/blue)
 * - AI Review button slot (hidden for locked sections)
 * - Approve / Send for Modification buttons for locked sections
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
} from "@/components/ui/dialog";
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
  MessageSquare,
  Clock,
} from "lucide-react";
import { SECTION_FORMAT_CONFIG, AI_REVIEW_DISABLED_SECTIONS } from "@/lib/cogniblend/curationSectionFormats";
import { SendForModificationModal } from "./SendForModificationModal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectionStatus = "not_reviewed" | "pass" | "warning" | "needs_revision" | "view_only" | "pending_modification" | "curator_approved";

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
}

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
    case "pending_modification":
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-[10px] hover:bg-orange-100">
          <Clock className="h-3 w-3 mr-1" />Pending Modification
        </Badge>
      );
    case "curator_approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
          <ShieldCheck className="h-3 w-3 mr-1" />Curator Approved
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
  challengeId,
  inlineFlags,
  children,
  aiReviewSlot,
  defaultExpanded,
  sectionActions,
  promptSource,
}: CuratorSectionPanelProps) {
  const [showModificationModal, setShowModificationModal] = useState(false);
  // ── Expand/collapse state with localStorage persistence ──
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = loadExpandState(challengeId);
    if (saved[sectionKey] !== undefined) return saved[sectionKey];
    // Auto-expand if warnings/blocks or defaultExpanded
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

  // Auto-expand on status change to warning/needs_revision
  useEffect(() => {
    if (defaultExpanded && !isExpanded) {
      setIsExpanded(true);
      const state = loadExpandState(challengeId);
      state[sectionKey] = true;
      saveExpandState(challengeId, state);
    }
  }, [defaultExpanded]); // intentionally limited deps

  const effectiveStatus: SectionStatus = (() => {
    if (isLocked) {
      // Check if there's a pending modification request
      const pendingMod = sectionActions?.find(a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending"));
      if (pendingMod) return "pending_modification";
      // Check if curator approved this locked section
      const approved = sectionActions?.find(a => a.action_type === "approval" && a.status === "approved");
      if (approved) return "curator_approved";
      return "view_only";
    }
    return status;
  })();

  // Most recent pending modification
  const pendingModification = sectionActions?.find(
    a => a.action_type === "modification_request" && (a.status === "sent" || a.status === "pending")
  );
  const isCuratorApproved = sectionActions?.some(
    a => a.action_type === "approval" && a.status === "approved"
  ) ?? false;

  return (
    <>
      <div className="border border-border rounded-lg overflow-hidden">
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
            <span className="text-[10px] text-muted-foreground font-normal shrink-0">
              ({attribution})
            </span>
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
        </button>

        {/* ── Panel Body (collapsible) ── */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border/40">
            {children}

            {/* Locked section action buttons (Legal Docs / Escrow) */}
            {isLocked && !isReadOnly && (
              <div className="mt-4 space-y-3">
                {/* Pending modification banner */}
                {pendingModification && (
                  <div className="flex items-start gap-2 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-2">
                    <Clock className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-800 dark:text-orange-300">Modification Request Sent</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
                        Priority: <span className="capitalize">{pendingModification.priority}</span> — Sent {new Date(pendingModification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Curator approved banner */}
                {isCuratorApproved && !pendingModification && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">This section has been approved by the curator.</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {!isCuratorApproved && !pendingModification && onApproveSection && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={onApproveSection}
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                      Approve Section
                    </Button>
                  )}
                  {!pendingModification && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowModificationModal(true)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Send for Modification
                    </Button>
                  )}
                </div>
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
                This section is view-only — use the buttons below to approve or request modifications.
              </p>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            {children}
            {aiReviewSlot}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Send for Modification Modal ── */}
      <SendForModificationModal
        open={showModificationModal}
        onOpenChange={setShowModificationModal}
        challengeId={challengeId}
        sectionKey={sectionKey}
        sectionLabel={label}
      />
    </>
  );
}
