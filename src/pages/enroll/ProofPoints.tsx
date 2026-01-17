import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Award, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { useProofPoints, useDeleteProofPoint, useProofPointCountsByIndustry, type ProofPointWithCounts } from '@/hooks/queries/useProofPoints';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useMinProofPointsRequired } from '@/hooks/queries/useLifecycleValidation';
import { 
  useEnrollmentCanModifyField, 
  useEnrollmentIsTerminal 
} from '@/hooks/queries/useEnrollmentExpertise';
import { LockedFieldBanner } from '@/components/enrollment';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { 
  ProofPointCard, 
  ProofPointViewDialog,
  ProfileStrengthMeter, 
  EvidenceRequirementsPanel,
  WhyProofPointsMatter 
} from '@/components/proof-points';
import { toast } from 'sonner';

const DEFAULT_MINIMUM_REQUIRED = 2;

type IndustryFilterMode = 'current' | 'all' | string; // string = specific segment ID

function ProofPointsContent() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  
  // Get active enrollment from context
  const { 
    activeEnrollment, 
    activeEnrollmentId, 
    activeIndustryId,
    enrollments,
    isLoading: enrollmentLoading 
  } = useEnrollmentContext();
  
  // Fetch industry segments for the dropdown
  const { data: industrySegments = [], isLoading: segmentsLoading } = useIndustrySegments();
  
  // Fetch proof point counts by industry
  const { data: industryCounts = [] } = useProofPointCountsByIndustry(provider?.id);
  
  // Industry filter state - default to 'current' (active enrollment's industry)
  const [industryFilter, setIndustryFilter] = useState<IndustryFilterMode>('current');
  
  // Compute effective filter values - using active enrollment's industry
  const { effectiveIndustryId, includeAllIndustries } = useMemo(() => {
    if (industryFilter === 'all') {
      return { effectiveIndustryId: undefined, includeAllIndustries: true };
    }
    if (industryFilter === 'current') {
      return { effectiveIndustryId: activeIndustryId || undefined, includeAllIndustries: false };
    }
    // Specific segment ID selected
    return { effectiveIndustryId: industryFilter, includeAllIndustries: false };
  }, [industryFilter, activeIndustryId]);
  
  // Fetch proof points with industry filter
  const { data: proofPoints = [], isLoading: proofPointsLoading } = useProofPoints(
    provider?.id,
    {
      industrySegmentId: effectiveIndustryId,
      includeAllIndustries,
    }
  );
  const deleteProofPoint = useDeleteProofPoint();
  
  // Get minimum required from system settings
  const minRequiredSetting = useMinProofPointsRequired();
  const minimumRequired = minRequiredSetting ?? DEFAULT_MINIMUM_REQUIRED;

  // Lifecycle validation scoped to enrollment
  const contentCheck = useEnrollmentCanModifyField(activeEnrollmentId ?? undefined, 'content');
  const terminalState = useEnrollmentIsTerminal(activeEnrollmentId ?? undefined);
  const isTerminal = terminalState.isTerminal;
  const isContentLocked = !contentCheck.allowed || isTerminal;
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProofPoint, setSelectedProofPoint] = useState<ProofPointWithCounts | null>(null);
  
  // Build industry name map for displaying on cards
  const industryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    industrySegments.forEach(seg => {
      map[seg.id] = seg.name;
    });
    return map;
  }, [industrySegments]);

  // Build industry count map for dropdown indicators
  const industryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    industryCounts.forEach(ic => {
      if (ic.industrySegmentId) {
        map[ic.industrySegmentId] = ic.count;
      }
    });
    return map;
  }, [industryCounts]);

  // Calculate total proof points across all industries
  const totalProofPoints = useMemo(() => {
    return industryCounts.reduce((sum, ic) => sum + ic.count, 0);
  }, [industryCounts]);

  // Get enrolled industry IDs for filtering the dropdown
  const enrolledIndustryIds = useMemo(() => {
    return enrollments.map(e => e.industry_segment_id);
  }, [enrollments]);

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
    // Navigate to assessment step
    navigate('/enroll/assessment');
  };

  // Check if expertise level is selected for this enrollment
  const hasExpertiseSelected = activeEnrollment?.expertise_level_id != null;

  const handleAddProofPoint = () => {
    if (isContentLocked) {
      toast.error('Content modification is locked at this lifecycle stage.');
      return;
    }
    
    // Must have expertise selected before adding proof points
    if (!hasExpertiseSelected) {
      toast.info('Please select your expertise level first before adding proof points.');
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

  if (providerLoading || proofPointsLoading || enrollmentLoading) {
    return (
      <WizardLayout currentStep={5} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  // Show message if no enrollment is active
  if (!activeEnrollment) {
    return (
      <WizardLayout currentStep={5} onBack={handleBack} hideContinueButton>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Industry Selected</AlertTitle>
          <AlertDescription>
            Please complete industry and expertise selection before adding proof points.
          </AlertDescription>
        </Alert>
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Evidence Portfolio</h2>
                  <p className="text-sm text-muted-foreground">
                    Showcase your expertise with real-world examples and achievements.
                  </p>
                </div>
                {/* Minimum Requirement Status Indicator */}
                <Badge 
                  variant={minimumMet ? "default" : "secondary"}
                  className={`flex items-center gap-1.5 ${
                    minimumMet 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {minimumMet ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {currentCount}/{minimumRequired} minimum
                </Badge>
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

            {/* Industry Filter Dropdown */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Label htmlFor="industry-filter" className="text-sm font-medium whitespace-nowrap">
                Industry Segment:
              </Label>
              <Select
                value={industryFilter}
                onValueChange={(value) => setIndustryFilter(value as IndustryFilterMode)}
                disabled={segmentsLoading}
              >
                <SelectTrigger id="industry-filter" className="w-[320px] bg-background">
                  <SelectValue placeholder="Select industry..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="current">
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span>Current Industry {activeIndustryId ? `(${industryNameMap[activeIndustryId] || 'Selected'})` : ''}</span>
                      {activeIndustryId && industryCountMap[activeIndustryId] !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                          {industryCountMap[activeIndustryId]}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                  <SelectItem value="all">
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span>All Industries</span>
                      {totalProofPoints > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                          {totalProofPoints}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                  {/* Show enrolled industries */}
                  {enrolledIndustryIds.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                        Your enrolled industries:
                      </div>
                      {enrollments.map((enrollment) => {
                        const count = industryCountMap[enrollment.industry_segment_id] || 0;
                        const industryName = industryNameMap[enrollment.industry_segment_id] || 'Unknown';
                        const isPrimary = enrollment.is_primary;
                        return (
                          <SelectItem key={enrollment.industry_segment_id} value={enrollment.industry_segment_id}>
                            <span className="flex items-center justify-between gap-2 w-full">
                              <span className="flex items-center gap-1">
                                {industryName}
                                {isPrimary && <Badge variant="outline" className="text-xs px-1 py-0">Primary</Badge>}
                              </span>
                              {count > 0 && (
                                <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0">
                                  {count}
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
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
                  currentIndustryId={activeIndustryId || undefined}
                  industryName={proof.industry_segment_id ? industryNameMap[proof.industry_segment_id] : undefined}
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

export default function EnrollProofPoints() {
  return (
    <FeatureErrorBoundary featureName="Proof Points">
      <ProofPointsContent />
    </FeatureErrorBoundary>
  );
}
