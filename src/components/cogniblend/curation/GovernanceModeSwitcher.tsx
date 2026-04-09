/**
 * GovernanceModeSwitcher — Inline governance mode change for Curators during Phase 2.
 * Shows current mode badge + "Change" button → inline select dropdown.
 * Logs changes to audit_trail.
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GovernanceProfileBadge } from "@/components/cogniblend/GovernanceProfileBadge";
import {
  resolveGovernanceMode,
  getAvailableGovernanceModes,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from "@/lib/governanceMode";

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
  const queryClient = useQueryClient();
  const currentMode = resolveGovernanceMode(currentProfile);
  const availableModes = getAvailableGovernanceModes(orgTierCode ?? "premium");
  const isPhase2 = currentPhase === 2;
  const canEdit = isPhase2 && availableModes.length > 1;

  const mutation = useMutation({
    mutationFn: async (newMode: GovernanceMode) => {
      const oldMode = currentMode;

      // Update challenge
      const { error } = await supabase
        .from("challenges")
        .update({
          governance_mode_override: newMode,
          updated_by: userId ?? null,
        } as any)
        .eq("id", challengeId);
      if (error) throw new Error(error.message);

      // Audit trail
      await supabase.from("audit_trail").insert({
        action: "governance_mode_changed",
        challenge_id: challengeId,
        user_id: userId!,
        method: "curator_manual",
        details: {
          old_mode: oldMode,
          new_mode: newMode,
          changed_by: userId,
        },
      } as any);
    },
    onSuccess: (_data, newMode) => {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["curation-legal-summary", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["curation-escrow", challengeId] });
      toast.success(`Governance changed to ${newMode}. Validation rules updated.`);
      setEditing(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to change governance: ${err.message}`);
    },
  });

  const handleChange = (value: string) => {
    const newMode = value as GovernanceMode;
    if (newMode === currentMode) {
      setEditing(false);
      return;
    }
    mutation.mutate(newMode);
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
