/**
 * ChallengePreferenceToggles — 3 creator preference toggles:
 *   1. Creator Approval Required (AGG toggle / MP mandatory / QUICK hidden)
 *   2. Community Creation (Allowed / Not Allowed)
 *   3. Anonymous Challenge (YES / NO)
 */

import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Shield, Users, EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { GovernanceMode } from '@/lib/governanceMode';
import type { ChallengeFormValues } from './challengeFormSchema';

interface ChallengePreferenceTogglesProps {
  form: UseFormReturn<ChallengeFormValues>;
  selectedMode: GovernanceMode;
  selectedModel: string;
}

export function ChallengePreferenceToggles({
  form,
  selectedMode,
  selectedModel,
}: ChallengePreferenceTogglesProps) {
  const isQuick = selectedMode === 'QUICK';
  const isControlled = selectedMode === 'CONTROLLED';
  const isMp = selectedModel === 'MP';

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Challenge Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Configure approval, collaboration, and visibility settings for this challenge.
        </p>
      </div>

      <div className="space-y-3 max-w-sm">
        {/* ── 1. Creator Approval Required ── */}
        {!isQuick && (
          <Controller
            control={form.control}
            name="creator_approval_required"
            render={({ field }) => {
              const isForced = isControlled || isMp;
              const checked = isForced ? true : !!field.value;

              return (
                <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <Label htmlFor="pref-approval" className="text-sm font-medium text-foreground cursor-pointer">
                        Creator Approval Required
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {isMp
                          ? 'Mandatory for Marketplace model.'
                          : isControlled
                            ? 'Mandatory for Controlled governance.'
                            : 'Require your sign-off before the Curator publishes.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isForced && (
                      <Badge variant="secondary" className="text-[10px]">
                        Mandatory
                      </Badge>
                    )}
                    <Switch
                      id="pref-approval"
                      checked={checked}
                      onCheckedChange={(val) => {
                        if (!isForced) field.onChange(val);
                      }}
                      disabled={isForced}
                    />
                  </div>
                </div>
              );
            }}
          />
        )}

        {/* ── 2. Community Creation ── */}
        <Controller
          control={form.control}
          name="community_creation_allowed"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="pref-community" className="text-sm font-medium text-foreground cursor-pointer">
                    Community Creation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow solvers to form teams or groups for collaborative submissions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xs text-muted-foreground">
                  {field.value ? 'Allowed' : 'Not Allowed'}
                </span>
                <Switch
                  id="pref-community"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </div>
          )}
        />

        {/* ── 3. Anonymous Challenge ── */}
        <Controller
          control={form.control}
          name="is_anonymous"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <EyeOff className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="pref-anonymous" className="text-sm font-medium text-foreground cursor-pointer">
                    Anonymous Challenge
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hide the seeking organization's identity from solvers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-xs text-muted-foreground">
                  {field.value ? 'Yes' : 'No'}
                </span>
                <Switch
                  id="pref-anonymous"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
