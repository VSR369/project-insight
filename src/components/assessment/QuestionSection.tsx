import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { QuestionCard } from './QuestionCard';

interface QuestionOption {
  index: number;
  text: string;
}

interface Question {
  id: string;
  question_text: string;
  options: QuestionOption[];
  difficulty?: string | null;
  speciality_id: string;
}

interface SpecialityGroup {
  id: string;
  name: string;
  questions: Question[];
}

interface SubDomainGroup {
  id: string;
  name: string;
  specialities: SpecialityGroup[];
}

interface ProficiencyAreaGroup {
  id: string;
  name: string;
  subDomains: SubDomainGroup[];
}

interface QuestionSectionProps {
  proficiencyArea: ProficiencyAreaGroup;
  answers: Record<string, number | null>;
  onAnswerChange: (questionId: string, optionIndex: number) => void;
  savingQuestions: Set<string>;
  questionNumberMap: Record<string, number>;
  registerQuestionRef?: (questionId: string, element: HTMLDivElement | null) => void;
  // Controlled open state from parent
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

export function QuestionSection({
  proficiencyArea,
  answers,
  onAnswerChange,
  savingQuestions,
  questionNumberMap,
  registerQuestionRef,
  openSections,
  onToggleSection,
}: QuestionSectionProps) {
  const isOpen = openSections[`area-${proficiencyArea.id}`] ?? true;

  // Calculate progress for this proficiency area
  const allQuestions = proficiencyArea.subDomains.flatMap(sd =>
    sd.specialities.flatMap(sp => sp.questions)
  );
  const answeredCount = allQuestions.filter(q => answers[q.id] != null).length;
  const totalCount = allQuestions.length;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => onToggleSection(`area-${proficiencyArea.id}`)} 
      className="mb-6"
    >
      {/* Proficiency Area Header */}
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg cursor-pointer hover:opacity-95 transition-opacity">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
            <span className="font-semibold text-lg">
              {proficiencyArea.name}
            </span>
          </div>
          <Badge 
            variant="secondary" 
            className={cn(
              'font-medium',
              progress === 100 
                ? 'bg-green-500 text-white' 
                : 'bg-white/20 text-white'
            )}
          >
            {answeredCount}/{totalCount} answered
          </Badge>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        {proficiencyArea.subDomains.map((subDomain) => (
          <SubDomainSection
            key={subDomain.id}
            subDomain={subDomain}
            answers={answers}
            onAnswerChange={onAnswerChange}
            savingQuestions={savingQuestions}
            questionNumberMap={questionNumberMap}
            registerQuestionRef={registerQuestionRef}
            openSections={openSections}
            onToggleSection={onToggleSection}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SubDomainSectionProps {
  subDomain: SubDomainGroup;
  answers: Record<string, number | null>;
  onAnswerChange: (questionId: string, optionIndex: number) => void;
  savingQuestions: Set<string>;
  questionNumberMap: Record<string, number>;
  registerQuestionRef?: (questionId: string, element: HTMLDivElement | null) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

function SubDomainSection({
  subDomain,
  answers,
  onAnswerChange,
  savingQuestions,
  questionNumberMap,
  registerQuestionRef,
  openSections,
  onToggleSection,
}: SubDomainSectionProps) {
  const isOpen = openSections[`sd-${subDomain.id}`] ?? true;

  const allQuestions = subDomain.specialities.flatMap(sp => sp.questions);
  const answeredCount = allQuestions.filter(q => answers[q.id] != null).length;
  const totalCount = allQuestions.length;

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => onToggleSection(`sd-${subDomain.id}`)} 
      className="ml-4 mt-3"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border-l-4 border-emerald-500">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">
              Sub-Domain: {subDomain.name}
            </span>
          </div>
          <span className="text-sm font-medium">
            {answeredCount}/{totalCount}
          </span>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        {subDomain.specialities.map((speciality) => (
          <SpecialitySection
            key={speciality.id}
            speciality={speciality}
            answers={answers}
            onAnswerChange={onAnswerChange}
            savingQuestions={savingQuestions}
            questionNumberMap={questionNumberMap}
            registerQuestionRef={registerQuestionRef}
            openSections={openSections}
            onToggleSection={onToggleSection}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface SpecialitySectionProps {
  speciality: SpecialityGroup;
  answers: Record<string, number | null>;
  onAnswerChange: (questionId: string, optionIndex: number) => void;
  savingQuestions: Set<string>;
  questionNumberMap: Record<string, number>;
  registerQuestionRef?: (questionId: string, element: HTMLDivElement | null) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionId: string) => void;
}

function SpecialitySection({
  speciality,
  answers,
  onAnswerChange,
  savingQuestions,
  questionNumberMap,
  registerQuestionRef,
  openSections,
  onToggleSection,
}: SpecialitySectionProps) {
  const isOpen = openSections[`sp-${speciality.id}`] ?? true;

  const answeredCount = speciality.questions.filter(q => answers[q.id] != null).length;
  const totalCount = speciality.questions.length;

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={() => onToggleSection(`sp-${speciality.id}`)} 
      className="ml-4 mt-2"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border-l-4 border-purple-400">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-purple-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-purple-600" />
            )}
            <span className="text-purple-800 dark:text-purple-300 font-medium">
              ✧ Specialty: {speciality.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {answeredCount === totalCount && totalCount > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
              {answeredCount}/{totalCount}
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="ml-4 mt-3 space-y-4">
        {speciality.questions.map((question) => (
          <QuestionCard
            key={question.id}
            ref={(el) => registerQuestionRef?.(question.id, el)}
            questionNumber={questionNumberMap[question.id] || 0}
            questionText={question.question_text}
            options={question.options}
            selectedOption={answers[question.id] ?? null}
            onSelectOption={(optionIndex) => onAnswerChange(question.id, optionIndex)}
            isAnswered={answers[question.id] != null}
            isSaving={savingQuestions.has(question.id)}
            difficulty={question.difficulty}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
