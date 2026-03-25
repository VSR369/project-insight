/**
 * SectionCard — Reusable collapsible card with status badge, action bar, and full-screen expand.
 * Used across curation, spec, and publication pages for consistent section rendering.
 */

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Check,
  ChevronDown,
  Maximize2,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SectionCardStatus = "draft" | "ai_generated" | "accepted" | "editing";

export interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  status: SectionCardStatus;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  onAccept?: () => void;
  onDecline?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  hideActions?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Status badge config                                                */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  SectionCardStatus,
  { label: string; className: string; icon?: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  ai_generated: {
    label: "AI Generated",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: <Sparkles className="h-3 w-3" />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    icon: <Check className="h-3 w-3" />,
  },
  editing: {
    label: "Editing",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: <Pencil className="h-3 w-3" />,
  },
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadgeInternal({ status }: { status: SectionCardStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs font-medium", cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

interface ActionBarProps {
  onAccept?: () => void;
  onDecline?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

function ActionBar({ onAccept, onDecline, onEdit, onRegenerate }: ActionBarProps) {
  const hasAny = onAccept || onDecline || onEdit || onRegenerate;
  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
      {onAccept && (
        <Button
          size="sm"
          className="text-white bg-emerald-600 hover:bg-emerald-700"
          onClick={onAccept}
        >
          <Check className="h-4 w-4" />
          Accept suggestion
        </Button>
      )}
      {onEdit && (
        <Button variant="outline" size="sm" className="border-blue-400 text-blue-600 hover:bg-blue-50" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit & Accept
        </Button>
      )}
      {onDecline && (
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300 text-foreground hover:bg-muted"
          onClick={onDecline}
        >
          Keep original
        </Button>
      )}
      {onRegenerate && (
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
          <Sparkles className="h-3.5 w-3.5" />
          AI Regenerate
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionCard                                                        */
/* ------------------------------------------------------------------ */

const SectionCard = React.memo(
  ({
    icon,
    title,
    status,
    defaultExpanded = true,
    children,
    onAccept,
    onDecline,
    onEdit,
    onRegenerate,
    hideActions = false,
    className,
  }: SectionCardProps) => {
    const [isOpen, setIsOpen] = useState(defaultExpanded);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const actionProps: ActionBarProps = { onAccept, onDecline, onEdit, onRegenerate };

    return (
      <>
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
          <div
            className={cn(
              "rounded-xl border bg-card shadow-sm",
              status === "accepted"
                ? "border-primary/30 bg-primary/5"
                : "border-border"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-6 pb-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                >
                  <span className="shrink-0 text-muted-foreground">{icon}</span>
                  <span className="font-semibold text-foreground">{title}</span>
                  <StatusBadgeInternal status={status} />
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => setIsFullScreen(true)}
                aria-label="Expand to full screen"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Collapsible body */}
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="space-y-4 p-6">
                {children}
                {!hideActions && <ActionBar {...actionProps} />}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Full-screen modal */}
        <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-3">
                <span className="text-muted-foreground">{icon}</span>
                {title}
                <StatusBadgeInternal status={status} />
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
              {children}
            </div>

            {!hideActions && (
              <div className="shrink-0">
                <ActionBar {...actionProps} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
SectionCard.displayName = "SectionCard";

export { SectionCard };
