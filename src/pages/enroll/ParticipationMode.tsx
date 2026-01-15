import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderMode } from '@/hooks/queries/useProvider';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Briefcase, Building2, User, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const modeIcons: Record<string, typeof Briefcase> = {
  independent: Briefcase,
  org_rep: Building2,
  individual_self: User,
};

export default function EnrollParticipationMode() {
  const navigate = useNavigate();
  const { data: modes, isLoading: modesLoading } = useParticipationModes();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const updateMode = useUpdateProviderMode();
  const [selectedMode, setSelectedMode] = useState<string>('');

  useEffect(() => {
    if (provider?.participation_mode_id) {
      setSelectedMode(provider.participation_mode_id);
    }
  }, [provider?.participation_mode_id]);

  const handleBack = () => {
    navigate('/enroll/registration');
  };

  const handleContinue = async () => {
    if (!selectedMode) {
      toast.error('Please select a participation mode');
      return;
    }

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
        navigate('/enroll/organization');
      } else {
        navigate('/enroll/expertise');
      }
    } catch (error) {
      toast.error('Failed to save participation mode. Please try again.');
      console.error('Error saving mode:', error);
    }
  };

  if (modesLoading || providerLoading) {
    return (
      <WizardLayout currentStep={2} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      currentStep={2}
      onBack={handleBack}
      onContinue={handleContinue}
      isSubmitting={updateMode.isPending}
      canContinue={!!selectedMode}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
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
      </div>
    </WizardLayout>
  );
}
