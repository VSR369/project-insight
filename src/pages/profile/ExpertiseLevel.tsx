import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useExpertiseLevels } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderExpertise } from '@/hooks/queries/useProvider';
import { useCanModifyField, useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment/LockedFieldBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Star, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ExpertiseLevel() {
  const navigate = useNavigate();
  const { data: levels, isLoading: levelsLoading, error: levelsError } = useExpertiseLevels();
  const { data: provider, isLoading: providerLoading, error: providerError } = useCurrentProvider();
  const updateExpertise = useUpdateProviderExpertise();
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;

  // Pre-fill from existing data
  useEffect(() => {
    if (provider?.expertise_level_id) {
      setSelectedLevel(provider.expertise_level_id);
    }
  }, [provider?.expertise_level_id]);

  const handleContinue = async () => {
    if (isLocked) {
      toast.error('This section is locked and cannot be modified.');
      return;
    }

    if (!provider?.id) {
      toast.error('Provider profile not found. Please refresh the page or contact support.');
      return;
    }

    try {
      await updateExpertise.mutateAsync({
        providerId: provider.id,
        expertiseLevelId: selectedLevel,
      });
      navigate('/profile/build/proficiency');
    } catch (error) {
      toast.error('Failed to save expertise level. Please try again.');
      console.error('Error saving expertise:', error);
    }
  };

  // Only show loading for master data (levels) - the core content
  if (levelsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Show error state if levels failed to load
  if (levelsError) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load expertise levels</AlertTitle>
            <AlertDescription>
              Please refresh the page to try again. If the problem persists, contact support.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Determine if provider is missing (not loading but null)
  const providerMissing = !providerLoading && !provider;
  const canContinue = selectedLevel && provider?.id && !updateExpertise.isPending && !isLocked;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 3 of 5</span>
            <span>•</span>
            <span>Expertise Level</span>
            {isLocked && <Lock className="h-3 w-3" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            What's Your Expertise Level?
          </h1>
          <p className="text-muted-foreground mt-2">
            Select the level that best represents your professional experience.
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

        {/* Provider Missing Warning */}
        {providerMissing && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Profile setup incomplete</AlertTitle>
            <AlertDescription>
              Your provider profile is missing. Please refresh the page. If the issue persists, try logging out and back in, or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Provider Loading Indicator */}
        {providerLoading && (
          <Alert className="mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Loading your profile...</AlertTitle>
          </Alert>
        )}

        {/* Level Selection */}
        <RadioGroup 
          value={selectedLevel} 
          onValueChange={isLocked ? undefined : setSelectedLevel}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          disabled={isLocked}
        >
          {levels?.map((level) => {
            const isSelected = selectedLevel === level.id;
            const yearsText = level.max_years 
              ? `${level.min_years}-${level.max_years} years`
              : `${level.min_years}+ years`;

            return (
              <Label
                key={level.id}
                htmlFor={level.id}
                className={cn("cursor-pointer h-full", isLocked && "cursor-not-allowed")}
              >
                <Card
                  className={cn(
                    "h-full transition-all relative overflow-hidden",
                    !isLocked && "hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20",
                    isLocked && "bg-muted/30 opacity-70"
                  )}
                >
                  {/* Level Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={isSelected ? "default" : "secondary"}>
                      Level {level.level_number}
                    </Badge>
                  </div>

                  <CardContent className="p-4 pt-12 flex flex-col h-full">
                    <RadioGroupItem 
                      value={level.id} 
                      id={level.id} 
                      className="sr-only" 
                      disabled={isLocked}
                    />

                    {/* Stars */}
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: level.level_number }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-4 w-4",
                            isSelected ? "fill-primary text-primary" : "fill-muted-foreground/30 text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>

                    {/* Title & Years */}
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {level.name}
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </h3>
                    <span className="text-sm text-primary font-medium mt-1">
                      {yearsText}
                    </span>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-3 flex-1">
                      {level.description}
                    </p>
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
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="gap-2 sm:ml-auto"
          >
            {updateExpertise.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : providerLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
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
