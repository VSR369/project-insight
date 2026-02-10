/**
 * Engagement Model Tab (ORG-001)
 * 
 * Shows current engagement model with switching for Basic tier.
 * BR-MSL-001: Active challenges block model switching.
 * BR-ENG-001: Only Basic tier can switch models.
 */

import { useState } from 'react';
import { Shuffle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

import {
  useOrgSubscription,
  useActiveChallenges,
  useSwitchEngagementModel,
} from '@/hooks/queries/useOrgSettings';
import { useEngagementModels } from '@/hooks/queries/usePlanSelectionData';
import { validateModelSwitch } from '@/services/orgSettingsService';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface EngagementModelTabProps {
  organizationId: string;
}

export function EngagementModelTab({ organizationId }: EngagementModelTabProps) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: subscription, isLoading: subLoading } = useOrgSubscription(organizationId);
  const { data: models, isLoading: modelsLoading } = useEngagementModels();
  const { data: activeChallenges = [] } = useActiveChallenges(organizationId);
  const switchModel = useSwitchEngagementModel();

  if (subLoading || modelsLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!subscription) {
    return <div className="text-center py-12 text-muted-foreground">No active subscription found.</div>;
  }

  const currentTier = subscription.md_subscription_tiers as any;
  const currentModel = subscription.md_engagement_models as any;
  const validation = validateModelSwitch(currentTier?.code || '', activeChallenges);

  const handleConfirmSwitch = async () => {
    if (!selectedModelId) return;
    await switchModel.mutateAsync({
      subscriptionId: subscription.id,
      organizationId,
      newModelId: selectedModelId,
    });
    setShowConfirm(false);
    setSelectedModelId(null);
  };

  return (
    <div className="space-y-8">
      {/* Current Model */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shuffle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Current Engagement Model</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-foreground font-medium text-lg">{currentModel?.name ?? 'Not set'}</span>
          {currentModel?.code && (
            <Badge variant="outline" className="text-xs">{currentModel.code}</Badge>
          )}
        </div>
        {currentModel?.description && (
          <p className="text-sm text-muted-foreground mt-2">{currentModel.description}</p>
        )}
      </div>

      {/* Validation Status */}
      {!validation.canSwitch && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Model Switching Unavailable
          </div>
          <p className="text-sm text-muted-foreground">{validation.reason}</p>
          {validation.blockingChallenges && validation.blockingChallenges.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active challenges:</p>
              {validation.blockingChallenges.map((c) => (
                <div key={c.id} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                  {c.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Selector */}
      {validation.canSwitch && models && models.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Switch Engagement Model</h3>
          <RadioGroup
            value={selectedModelId || subscription.engagement_model_id || ''}
            onValueChange={(val) => setSelectedModelId(val)}
            className="space-y-3"
          >
            {models.map((model) => {
              const isCurrent = model.id === subscription.engagement_model_id;
              return (
                <Label
                  key={model.id}
                  htmlFor={`model-${model.id}`}
                  className={cn(
                    'flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all',
                    (selectedModelId === model.id || (isCurrent && !selectedModelId))
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <RadioGroupItem id={`model-${model.id}`} value={model.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{model.name}</span>
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Current
                        </Badge>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                    )}
                  </div>
                </Label>
              );
            })}
          </RadioGroup>

          <div className="flex justify-end pt-6">
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedModelId || selectedModelId === subscription.engagement_model_id}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Switch Model
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Engagement Model?</AlertDialogTitle>
            <AlertDialogDescription>
              You are changing from <strong>{currentModel?.name}</strong> to{' '}
              <strong>{models?.find(m => m.id === selectedModelId)?.name}</strong>.
              This takes effect immediately for all new challenges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch} disabled={switchModel.isPending}>
              {switchModel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
