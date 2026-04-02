/**
 * PrerequisiteBanner — Shows prerequisite group completion warning.
 *
 * Extracted from CurationSectionList.tsx (Batch 1).
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { SECTION_MAP, GROUPS } from "@/lib/cogniblend/curationSectionDefs";

interface PrerequisiteBannerProps {
  groupId: string;
  groupReadiness: { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number };
  dismissed: boolean;
  onDismiss: () => void;
  onNavigateToGroup: (groupId: string) => void;
}

export function PrerequisiteBanner({
  groupId, groupReadiness, dismissed, onDismiss, onNavigateToGroup,
}: PrerequisiteBannerProps) {
  if (groupReadiness.ready || dismissed) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          Complete prerequisite sections first for best AI results
        </p>
        <p className="text-xs text-amber-600 mt-1">
          The sections in <strong>{groupReadiness.missingPrereqs.join(", ")}</strong> should be completed before this tab.
          AI review and suggestions will be more accurate when prerequisite content exists.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {groupReadiness.missingPrereqSections.slice(0, 4).map((sk) => {
            const sec = SECTION_MAP.get(sk);
            if (!sec) return null;
            return (
              <Button
                key={sk}
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => {
                  const targetGroup = GROUPS.find((g) => g.sectionKeys.includes(sk));
                  if (targetGroup) onNavigateToGroup(targetGroup.id);
                }}
              >
                → Complete {sec.label}
              </Button>
            );
          })}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-amber-600 shrink-0"
        onClick={onDismiss}
      >
        Continue anyway
      </Button>
    </div>
  );
}
