import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderMode } from '@/hooks/queries/useProvider';
import { useCanModifyField, useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment/LockedFieldBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Briefcase, Building2, User, ArrowRight, ArrowLeft, Loader2, CheckCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const modeIcons: Record<string, typeof Briefcase> = {
  independent: Briefcase,
  org_rep: Building2,
  individual_self: User,
};

export default function ChooseMode() {
  const navigate = useNavigate();
  const { data: modes, isLoading: modesLoading } = useParticipationModes();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const updateMode = useUpdateProviderMode();
  const [selectedMode, setSelectedMode] = useState<string>('');

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;

  // Pre-fill from existing data
  useEffect(() => {
    if (provider?.participation_mode_id) {
      setSelectedMode(provider.participation_mode_id);
    }
  }, [provider?.participation_mode_id]);

  // Persist mode immediately on selection for proper navigation guards
  const handleModeChange = async (modeId: string) => {
    if (isLocked || updateMode.isPending) return;
    
    // Optimistic UI update
    setSelectedMode(modeId);
    
    // Only persist if provider exists and mode actually changed
    if (provider?.id && modeId !== provider.participation_mode_id) {
      try {
        await updateMode.mutateAsync({
          providerId: provider.id,
          participationModeId: modeId,
        });
      } catch (error) {
        // Rollback on error
        setSelectedMode(provider.participation_mode_id || '');
        toast.error('Failed to save mode selection');
        console.error('Error saving mode:', error);
      }
    }
  };

  const handleContinue = () => {
    if (isLocked) {
      toast.error('This section is locked and cannot be modified.');
      return;
    }

    if (!selectedMode) {
      toast.error('Please select a participation mode');
      return;
    }

    // Mode is already saved on selection, just navigate
    const selected = modes?.find(m => m.id === selectedMode);
    if (selected?.requires_org_info) {
      navigate('/profile/build/organization');
    } else {
      navigate('/profile/build/expertise');
    }
  };

  if (modesLoading || providerLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 2 of 6</span>
            <span>•</span>
            <span>Participation Mode</span>
            {isLocked && <Lock className="h-3 w-3" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            How Would You Like to Participate?
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose the mode that best describes how you'll engage with clients on our platform.
          </p>
        </div>

        {/* Lock Banner */}
        {isLocked && (
          <LockedFieldBanner
            lockLevel={isTerminal ? 'everything' : configurationCheck.lockLevel || 'configuration'}
            reason={configurationCheck.reason}
            className="mb-6"
          />
        )}

        {/* Mode Selection */}
        <RadioGroup 
          value={selectedMode} 
          onValueChange={handleModeChange} 
          className="space-y-4"
          disabled={isLocked || updateMode.isPending}
        >
          {modes?.map((mode) => {
            const Icon = modeIcons[mode.code] || User;
            const isSelected = selectedMode === mode.id;

            return (
              <Label
                key={mode.id}
                htmlFor={mode.id}
                className={cn("cursor-pointer", isLocked && "cursor-not-allowed opacity-60")}
              >
                <Card
                  className={cn(
                    "transition-all",
                    !isLocked && "hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20",
                    isLocked && "bg-muted/30"
                  )}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem 
                        value={mode.id} 
                        id={mode.id} 
                        className="mt-1" 
                        disabled={isLocked}
                      />
                      
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{mode.name}</h3>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode.description}
                        </p>
                        {mode.requires_org_info && (
                          <span className="inline-block mt-2 text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                            Requires organization details
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            );
          })}
        </RadioGroup>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/profile/build/registration')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedMode || updateMode.isPending || isLocked}
            className="gap-2 sm:ml-auto"
          >
            {updateMode.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
