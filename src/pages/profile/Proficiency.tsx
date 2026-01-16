import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, TreePine, ChevronRight, FolderOpen, Tag, Loader2, AlertCircle, Award, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProficiencyTaxonomy } from '@/hooks/queries/useProficiencyTaxonomy';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useCanModifyField, useIsTerminalState } from '@/hooks/queries/useLifecycleValidation';
import { LockedFieldBanner } from '@/components/enrollment/LockedFieldBanner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Proficiency() {
  const navigate = useNavigate();
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: taxonomy, isLoading: taxonomyLoading } = useProficiencyTaxonomy(
    provider?.industry_segment_id ?? undefined,
    provider?.expertise_level_id ?? undefined
  );
  const { data: expertiseLevels = [] } = useExpertiseLevels();

  // Lifecycle validation
  const configurationCheck = useCanModifyField('configuration');
  const terminalState = useIsTerminalState();
  const isTerminal = terminalState.isTerminal;
  const isLocked = !configurationCheck.allowed || isTerminal;

  const providerLevel = expertiseLevels.find(l => l.id === provider?.expertise_level_id);
  
  if (providerLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const hasIndustrySegment = !!provider?.industry_segment_id;
  const hasExpertiseLevel = !!provider?.expertise_level_id;
  const hasTaxonomy = taxonomy && taxonomy.length > 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 4 of 5</span>
            <span>•</span>
            <span>Proficiency Areas</span>
            {isLocked && <Lock className="h-3 w-3" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Explore Your Proficiency Areas
          </h1>
          <p className="text-muted-foreground mt-2">
            Review the skill taxonomy available for your industry and expertise level.
            You'll select your specific specialities after completing the assessment.
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

        {/* Info Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <TreePine className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-foreground">This is a preview</p>
              <p className="text-muted-foreground">
                The specialities you can claim will be determined based on your assessment results.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Missing Prerequisites */}
        {(!hasIndustrySegment || !hasExpertiseLevel) && (
          <Alert variant="default" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!hasExpertiseLevel
                ? "Your expertise level hasn't been set. Please complete the Expertise Level step first."
                : "Your industry segment hasn't been set. Please contact support or complete registration again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Your Level Badge */}
        {providerLevel && (
          <div className="flex items-center gap-2 mb-6">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Your Level:</span>
            <Badge variant="secondary">{providerLevel.name}</Badge>
          </div>
        )}

        {/* Taxonomy Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proficiency Tree</CardTitle>
            <CardDescription>
              Expand each area to see sub-domains and specialities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {taxonomyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !hasTaxonomy ? (
              <div className="py-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No proficiency areas found for your industry segment and expertise level.</p>
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
                        {area.subDomains.length === 0 && (
                          <span className="text-sm text-muted-foreground italic">
                            No sub-domains defined
                          </span>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/profile/build/expertise')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() => navigate('/profile/build/proof-points')}
            className="gap-2 sm:ml-auto"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
