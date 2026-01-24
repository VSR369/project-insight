/**
 * Results Hierarchy Tree
 * 
 * Collapsible tree showing:
 * Proficiency Area → Sub-Domain → Speciality → Questions
 * with scores at each level
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, Boxes, Sparkles, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuestionResultCard } from './QuestionResultCard';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  type AssessmentResultsHierarchy,
  type ProficiencyAreaScoreNode,
  type SubDomainScoreNode,
  type SpecialityScoreNode,
  getScoreColor,
} from '@/services/assessmentResultsService';

interface ResultsHierarchyTreeProps {
  hierarchy: AssessmentResultsHierarchy;
  showQuestions?: boolean;
  industrySegmentName?: string;
  expertiseLevelName?: string;
}

export function ResultsHierarchyTree({ 
  hierarchy, 
  showQuestions = true,
  industrySegmentName,
  expertiseLevelName,
}: ResultsHierarchyTreeProps) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedSubDomains, setExpandedSubDomains] = useState<Set<string>>(new Set());
  const [expandedSpecialities, setExpandedSpecialities] = useState<Set<string>>(new Set());

  const { proficiencyAreas } = hierarchy;

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubDomain = (id: string) => {
    setExpandedSubDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSpeciality = (id: string) => {
    setExpandedSpecialities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedAreas(new Set(proficiencyAreas.map(a => a.id)));
    setExpandedSubDomains(new Set(proficiencyAreas.flatMap(a => a.subDomains.map(sd => sd.id))));
    setExpandedSpecialities(new Set(
      proficiencyAreas.flatMap(a => a.subDomains.flatMap(sd => sd.specialities.map(sp => sp.id)))
    ));
  };

  const collapseAll = () => {
    setExpandedAreas(new Set());
    setExpandedSubDomains(new Set());
    setExpandedSpecialities(new Set());
  };

  if (proficiencyAreas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No assessment data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Performance Breakdown
            </CardTitle>
            {/* Breadcrumb showing Industry > Expertise context */}
            {(industrySegmentName || expertiseLevelName) && (
              <Breadcrumb className="mt-2">
                <BreadcrumbList className="text-xs text-muted-foreground">
                  {industrySegmentName && (
                    <BreadcrumbItem>
                      <span>{industrySegmentName}</span>
                    </BreadcrumbItem>
                  )}
                  {industrySegmentName && expertiseLevelName && <BreadcrumbSeparator />}
                  {expertiseLevelName && (
                    <BreadcrumbItem>
                      <span>{expertiseLevelName}</span>
                    </BreadcrumbItem>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {proficiencyAreas.map((area) => (
          <ProficiencyAreaRow
            key={area.id}
            area={area}
            isExpanded={expandedAreas.has(area.id)}
            onToggle={() => toggleArea(area.id)}
            expandedSubDomains={expandedSubDomains}
            onToggleSubDomain={toggleSubDomain}
            expandedSpecialities={expandedSpecialities}
            onToggleSpeciality={toggleSpeciality}
            showQuestions={showQuestions}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// Sub-components for each level

interface ProficiencyAreaRowProps {
  area: ProficiencyAreaScoreNode;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSubDomains: Set<string>;
  onToggleSubDomain: (id: string) => void;
  expandedSpecialities: Set<string>;
  onToggleSpeciality: (id: string) => void;
  showQuestions: boolean;
}

function ProficiencyAreaRow({
  area,
  isExpanded,
  onToggle,
  expandedSubDomains,
  onToggleSubDomain,
  expandedSpecialities,
  onToggleSpeciality,
  showQuestions,
}: ProficiencyAreaRowProps) {

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Area Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 p-3 text-left transition-colors',
          'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-95'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0" />
        )}
        <Target className="h-4 w-4 shrink-0" />
        <span className="font-semibold flex-1">{area.name}</span>
        <div className="flex items-center gap-2">
          <ScoreBadge percentage={area.percentage} rating={area.rating} variant="light" />
          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
            {area.correct}/{area.total}
          </Badge>
        </div>
      </button>

      {/* Sub-domains */}
      {isExpanded && (
        <div className="bg-background">
          {area.subDomains.map((subDomain) => (
            <SubDomainRow
              key={subDomain.id}
              subDomain={subDomain}
              isExpanded={expandedSubDomains.has(subDomain.id)}
              onToggle={() => onToggleSubDomain(subDomain.id)}
              expandedSpecialities={expandedSpecialities}
              onToggleSpeciality={onToggleSpeciality}
              showQuestions={showQuestions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SubDomainRowProps {
  subDomain: SubDomainScoreNode;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSpecialities: Set<string>;
  onToggleSpeciality: (id: string) => void;
  showQuestions: boolean;
}

function SubDomainRow({
  subDomain,
  isExpanded,
  onToggle,
  expandedSpecialities,
  onToggleSpeciality,
  showQuestions,
}: SubDomainRowProps) {
  return (
    <div className="ml-4 border-l-4 border-emerald-500">
      {/* Sub-domain Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 p-3 text-left transition-colors',
          'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600" />
        )}
        <Boxes className="h-4 w-4 text-emerald-600 shrink-0" />
        <span className="font-medium text-emerald-800 dark:text-emerald-300 flex-1">
          Sub-Domain: {subDomain.name}
        </span>
        <div className="flex items-center gap-2">
          <ScoreBadge percentage={subDomain.percentage} rating={subDomain.rating} size="sm" />
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {subDomain.correct}/{subDomain.total}
          </span>
        </div>
      </button>

      {/* Specialities */}
      {isExpanded && (
        <div className="bg-background">
          {subDomain.specialities.map((speciality) => (
            <SpecialityRow
              key={speciality.id}
              speciality={speciality}
              isExpanded={expandedSpecialities.has(speciality.id)}
              onToggle={() => onToggleSpeciality(speciality.id)}
              showQuestions={showQuestions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SpecialityRowProps {
  speciality: SpecialityScoreNode;
  isExpanded: boolean;
  onToggle: () => void;
  showQuestions: boolean;
}

function SpecialityRow({ speciality, isExpanded, onToggle, showQuestions }: SpecialityRowProps) {
  const allCorrect = speciality.correct === speciality.total && speciality.total > 0;

  return (
    <div className="ml-4 border-l-4 border-purple-400">
      {/* Speciality Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2 p-3 text-left transition-colors',
          'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'
        )}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-purple-600" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-purple-600" />
        )}
        <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
        <span className="font-medium text-purple-800 dark:text-purple-300 flex-1">
          ✧ Speciality: {speciality.name}
        </span>
        <div className="flex items-center gap-2">
          {allCorrect ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          <ScoreBadge percentage={speciality.percentage} rating={speciality.rating} size="sm" />
          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
            {speciality.correct}/{speciality.total}
          </span>
        </div>
      </button>

      {/* Questions */}
      {isExpanded && showQuestions && (
        <div className="ml-4 p-3 space-y-3 bg-muted/30">
          {speciality.questions.map((question, idx) => (
            <QuestionResultCard
              key={question.id}
              question={question}
              questionNumber={idx + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Score Badge Component

interface ScoreBadgeProps {
  percentage: number | null;
  rating: number | null;
  size?: 'sm' | 'md';
  variant?: 'default' | 'light';
}

function ScoreBadge({ percentage, rating, size = 'md', variant = 'default' }: ScoreBadgeProps) {
  const color = getScoreColor(percentage);
  
  const colorClasses = {
    green: variant === 'light' 
      ? 'bg-green-500 text-white' 
      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    yellow: variant === 'light'
      ? 'bg-yellow-500 text-white'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    red: variant === 'light'
      ? 'bg-red-500 text-white'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    gray: variant === 'light'
      ? 'bg-gray-500 text-white'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <Badge className={cn(
      colorClasses[color],
      size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
    )}>
      {percentage !== null ? `${percentage.toFixed(1)}%` : 'Not Rated'}
      {rating !== null && (
        <span className="ml-1 opacity-75">({rating.toFixed(1)}/5)</span>
      )}
    </Badge>
  );
}
