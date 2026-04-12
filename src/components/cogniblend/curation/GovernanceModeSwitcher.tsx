/**
 * GovernanceModeSwitcher — Inline governance mode change for Curators during Phase 2.
 * Shows current mode badge + "Change" button → inline select dropdown.
 * Logs changes to audit_trail via useGovernanceModeMutation hook.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { GovernanceProfileBadge } from "@/components/cogniblend/GovernanceProfileBadge";
import {
  resolveGovernanceMode,
  getAvailableGovernanceModes,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from "@/lib/governanceMode";
import { useGovernanceModeMutation } from "@/hooks/cogniblend/useGovernanceModeMutation";

interface GovernanceModeSwitcherProps {
  challengeId: string;
  /** governance_mode_override ?? governance_profile */
  currentProfile: string | null;
  currentPhase: number | null;
  phaseStatus: string | null;
  orgTierCode?: string | null;
  userId?: string;
}

export function GovernanceModeSwitcher({
  challengeId,
  currentProfile,
  currentPhase,
  phaseStatus,
  orgTierCode,
  userId,
}: GovernanceModeSwitcherProps) {
  const [editing, setEditing] = useState(false);
  const currentMode = resolveGovernanceMode(currentProfile);
  const availableModes = getAvailableGovernanceModes(orgTierCode ?? "premium");
  const isPhase2 = currentPhase === 2;
  const canEdit = isPhase2 && availableModes.length > 1;

  const mutation = useGovernanceModeMutation({ challengeId, currentMode, userId });

  const handleChange = (value: string) => {
    const newMode = value as GovernanceMode;
    if (newMode === currentMode) {
      setEditing(false);
      return;
    }
    mutation.mutate(newMode, { onSuccess: () => setEditing(false) });
  };

  return (
    <div className="flex items-center gap-2">
      <GovernanceProfileBadge profile={currentProfile} compact />
      {canEdit && !editing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
      {editing && (
        <div className="flex items-center gap-1.5">
          <Select
            value={currentMode}
            onValueChange={handleChange}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModes.map((mode) => (
                <SelectItem key={mode} value={mode} className="text-xs">
                  {GOVERNANCE_MODE_CONFIG[mode].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={() => setEditing(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
