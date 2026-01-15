import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useExpertiseLevels } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderExpertise } from '@/hooks/queries/useProvider';
import { useProficiencyTaxonomy } from '@/hooks/queries/useProficiencyTaxonomy';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle, Star, AlertCircle, FolderOpen, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EnrollExpertise() {
  const navigate = useNavigate();
  const { data: levels, isLoading: levelsLoading, error: levelsError } = useExpertiseLevels();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();
  const updateExpertise = useUpdateProviderExpertise();
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [expandedAreas, setExpandedAreas] = useState<string[]>([]);
  const [expandedSubDomains, setExpandedSubDomains] = useState<string[]>([]);

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

  // Reset expanded state when level changes
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

  const handleContinue = async () => {
    if (!selectedLevel) {
      toast.error('Please select an expertise level');
      return;
    }

    if (!provider?.id) {
      toast.error('Provider profile not found. Please refresh the page.');
      return;
    }

    try {
      await updateExpertise.mutateAsync({
        providerId: provider.id,
        expertiseLevelId: selectedLevel,
      });
      navigate('/enroll/proof-points');
    } catch (error) {
      toast.error('Failed to save expertise level. Please try again.');
      console.error('Error saving expertise:', error);
    }
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

  return (
    <WizardLayout
      currentStep={4}
      onBack={handleBack}
      onContinue={handleContinue}
      isSubmitting={updateExpertise.isPending}
      canContinue={!!selectedLevel}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Select Your Expertise Level
          </h1>
          <p className="text-muted-foreground mt-2">
            Choose the level that best represents your professional experience.
            The proficiency areas will be shown within your selected level.
          </p>
        </div>

        {/* Level Selection - Horizontal Cards */}
        <RadioGroup value={selectedLevel} onValueChange={setSelectedLevel} className="space-y-4">
          {filteredLevels.map((level) => {
            const isSelected = selectedLevel === level.id;
            const yearsText = level.max_years 
              ? `${level.min_years}-${level.max_years} years`
              : `${level.min_years}+ years`;

            return (
              <Label
                key={level.id}
                htmlFor={level.id}
                className="cursor-pointer block"
              >
                <Card
                  className={cn(
                    "transition-all hover:border-primary/50",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value={level.id} id={level.id} className="mt-1" />
                      
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
                                {/* Header with expand/collapse buttons */}
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium text-foreground">
                                    Available Proficiency Areas ({taxonomy.length})
                                  </span>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleExpandAll(); }}
                                      className="h-7 text-xs"
                                    >
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Expand All
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={(e) => { e.preventDefault(); handleCollapseAll(); }}
                                      className="h-7 text-xs"
                                    >
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Collapse All
                                    </Button>
                                  </div>
                                </div>

                                {/* Areas Accordion */}
                                <Accordion 
                                  type="multiple" 
                                  value={expandedAreas}
                                  onValueChange={setExpandedAreas}
                                  className="space-y-2"
                                >
                                  {taxonomy.map((area) => (
                                    <AccordionItem 
                                      key={area.id} 
                                      value={area.id}
                                      className="border rounded-lg bg-muted/30"
                                    >
                                      <AccordionTrigger className="hover:no-underline px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <FolderOpen className="h-4 w-4 text-primary" />
                                          <span className="font-medium text-sm">{area.name}</span>
                                          <Badge variant="outline" className="text-xs ml-1">
                                            {area.subDomains.length} sub-domains
                                          </Badge>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="px-4 pb-3">
                                        {/* Sub-Domains Accordion */}
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
                                  ))}
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
      </div>
    </WizardLayout>
  );
}
