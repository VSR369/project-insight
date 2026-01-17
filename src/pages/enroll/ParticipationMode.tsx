import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useUpdateEnrollmentParticipationMode } from '@/hooks/queries/useEnrollmentParticipationMode';
import { useEnrollmentCanModifyField, useEnrollmentIsTerminal } from '@/hooks/queries/useEnrollmentExpertise';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
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

function ParticipationModeContent() {
  const navigate = useNavigate();
  const { data: modes, isLoading: modesLoading } = useParticipationModes();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { activeEnrollment, activeEnrollmentId, isLoading: enrollmentLoading } = useEnrollmentContext();
  const updateMode = useUpdateEnrollmentParticipationMode();
  const [selectedMode, setSelectedMode] = useState<string>('');

  // CRITICAL: Use ENROLLMENT-scoped lifecycle validation
  const configurationCheck = useEnrollmentCanModifyField(activeEnrollmentId ?? undefined, 'configuration');
  const terminalState = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;

  // Check if there's a pending approval - redirect back to pending page
  // CRITICAL: Use ENROLLMENT organization, not provider organization
  const hasPendingApproval = useMemo(() => {
    if (!activeEnrollment?.organization) return false;
    const status = (activeEnrollment.organization as any)?.approval_status;
    return status === 'pending';
  }, [activeEnrollment?.organization]);

  // Redirect if pending approval exists
  useEffect(() => {
    if (hasPendingApproval) {
      toast.error('You have a pending manager approval. Please wait or cancel the request first.');
      navigate('/enroll/organization-pending');
    }
  }, [hasPendingApproval, navigate]);

  // CRITICAL: Read from ENROLLMENT participation_mode_id, not provider
  useEffect(() => {
    if (activeEnrollment?.participation_mode_id) {
      setSelectedMode(activeEnrollment.participation_mode_id);
    }
  }, [activeEnrollment?.participation_mode_id]);

  const handleBack = () => {
    navigate('/enroll/registration');
  };

  // Persist mode immediately on selection to ENROLLMENT, not provider
  const handleModeChange = async (modeId: string) => {
    if (isLocked || updateMode.isPending || !activeEnrollmentId) return;
    
    // Optimistic UI update
    setSelectedMode(modeId);
    
    // Only persist if enrollment exists and mode actually changed
    if (activeEnrollmentId && modeId !== activeEnrollment?.participation_mode_id) {
      try {
        await updateMode.mutateAsync({
          enrollmentId: activeEnrollmentId,
          participationModeId: modeId,
        });
      } catch {
        // Rollback on error
        setSelectedMode(activeEnrollment?.participation_mode_id || '');
        toast.error('Failed to save mode selection');
      }
    }
  };

  const handleContinue = () => {
    if (!selectedMode) {
      toast.error('Please select a participation mode');
      return;
    }

    // Mode is already saved on selection, just navigate
    const selected = modes?.find(m => m.id === selectedMode);
    if (selected?.requires_org_info) {
      navigate('/enroll/organization');
    } else {
      navigate('/enroll/expertise');
    }
  };

  if (modesLoading || providerLoading || enrollmentLoading) {
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
      canContinue={!!selectedMode && !isLocked && !updateMode.isPending}
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

        {/* Lock Banners */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Participation mode cannot be changed."
          />
        )}
        
        {!isTerminal && !configurationCheck.allowed && (
          <LockedFieldBanner 
            lockLevel="configuration"
            reason={configurationCheck.reason || undefined}
          />
        )}

        {/* Mode Selection */}
        <RadioGroup 
          value={selectedMode} 
          onValueChange={handleModeChange} 
          className="space-y-4"
          disabled={isLocked}
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
                    isSelected && "border-primary ring-2 ring-primary/20"
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
      </div>
    </WizardLayout>
  );
}

export default function EnrollParticipationMode() {
  return (
    <FeatureErrorBoundary featureName="Participation Mode">
      <ParticipationModeContent />
    </FeatureErrorBoundary>
  );
}
