import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useExpertiseLevels } from '@/hooks/queries/useMasterData';
import { 
  useCurrentProvider, 
  useUpdateProviderExpertise,
  useProviderProficiencyAreas,
  useUpdateProviderProficiencyAreas 
} from '@/hooks/queries/useProvider';
import { useProficiencyTaxonomy } from '@/hooks/queries/useProficiencyTaxonomy';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { useCanModifyField, useIsTerminalState, useCascadeImpact } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner, CascadeWarningDialog } from '@/components/enrollment';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle, Star, AlertCircle, FolderOpen, ChevronDown, ChevronUp, Tag, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EnrollExpertise() {
  const navigate = useNavigate();
  const { data: levels, isLoading: levelsLoading, error: levelsError } = useExpertiseLevels();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();
  const updateExpertise = useUpdateProviderExpertise();
  const updateProficiencyAreas = useUpdateProviderProficiencyAreas();
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [expandedSubDomains, setExpandedSubDomains] = useState<string[]>([]);

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;
  const { impact: expertiseCascadeImpact } = useCascadeImpact('expertise_level_id');

  // Cascade warning state
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [pendingCascadeData, setPendingCascadeData] = useState<{
    newLevelId: string;
    previousLevelId: string;
    impact: { specialtyProofPointsCount: number; proficiencyAreasCount: number; specialitiesCount: number; generalProofPointsCount: number };
  } | null>(null);

  // Fetch existing proficiency area selections
  const { data: existingAreas } = useProviderProficiencyAreas(provider?.id);

  // Filter out Level 0 for experienced professionals (non-students)
  const filteredLevels = useMemo(() => {
    if (!levels) return [];
    // If user is NOT a student, filter out Level 0
    if (!provider?.is_student) {
      return levels.filter(level => level.level_number !== 0);
    }
    return levels;
  }, [levels, provider?.is_student]);

  // Fetch taxonomy when level is selected
  const { data: taxonomy, isLoading: taxonomyLoading } = useProficiencyTaxonomy(
    provider?.industry_segment_id ?? undefined,
    selectedLevel || undefined
  );

  useEffect(() => {
    if (provider?.expertise_level_id) {
      setSelectedLevel(provider.expertise_level_id);
    }
  }, [provider?.expertise_level_id]);

  // Load existing selected areas when data is available
  useEffect(() => {
    if (existingAreas && existingAreas.length > 0) {
      setSelectedAreas(existingAreas);
    }
  }, [existingAreas]);

  // Reset expanded state when level changes (but not selected areas - those are handled by cascade)
  useEffect(() => {
    setExpandedAreas([]);
    setExpandedSubDomains([]);
  }, [selectedLevel]);

  const handleBack = () => {
    const selectedMode = participationModes?.find(m => m.id === provider?.participation_mode_id);
    if (selectedMode?.requires_org_info) {
      navigate('/enroll/organization');
    } else {
      navigate('/enroll/participation-mode');
    }
  };

  // Save proficiency areas to DB
  const saveProficiencyAreas = useCallback(async (newAreas: string[], previousAreas: string[]) => {
    if (!provider?.id) return false;
    
    try {
      await updateProficiencyAreas.mutateAsync({
        providerId: provider.id,
        proficiencyAreaIds: newAreas,
      });
      return true;
    } catch (error) {
      setSelectedAreas(previousAreas);
      toast.error('Failed to save proficiency area selection. Please try again.');
      return false;
    }
  }, [provider?.id, updateProficiencyAreas]);

  const handleAreaToggle = async (areaId: string, checked: boolean) => {
    if (isLocked || updateProficiencyAreas.isPending) return;
    
    const previousAreas = [...selectedAreas];
    let newAreas: string[];
    
    if (checked) {
      newAreas = [...selectedAreas, areaId];
      setSelectedAreas(newAreas);
      
      // Auto-expand the selected area and all its sub-domains
      setExpandedAreas(prev => prev.includes(areaId) ? prev : [...prev, areaId]);
      
      // Find the area and expand all its sub-domains
      const area = taxonomy?.find(a => a.id === areaId);
      if (area) {
        const subDomainIds = area.subDomains.map(sd => sd.id);
        setExpandedSubDomains(prev => {
          const newExpanded = [...prev];
          subDomainIds.forEach(id => {
            if (!newExpanded.includes(id)) {
              newExpanded.push(id);
            }
          });
          return newExpanded;
        });
      }
    } else {
      newAreas = selectedAreas.filter(id => id !== areaId);
      setSelectedAreas(newAreas);
      // Optionally collapse when deselected (user can re-expand if needed)
      setExpandedAreas(prev => prev.filter(id => id !== areaId));
      
      // Collapse sub-domains of this area
      const area = taxonomy?.find(a => a.id === areaId);
      if (area) {
        const subDomainIds = area.subDomains.map(sd => sd.id);
        setExpandedSubDomains(prev => prev.filter(id => !subDomainIds.includes(id)));
      }
    }
    
    // Save to DB immediately
    await saveProficiencyAreas(newAreas, previousAreas);
  };

  const handleSelectAllAreas = async () => {
    if (isLocked || !taxonomy || updateProficiencyAreas.isPending) return;
    
    const previousAreas = [...selectedAreas];
    const allAreaIds = taxonomy.map(a => a.id);
    
    setSelectedAreas(allAreaIds);
    // Auto-expand all areas and sub-domains
    setExpandedAreas(allAreaIds);
    setExpandedSubDomains(taxonomy.flatMap(a => a.subDomains.map(sd => sd.id)));
    
    // Save to DB immediately
    await saveProficiencyAreas(allAreaIds, previousAreas);
  };

  const handleDeselectAllAreas = async () => {
    if (isLocked || updateProficiencyAreas.isPending) return;
    
    const previousAreas = [...selectedAreas];
    setSelectedAreas([]);
    
    // Save to DB immediately
    await saveProficiencyAreas([], previousAreas);
  };

  const handleLevelChange = async (newLevelId: string) => {
    if (isLocked || updateExpertise.isPending) return;
    if (!provider?.id) return;
    
    const previousLevel = selectedLevel;
    setSelectedLevel(newLevelId);  // Optimistic UI update
    
    // Only save if actually changed from current DB value
    if (newLevelId === provider.expertise_level_id) return;
    
    try {
      const result = await updateExpertise.mutateAsync({
        providerId: provider.id,
        expertiseLevelId: newLevelId,
      });
      
      // Check if cascade confirmation is required
      if (!result.success && result.requiresConfirmation && result.cascadeImpact) {
        setPendingCascadeData({
          newLevelId: newLevelId,
          previousLevelId: previousLevel,
          impact: {
            ...result.cascadeImpact,
            generalProofPointsCount: 0,
          },
        });
        setCascadeDialogOpen(true);
        // Revert to previous selection until confirmed
        setSelectedLevel(previousLevel);
        return;
      }
      
      if (!result.success) {
        // Failed without needing confirmation
        setSelectedLevel(previousLevel);
        toast.error('Failed to save expertise level. Please try again.');
      }
      // Success: toast is handled by the mutation hook, proficiency areas will be cleared on level change via cascade
    } catch (error) {
      // Rollback on error
      setSelectedLevel(previousLevel);
      toast.error('Failed to save expertise level. Please try again.');
    }
  };

  const handleContinue = () => {
    // Validate expertise level is selected
    if (!selectedLevel) {
      toast.error('Please select an expertise level');
      return;
    }

    // Validate at least one proficiency area is selected
    if (selectedAreas.length === 0) {
      toast.error('Please select at least one proficiency area to continue');
      return;
    }

    // Both are already saved to DB - just navigate
    navigate('/enroll/proof-points');
  };

  const handleConfirmCascade = async () => {
    if (!pendingCascadeData || !provider?.id) return;

    try {
      const result = await updateExpertise.mutateAsync({
        providerId: provider.id,
        expertiseLevelId: pendingCascadeData.newLevelId,
        confirmCascade: true,
      });

      if (result.success) {
        // Update local state to reflect the confirmed change
        setSelectedLevel(pendingCascadeData.newLevelId);
        // Clear selected areas as they were reset by cascade
        setSelectedAreas([]);
        setCascadeDialogOpen(false);
        setPendingCascadeData(null);
      }
    } catch (error) {
      toast.error('Failed to update expertise level. Please try again.');
    }
  };

  const handleCancelCascade = () => {
    setCascadeDialogOpen(false);
    setPendingCascadeData(null);
  };

  const handleExpandAll = () => {
    if (taxonomy) {
      const allAreaIds = taxonomy.map(a => a.id);
      const allSubDomainIds = taxonomy.flatMap(a => a.subDomains.map(sd => sd.id));
      setExpandedAreas(allAreaIds);
      setExpandedSubDomains(allSubDomainIds);
    }
  };

  const handleCollapseAll = () => {
    setExpandedAreas([]);
    setExpandedSubDomains([]);
  };

  if (levelsLoading) {
    return (
      <WizardLayout currentStep={4} hideBackButton hideContinueButton>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </WizardLayout>
    );
  }

  if (levelsError) {
    return (
      <WizardLayout currentStep={4} onBack={handleBack} hideContinueButton>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load expertise levels</AlertTitle>
          <AlertDescription>
            Please refresh the page to try again.
          </AlertDescription>
        </Alert>
      </WizardLayout>
    );
  }

  const isSaving = updateExpertise.isPending || updateProficiencyAreas.isPending;

  return (
    <WizardLayout
      currentStep={4}
      onBack={handleBack}
      hideContinueButton
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select Your Expertise Level
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose the level that best represents your professional experience,
            then select one or more proficiency areas you want to focus on.
          </p>
        </div>

        {/* Lock Banner */}
        {isTerminal && (
          <LockedFieldBanner 
            lockLevel="everything"
            reason="Your profile has been verified. Expertise selections cannot be modified."
          />
        )}
        
        {!isTerminal && !configurationCheck.allowed && (
          <LockedFieldBanner 
            lockLevel="configuration"
            reason={configurationCheck.reason || undefined}
          />
        )}

        {/* Level Selection - Horizontal Cards */}
        <RadioGroup 
          value={selectedLevel} 
          onValueChange={handleLevelChange} 
          className="space-y-4"
          disabled={isLocked || updateExpertise.isPending}
        >
          {filteredLevels.map((level) => {
            const isSelected = selectedLevel === level.id;
            const yearsText = level.max_years 
              ? `${level.min_years}-${level.max_years} years`
              : `${level.min_years}+ years`;

            return (
              <Label
                key={level.id}
                htmlFor={level.id}
                className={cn(
                  "cursor-pointer block", 
                  (isLocked || updateExpertise.isPending) && "cursor-not-allowed opacity-60"
                )}
              >
                <Card
                  className={cn(
                    "transition-all",
                    !isLocked && !updateExpertise.isPending && "hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem 
                        value={level.id} 
                        id={level.id} 
                        className="mt-1" 
                        disabled={isLocked || updateExpertise.isPending}
                      />
                      
                      {/* Stars Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                        isSelected ? "bg-primary/10" : "bg-muted"
                      )}>
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.min(level.level_number, 4) }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "h-3 w-3",
                                isSelected 
                                  ? "fill-primary text-primary" 
                                  : "fill-muted-foreground/30 text-muted-foreground/30"
                              )} 
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{level.name}</h3>
                          <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                            Level {level.level_number}
                          </Badge>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          {isSelected && updateExpertise.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                        </div>
                        <span className="text-sm text-primary font-medium">
                          {yearsText}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {level.description}
                        </p>

                        {/* Proficiency Tree - Inside selected card */}
                        {isSelected && (
                          <div className="mt-4 pt-4 border-t">
                            {taxonomyLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                                <span className="text-sm text-muted-foreground">Loading proficiency areas...</span>
                              </div>
                            ) : !taxonomy || taxonomy.length === 0 ? (
                              <div className="py-6 text-center text-muted-foreground">
                                <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No proficiency areas found for this selection.</p>
                              </div>
                            ) : (
                              <>
                                {/* Header with expand/collapse and select/deselect buttons */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                      Select Proficiency Areas
                                    </span>
                                    <Badge variant={selectedAreas.length > 0 ? "default" : "secondary"} className="text-xs">
                                      {selectedAreas.length} of {taxonomy.length} selected
                                    </Badge>
                                    {updateProficiencyAreas.isPending && (
                                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleSelectAllAreas(); }}
                                      className="h-7 text-xs"
                                      disabled={isLocked || updateProficiencyAreas.isPending}
                                    >
                                      Select All
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleDeselectAllAreas(); }}
                                      className="h-7 text-xs"
                                      disabled={isLocked || updateProficiencyAreas.isPending}
                                    >
                                      Deselect All
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleExpandAll(); }}
                                      className="h-7 text-xs"
                                    >
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Expand
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleCollapseAll(); }}
                                      className="h-7 text-xs"
                                    >
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Collapse
                                    </Button>
                                  </div>
                                </div>

                                {/* Areas Accordion with Checkboxes */}
                                <Accordion 
                                  type="multiple" 
                                  value={expandedAreas}
                                  onValueChange={setExpandedAreas}
                                  className="space-y-2"
                                >
                                  {taxonomy.map((area) => {
                                    const isAreaSelected = selectedAreas.includes(area.id);
                                    
                                    return (
                                      <AccordionItem 
                                        key={area.id} 
                                        value={area.id}
                                        className={cn(
                                          "border rounded-lg transition-all",
                                          isAreaSelected 
                                            ? "border-primary bg-primary/5" 
                                            : "bg-muted/30"
                                        )}
                                      >
                                        <AccordionTrigger className="hover:no-underline px-4 py-3">
                                          <div className="flex items-center gap-3 flex-1">
                                            <Checkbox
                                              checked={isAreaSelected}
                                              onCheckedChange={(checked) => handleAreaToggle(area.id, checked as boolean)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                              disabled={isLocked || updateProficiencyAreas.isPending}
                                            />
                                            <FolderOpen className={cn(
                                              "h-4 w-4",
                                              isAreaSelected ? "text-primary" : "text-muted-foreground"
                                            )} />
                                            <span className={cn(
                                              "font-medium text-sm",
                                              isAreaSelected && "text-primary"
                                            )}>
                                              {area.name}
                                            </span>
                                            <Badge 
                                              variant={isAreaSelected ? "default" : "outline"} 
                                              className="text-xs ml-1"
                                            >
                                              {area.subDomains.length} sub-domains
                                            </Badge>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-3">
                                          {/* Sub-Domains Accordion (Display Only) */}
                                          <Accordion 
                                            type="multiple"
                                            value={expandedSubDomains}
                                            onValueChange={setExpandedSubDomains}
                                            className="space-y-1.5"
                                          >
                                            {area.subDomains.map((subDomain) => (
                                              <AccordionItem 
                                                key={subDomain.id} 
                                                value={subDomain.id}
                                                className="border rounded-md bg-background"
                                              >
                                                <AccordionTrigger className="hover:no-underline px-3 py-2 text-sm">
                                                  <span>{subDomain.name}</span>
                                                  <Badge variant="secondary" className="text-xs ml-2">
                                                    {subDomain.specialities.length}
                                                  </Badge>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-3 pb-3">
                                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {subDomain.specialities.map((spec) => (
                                                      <div
                                                        key={spec.id}
                                                        className="flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                                                      >
                                                        <Tag className="h-2.5 w-2.5" />
                                                        {spec.name}
                                                      </div>
                                                    ))}
                                                    {subDomain.specialities.length === 0 && (
                                                      <span className="text-xs text-muted-foreground italic">
                                                        No specialities defined
                                                      </span>
                                                    )}
                                                  </div>
                                                </AccordionContent>
                                              </AccordionItem>
                                            ))}
                                          </Accordion>
                                        </AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
            );
          })}
        </RadioGroup>

        {/* CTA Card - Strengthen Your Profile */}
        {selectedLevel && selectedAreas.length > 0 && !isLocked && (
          <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
            <CardContent className="py-6 px-8 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Strengthen Your Profile & Get Benefits
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
                Take the next step to unlock high value opportunities, enhanced visibility, and exclusive access to complex challenges. Build a comprehensive profile that showcases your expertise and achievements.
              </p>
              <Button 
                onClick={handleContinue}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cascade Warning Dialog */}
      {expertiseCascadeImpact && (
        <CascadeWarningDialog
          open={cascadeDialogOpen}
          onOpenChange={setCascadeDialogOpen}
          cascadeType="expertise_change"
          impact={expertiseCascadeImpact}
          impactSummary={{
            specialtyProofPointsCount: pendingCascadeData?.impact.specialtyProofPointsCount || 0,
            generalProofPointsCount: pendingCascadeData?.impact.generalProofPointsCount || 0,
            proficiencyAreasCount: pendingCascadeData?.impact.proficiencyAreasCount || 0,
            specialitiesCount: pendingCascadeData?.impact.specialitiesCount || 0,
          }}
          onConfirm={handleConfirmCascade}
          onCancel={handleCancelCascade}
          isProcessing={updateExpertise.isPending}
        />
      )}
    </WizardLayout>
  );
}
