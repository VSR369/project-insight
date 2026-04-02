/**
 * SectionPanelHeader — Header row for CuratorSectionPanel.
 * Extracted from CuratorSectionPanel.tsx.
 */

import React from "react";
import type { AiActionType } from "@/types/sections";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Undo2,
  Sparkles,
} from "lucide-react";
import { getSectionDisplayName, getLockedSectionRole } from "@/lib/cogniblend/sectionDependencies";
import { StatusBadge } from "./CuratorSectionStatusBadge";
import type { SectionStatus } from "./CuratorSectionPanel";

interface SectionPanelHeaderProps {
  sectionKey: string;
  label: string;
  attribution?: string;
  filled: boolean;
  effectiveStatus: SectionStatus;
  isExpanded: boolean;
  isLocked: boolean;
  isReadOnly: boolean;
  isApproved: boolean;
  isCuratorAccepted: boolean;
  onToggleApproval: () => void;
  onToggleExpand: () => void;
  onFullscreen: () => void;
  onAcceptClick: (e: React.MouseEvent) => void;
  onUndoClick: (e: React.MouseEvent) => void;
  onUndoApproval?: () => void;
  promptSource?: "supervisor" | "default" | null;
  inlineFlags?: string[];
  status: SectionStatus;
  staleBecauseOf?: string[];
  staleAt?: string | null;
  staleTimeAgo: string | null;
  aiAction?: AiActionType;
}

export function SectionPanelHeader({
  sectionKey,
  label,
  attribution,
  filled,
  effectiveStatus,
  isExpanded,
  isLocked,
  isReadOnly,
  isApproved,
  isCuratorAccepted,
  onToggleApproval,
  onToggleExpand,
  onFullscreen,
  onAcceptClick,
  onUndoClick,
  onUndoApproval,
  promptSource,
  inlineFlags,
  status,
  staleBecauseOf,
  staleAt,
  staleTimeAgo,
  aiAction,
}: SectionPanelHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggleExpand}
      className={cn(
        "w-full flex flex-col gap-0 px-4 py-3 text-left transition-colors",
        "hover:bg-muted/40",
        isExpanded && "bg-muted/20",
      )}
    >
      {/* Row 1: Primary */}
      <div className="flex items-center gap-2 w-full">
        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}

        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isApproved} onCheckedChange={onToggleApproval} className="shrink-0" disabled={isReadOnly} />
        </div>

        {filled ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}

        <span className="text-sm font-medium truncate flex-1">{label}</span>

        <StatusBadge status={effectiveStatus} />

        {aiAction === 'generate' && (
          <Badge className="gap-1 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-transparent">
            <Sparkles className="h-3 w-3" />AI Generated
          </Badge>
        )}

        <div onClick={(e) => { e.stopPropagation(); onFullscreen(); }} className="shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" tabIndex={-1} type="button">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLocked && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            {isCuratorAccepted ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">Accepted</span>
                {onUndoApproval && (
                  <button type="button" className="text-[11px] text-muted-foreground underline hover:text-foreground transition-colors" onClick={onUndoClick}>
                    <Undo2 className="h-3 w-3 inline mr-0.5" />Undo
                  </button>
                )}
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-[11px] px-2" onClick={onAcceptClick} type="button">
                <ShieldCheck className="h-3 w-3 mr-1" />Accept Section
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Secondary metadata */}
      {(attribution || promptSource || (inlineFlags && inlineFlags.length > 0) || isLocked || (status === "stale" && staleBecauseOf && staleBecauseOf.length > 0)) && (
        <div className="flex flex-col gap-1 ml-[4.5rem] mt-1">
          <div className="flex items-center gap-2">
            {attribution && (
              <Badge className="bg-muted text-muted-foreground border-border text-[11px] px-1.5 py-0 hover:bg-muted shrink-0">{attribution}</Badge>
            )}
            {promptSource === "supervisor" && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] px-1.5 py-0 hover:bg-emerald-50 shrink-0">✅ Supervisor</Badge>
            )}
            {promptSource === "default" && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] px-1.5 py-0 hover:bg-amber-50 shrink-0">⚠️ Default AI</Badge>
            )}
            {isLocked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            {inlineFlags && inlineFlags.length > 0 && (
              <span className="text-[11px] text-amber-700 truncate shrink min-w-0 max-w-[200px]">
                <AlertTriangle className="h-3 w-3 inline mr-0.5" />{inlineFlags[0]}
              </span>
            )}
          </div>

          {status === "stale" && staleBecauseOf && staleBecauseOf.length > 0 && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1">
              <span className="opacity-70">Changed upstream:</span>{' '}
              {staleBecauseOf.map(k => getSectionDisplayName(k)).join(', ')}
              {staleTimeAgo && <span className="opacity-60">({staleTimeAgo})</span>}
              {isLocked && getLockedSectionRole(sectionKey) && (
                <span className="ml-1 text-amber-700 font-medium">— requires {getLockedSectionRole(sectionKey)} re-review</span>
              )}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
