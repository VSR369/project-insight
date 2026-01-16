import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Award, Loader2 } from 'lucide-react';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProofPoints, useDeleteProofPoint, type ProofPointWithCounts } from '@/hooks/queries/useProofPoints';
import { useCanModifyField, useIsTerminalState, useMinProofPointsRequired } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment';
import { 
  ProofPointCard, 
  ProofPointViewDialog,
  ProfileStrengthMeter, 
  EvidenceRequirementsPanel,
  WhyProofPointsMatter 
} from '@/components/proof-points';
import { toast } from 'sonner';

const DEFAULT_MINIMUM_REQUIRED = 2;

export default function EnrollProofPoints() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: proofPoints = [], isLoading: proofPointsLoading } = useProofPoints(provider?.id);
  const deleteProofPoint = useDeleteProofPoint();
  
  // Get minimum required from system settings
  const minRequiredSetting = useMinProofPointsRequired();
  const minimumRequired = minRequiredSetting ?? DEFAULT_MINIMUM_REQUIRED;

  // Lifecycle validation
  const contentCheck = useCanModifyField('content');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isContentLocked = !contentCheck.allowed || isTerminal;
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProofPoint, setSelectedProofPoint] = useState<ProofPointWithCounts | null>(null);

  const currentCount = proofPoints.length;
  const minimumMet = currentCount >= minimumRequired;
  const canDelete = currentCount > minimumRequired;

  const handleBack = () => {
    navigate('/enroll/expertise');
  };

  const handleContinue = () => {
    if (!minimumMet) {
      toast.error(`Please add at least ${minimumRequired} proof points to continue.`);
      return;
    }
    // Navigate to next step (assessment or completion)
    navigate('/dashboard');
    toast.success('Profile section completed!');
  };

  const handleAddProofPoint = () => {
    if (isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      return;
    }
    navigate('/enroll/proof-points/add');
  };

  const handleView = (proofPoint: ProofPointWithCounts) => {
    setSelectedProofPoint(proofPoint);
    setViewDialogOpen(true);
  };

  const handleEdit = (proofPoint: ProofPointWithCounts) => {
    if (isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      return;
    }
    navigate(`/enroll/proof-points/edit/${proofPoint.id}`);
  };

  const handleDelete = async (proofPoint: ProofPointWithCounts) => {
    if (!provider?.id) return;
    
    if (isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      return;
    }

    if (!canDelete) {
      toast.error(`Minimum ${minimumRequired} proof points required. Add a new one before deleting.`);
      return;
    }

    if (confirm('Are you sure you want to delete this proof point?')) {
      try {
        await deleteProofPoint.mutateAsync({ id: proofPoint.id, providerId: provider.id });
      } catch (error) {
        // Error is already handled by the mutation's onError
        console.error('Delete error:', error);
      }
    }
  };
  
  const handleEditFromDialog = () => {
    if (selectedProofPoint) {
      if (isContentLocked) {
        toast.error('Content modification is locked at this lifecycle stage.');
        return;
      }
      navigate(`/enroll/proof-points/edit/${selectedProofPoint.id}`);
    }
  };

  if (providerLoading || proofPointsLoading) {
    return (
      <WizardLayout currentStep={5} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      currentStep={5}
      onBack={handleBack}
      onContinue={handleContinue}
      continueLabel={minimumMet ? 'Continue to Share Knowledge' : `Add ${minimumRequired - currentCount} More to Continue`}
      canContinue={minimumMet}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Strengthen Your Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Your assessment provides a solid foundation, but adding real-world proof points will unlock premium opportunities and build seeker confidence.
          </p>
        </div>

        {/* Lock Banners */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Proof points cannot be modified."
          />
        )}
        
        {!isTerminal && !contentCheck.allowed && (
          <LockedFieldBanner 
            lockLevel="content"
            reason={contentCheck.reason || undefined}
          />
        )}

        {/* Why Proof Points Matter + What Makes Strong Proof Points */}
        <WhyProofPointsMatter />

        {/* Requirements Panels */}
        <EvidenceRequirementsPanel 
          currentCount={currentCount} 
          minimumRequired={minimumRequired}
        />

        {/* Profile Strength */}
        <ProfileStrengthMeter 
          currentCount={currentCount}
          minimumRequired={minimumRequired}
        />

        {/* Evidence Portfolio Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Evidence Portfolio</h2>
              <p className="text-sm text-muted-foreground">
                Showcase your expertise with real-world examples and achievements.
              </p>
            </div>
            <Button 
              onClick={handleAddProofPoint} 
              className="gap-2"
              disabled={isContentLocked}
            >
              <Plus className="h-4 w-4" />
              Add Proof Point
            </Button>
          </div>

          {/* Proof Points List */}
          {currentCount === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Award className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No Proof Points Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add at least {minimumRequired} proof points to continue to the Share Knowledge assessment.
                </p>
                <Button 
                  onClick={handleAddProofPoint} 
                  className="gap-2"
                  disabled={isContentLocked}
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Proof Point
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proofPoints.map((proof, index) => (
                <ProofPointCard
                  key={proof.id}
                  proofPoint={proof}
                  onView={handleView}
                  onEdit={isContentLocked ? undefined : handleEdit}
                  onDelete={isContentLocked || !canDelete ? undefined : handleDelete}
                  animationDelay={index * 50}
                />
              ))}
              
              {/* Minimum constraint info */}
              {!canDelete && currentCount > 0 && !isContentLocked && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Minimum {minimumRequired} proof points required. Add more to enable deletion.
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          You can add more proof points later from your profile settings.
        </p>
      </div>

      {/* View Dialog */}
      <ProofPointViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        proofPoint={selectedProofPoint}
        onEdit={isContentLocked ? undefined : handleEditFromDialog}
      />
    </WizardLayout>
  );
}
