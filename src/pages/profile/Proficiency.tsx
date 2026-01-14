import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, TreePine, ChevronRight, FolderOpen, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Sample taxonomy data - in production this would come from API
const sampleTaxonomy = [
  {
    id: '1',
    name: 'Software Development',
    subDomains: [
      {
        id: '1-1',
        name: 'Frontend Development',
        specialities: [
          { id: '1-1-1', name: 'React.js' },
          { id: '1-1-2', name: 'Vue.js' },
          { id: '1-1-3', name: 'Angular' },
          { id: '1-1-4', name: 'TypeScript' },
          { id: '1-1-5', name: 'CSS & Design Systems' },
        ],
      },
      {
        id: '1-2',
        name: 'Backend Development',
        specialities: [
          { id: '1-2-1', name: 'Node.js' },
          { id: '1-2-2', name: 'Python' },
          { id: '1-2-3', name: 'Java' },
          { id: '1-2-4', name: 'Go' },
        ],
      },
      {
        id: '1-3',
        name: 'Mobile Development',
        specialities: [
          { id: '1-3-1', name: 'React Native' },
          { id: '1-3-2', name: 'Flutter' },
          { id: '1-3-3', name: 'iOS (Swift)' },
          { id: '1-3-4', name: 'Android (Kotlin)' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Data & Analytics',
    subDomains: [
      {
        id: '2-1',
        name: 'Data Engineering',
        specialities: [
          { id: '2-1-1', name: 'ETL Pipelines' },
          { id: '2-1-2', name: 'Data Warehousing' },
          { id: '2-1-3', name: 'Apache Spark' },
        ],
      },
      {
        id: '2-2',
        name: 'Data Science',
        specialities: [
          { id: '2-2-1', name: 'Machine Learning' },
          { id: '2-2-2', name: 'Deep Learning' },
          { id: '2-2-3', name: 'NLP' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Cloud & Infrastructure',
    subDomains: [
      {
        id: '3-1',
        name: 'Cloud Platforms',
        specialities: [
          { id: '3-1-1', name: 'AWS' },
          { id: '3-1-2', name: 'Azure' },
          { id: '3-1-3', name: 'Google Cloud' },
        ],
      },
      {
        id: '3-2',
        name: 'DevOps',
        specialities: [
          { id: '3-2-1', name: 'Kubernetes' },
          { id: '3-2-2', name: 'Docker' },
          { id: '3-2-3', name: 'CI/CD' },
        ],
      },
    ],
  },
];

export default function Proficiency() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>Step 4 of 5</span>
            <span>•</span>
            <span>Proficiency Areas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Explore Your Proficiency Areas
          </h1>
          <p className="text-muted-foreground mt-2">
            Review the skill taxonomy available for your industry and expertise level.
            You'll select your specific specialities after completing the assessment.
          </p>
        </div>

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

        {/* Taxonomy Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technology Proficiency Tree</CardTitle>
            <CardDescription>
              Expand each area to see sub-domains and specialities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {sampleTaxonomy.map((area) => (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
