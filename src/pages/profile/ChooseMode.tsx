import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderMode } from '@/hooks/queries/useProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Briefcase, Building2, User, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
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

  // Pre-fill from existing data
  useEffect(() => {
    if (provider?.participation_mode_id) {
      setSelectedMode(provider.participation_mode_id);
    }
  }, [provider?.participation_mode_id]);

  const handleContinue = async () => {
    if (!provider?.id) {
      toast.error('Provider profile not found. Please try again.');
      return;
    }

    try {
      await updateMode.mutateAsync({
        providerId: provider.id,
        participationModeId: selectedMode,
      });

      const selected = modes?.find(m => m.id === selectedMode);
      if (selected?.requires_org_info) {
        navigate('/profile/build/organization');
      } else {
        navigate('/profile/build/expertise');
      }
    } catch (error) {
      toast.error('Failed to save participation mode. Please try again.');
      console.error('Error saving mode:', error);
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
            <span>Step 1 of 5</span>
            <span>•</span>
            <span>Participation Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            How Would You Like to Participate?
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose the mode that best describes how you'll engage with clients on our platform.
          </p>
        </div>

        {/* Mode Selection */}
        <RadioGroup value={selectedMode} onValueChange={setSelectedMode} className="space-y-4">
          {modes?.map((mode) => {
            const Icon = modeIcons[mode.code] || User;
            const isSelected = selectedMode === mode.id;

            return (
              <Label
                key={mode.id}
                htmlFor={mode.id}
                className="cursor-pointer"
              >
                <Card
                  className={cn(
                    "transition-all hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={mode.id} id={mode.id} className="mt-1" />
                      
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
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedMode || updateMode.isPending}
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
