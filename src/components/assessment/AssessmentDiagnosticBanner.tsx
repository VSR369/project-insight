/**
 * Assessment Diagnostic Banner
 * 
 * Collapsible banner showing question distribution across proficiency areas,
 * sub-domains, and specialities for debugging and transparency.
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Info, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface QuestionForDisplay {
  id: string;
  proficiency_area_id: string;
  proficiency_area_name: string;
  sub_domain_id: string;
  sub_domain_name: string;
  speciality_id: string;
  speciality_name: string;
  difficulty: string | null;
}

interface AreaDistribution {
  id: string;
  name: string;
  count: number;
  subDomains: {
    id: string;
    name: string;
    count: number;
    specialities: {
      id: string;
      name: string;
      count: number;
    }[];
  }[];
}

interface AssessmentDiagnosticBannerProps {
  industrySegmentName?: string;
  expertiseLevelName?: string;
  questions: QuestionForDisplay[];
  totalQuestions: number;
}

export function AssessmentDiagnosticBanner({
  industrySegmentName,
  expertiseLevelName,
  questions,
  totalQuestions,
}: AssessmentDiagnosticBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate distribution statistics
  const distribution = useMemo<AreaDistribution[]>(() => {
    if (!questions || questions.length === 0) return [];

    const areaMap = new Map<string, AreaDistribution>();

    questions.forEach((q) => {
      // Get or create proficiency area
      if (!areaMap.has(q.proficiency_area_id)) {
        areaMap.set(q.proficiency_area_id, {
          id: q.proficiency_area_id,
          name: q.proficiency_area_name || 'Unknown Area',
          count: 0,
          subDomains: [],
        });
      }
      const area = areaMap.get(q.proficiency_area_id)!;
      area.count++;

      // Get or create sub-domain
      let subDomain = area.subDomains.find(sd => sd.id === q.sub_domain_id);
      if (!subDomain) {
        subDomain = {
          id: q.sub_domain_id,
          name: q.sub_domain_name || 'Unknown Sub-Domain',
          count: 0,
          specialities: [],
        };
        area.subDomains.push(subDomain);
      }
      subDomain.count++;

      // Get or create speciality
      let speciality = subDomain.specialities.find(sp => sp.id === q.speciality_id);
      if (!speciality) {
        speciality = {
          id: q.speciality_id,
          name: q.speciality_name || 'Unknown Speciality',
          count: 0,
        };
        subDomain.specialities.push(speciality);
      }
      speciality.count++;
    });

    return Array.from(areaMap.values()).sort((a, b) => b.count - a.count);
  }, [questions]);

  // Calculate difficulty distribution
  const difficultyDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach(q => {
      const diff = q.difficulty || 'unspecified';
      counts[diff] = (counts[diff] || 0) + 1;
    });
    return counts;
  }, [questions]);

  // Check if distribution is balanced (each area has at least 1 question)
  const isBalanced = distribution.length > 0 && distribution.every(area => area.count > 0);
  const areaCount = distribution.length;

  // Download diagnostic report
  const handleDownloadDiagnostic = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      context: {
        industrySegment: industrySegmentName,
        expertiseLevel: expertiseLevelName,
        totalQuestions,
      },
      distribution: distribution.map(area => ({
        proficiencyArea: area.name,
        questionCount: area.count,
        percentage: ((area.count / totalQuestions) * 100).toFixed(1) + '%',
        subDomains: area.subDomains.map(sd => ({
          subDomain: sd.name,
          questionCount: sd.count,
          specialities: sd.specialities.map(sp => ({
            speciality: sp.name,
            questionCount: sp.count,
          })),
        })),
      })),
      difficultyDistribution,
      balanceStatus: isBalanced ? 'BALANCED' : 'UNBALANCED',
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-diagnostic-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (questions.length === 0) return null;

  return (
    <Card className="mb-4 border-muted">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Question Distribution</span>
              <Badge variant={isBalanced ? 'default' : 'secondary'} className="ml-2">
                {areaCount} {areaCount === 1 ? 'Area' : 'Areas'}
              </Badge>
              {isBalanced ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadDiagnostic();
                }}
                className="h-7 px-2"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Export</span>
              </Button>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3">
            {/* Context info */}
            <div className="text-xs text-muted-foreground mb-3 flex gap-4">
              <span>Industry: <span className="font-medium text-foreground">{industrySegmentName || 'N/A'}</span></span>
              <span>Level: <span className="font-medium text-foreground">{expertiseLevelName || 'N/A'}</span></span>
              <span>Total: <span className="font-medium text-foreground">{totalQuestions} questions</span></span>
            </div>

            {/* Distribution breakdown */}
            <div className="space-y-2">
              {distribution.map((area) => (
                <div key={area.id} className="border rounded-md p-2 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{area.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {area.count} ({((area.count / totalQuestions) * 100).toFixed(0)}%)
                    </Badge>
                  </div>
                  
                  <div className="pl-3 space-y-1">
                    {area.subDomains.map((sd) => (
                      <div key={sd.id} className="text-xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>↳ {sd.name}</span>
                          <span>{sd.count} Q</span>
                        </div>
                        <div className="pl-3 flex flex-wrap gap-1 mt-0.5">
                          {sd.specialities.map((sp) => (
                            <Badge key={sp.id} variant="secondary" className="text-[10px] h-4 px-1.5">
                              {sp.name}: {sp.count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Difficulty distribution */}
            <div className="mt-3 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Difficulty:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(difficultyDistribution).map(([difficulty, count]) => (
                  <Badge key={difficulty} variant="outline" className="text-xs capitalize">
                    {difficulty}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
