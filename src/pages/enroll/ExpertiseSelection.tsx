import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout } from '@/components/layout';
import { useExpertiseLevels } from '@/hooks/queries/useMasterData';
import { useCurrentProvider, useUpdateProviderExpertise } from '@/hooks/queries/useProvider';
import { useProficiencyTaxonomy } from '@/hooks/queries/useProficiencyTaxonomy';
import { useParticipationModes } from '@/hooks/queries/useMasterData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle, Star, AlertCircle, TreePine, FolderOpen, ChevronRight, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EnrollExpertise() {
  const navigate = useNavigate();
  const { data: levels, isLoading: levelsLoading, error: levelsError } = useExpertiseLevels();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: participationModes } = useParticipationModes();
  const updateExpertise = useUpdateProviderExpertise();
  const [selectedLevel, setSelectedLevel] = useState<string>('');

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

  const handleBack = () => {
    // Check if org step was required
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

  const selectedLevelData = levels?.find(l => l.id === selectedLevel);

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
            The proficiency tree below will update based on your selection.
          </p>
        </div>

        {/* Level Selection */}
        <RadioGroup 
          value={selectedLevel} 
          onValueChange={setSelectedLevel}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
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
                className="cursor-pointer h-full"
              >
                <Card
                  className={cn(
                    "h-full transition-all hover:border-primary/50 relative overflow-hidden",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
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
                    />

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

                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {level.name}
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </h3>
                    <span className="text-sm text-primary font-medium mt-1">
                      {yearsText}
                    </span>

                    <p className="text-sm text-muted-foreground mt-3 flex-1">
                      {level.description}
                    </p>
                  </CardContent>
                </Card>
              </Label>
            );
          })}
        </RadioGroup>

        {/* Proficiency Tree Preview */}
        {selectedLevel && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Available Proficiency Areas</CardTitle>
              </div>
              <CardDescription>
                These are the specialities available for {selectedLevelData?.name} level.
                You'll claim these through proof points and assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taxonomyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !taxonomy || taxonomy.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No proficiency areas found for this selection.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {taxonomy.map((area) => (
                    <AccordionItem 
                      key={area.id} 
                      value={area.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="h-5 w-5 text-primary" />
                          <span className="font-medium">{area.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({area.subDomains.length} sub-domains)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-8 space-y-4 pb-4">
                          {area.subDomains.map((subDomain) => (
                            <div key={subDomain.id}>
                              <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                {subDomain.name}
                              </div>
                              <div className="pl-6 flex flex-wrap gap-2">
                                {subDomain.specialities.map((spec) => (
                                  <div
                                    key={spec.id}
                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-muted rounded-full text-muted-foreground"
                                  >
                                    <Tag className="h-3 w-3" />
                                    {spec.name}
                                  </div>
                                ))}
                                {subDomain.specialities.length === 0 && (
                                  <span className="text-xs text-muted-foreground italic">
                                    No specialities defined
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </WizardLayout>
  );
}
