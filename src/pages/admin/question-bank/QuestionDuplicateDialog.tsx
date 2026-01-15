import * as React from "react";
import { Copy, Building2, Target, Boxes, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import {
  useProficiencyAreasAdmin,
  useSubDomainsAdmin,
  useSpecialitiesAdmin,
} from "@/hooks/queries/useProficiencyTaxonomyAdmin";
import { useCreateQuestion, Question, parseQuestionOptions, formatQuestionOptions } from "@/hooks/queries/useQuestionBank";

interface QuestionDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  currentSpecialityId: string;
  onComplete?: () => void;
}

export function QuestionDuplicateDialog({
  open,
  onOpenChange,
  questions,
  currentSpecialityId,
  onComplete,
}: QuestionDuplicateDialogProps) {
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState("");
  const [selectedProficiencyAreaId, setSelectedProficiencyAreaId] = React.useState("");
  const [selectedSubDomainId, setSelectedSubDomainId] = React.useState("");
  const [selectedSpecialityId, setSelectedSpecialityId] = React.useState("");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [processed, setProcessed] = React.useState(0);

  const createMutation = useCreateQuestion();

  // Queries for hierarchy
  const { data: industrySegments = [] } = useIndustrySegments(false);
  const { data: proficiencyAreas = [] } = useProficiencyAreasAdmin(
    selectedIndustrySegmentId || undefined,
    undefined,
    false
  );
  const { data: subDomains = [] } = useSubDomainsAdmin(
    selectedProficiencyAreaId || undefined,
    false
  );
  const { data: specialities = [] } = useSpecialitiesAdmin(
    selectedSubDomainId || undefined,
    false
  );

  // Reset selections when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setSelectedIndustrySegmentId("");
      setSelectedProficiencyAreaId("");
      setSelectedSubDomainId("");
      setSelectedSpecialityId("");
      setIsProcessing(false);
      setProgress(0);
      setProcessed(0);
    }
  }, [open]);

  // Reset child selections when parent changes
  React.useEffect(() => {
    setSelectedProficiencyAreaId("");
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedIndustrySegmentId]);

  React.useEffect(() => {
    setSelectedSubDomainId("");
    setSelectedSpecialityId("");
  }, [selectedProficiencyAreaId]);

  React.useEffect(() => {
    setSelectedSpecialityId("");
  }, [selectedSubDomainId]);

  const selectedSegment = industrySegments.find((s) => s.id === selectedIndustrySegmentId);
  const selectedArea = proficiencyAreas.find((a) => a.id === selectedProficiencyAreaId);
  const selectedSubDomain = subDomains.find((sd) => sd.id === selectedSubDomainId);
  const selectedSpeciality = specialities.find((sp) => sp.id === selectedSpecialityId);

  const isSameSpeciality = selectedSpecialityId === currentSpecialityId;
  const canDuplicate = selectedSpecialityId && !isSameSpeciality && questions.length > 0;
  const isBulk = questions.length > 1;

  const handleDuplicate = async () => {
    if (!selectedSpecialityId || questions.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setProcessed(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      try {
        const options = parseQuestionOptions(question.options);
        const formattedOptions = formatQuestionOptions(options);
        const optionsJson = formattedOptions as unknown as { index: number; text: string }[];

        await createMutation.mutateAsync({
          question_text: question.question_text,
          options: optionsJson,
          correct_option: question.correct_option,
          difficulty_level: question.difficulty_level,
          is_active: true,
          speciality_id: selectedSpecialityId,
        });
        successCount++;
      } catch {
        errorCount++;
      }
      
      setProcessed(i + 1);
      setProgress(((i + 1) / questions.length) * 100);
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(
        isBulk
          ? `${successCount} question${successCount > 1 ? "s" : ""} duplicated to "${selectedSpeciality?.name}"`
          : `Question duplicated to "${selectedSpeciality?.name}"`
      );
    }
    if (errorCount > 0) {
      toast.error(`Failed to duplicate ${errorCount} question${errorCount > 1 ? "s" : ""}`);
    }

    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {isBulk ? `Duplicate ${questions.length} Questions` : "Duplicate Question"}
          </DialogTitle>
          <DialogDescription>
            Select a target speciality to copy {isBulk ? "these questions" : "this question"} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question Preview */}
          {questions.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              {isBulk ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{questions.length} questions selected</p>
                  <ScrollArea className="h-24">
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {questions.map((q, idx) => (
                        <li key={q.id} className="line-clamp-1">
                          {idx + 1}. {q.question_text}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-sm font-medium line-clamp-2">{questions[0]?.question_text}</p>
              )}
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Duplicating questions...</span>
                <span>{processed} / {questions.length}</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Target Hierarchy Selection */}
          {!isProcessing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Industry Segment
                </Label>
                <Select
                  value={selectedIndustrySegmentId}
                  onValueChange={setSelectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {industrySegments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Proficiency Area
                </Label>
                <Select
                  value={selectedProficiencyAreaId}
                  onValueChange={setSelectedProficiencyAreaId}
                  disabled={!selectedIndustrySegmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area..." />
                  </SelectTrigger>
                  <SelectContent>
                    {proficiencyAreas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Boxes className="h-3 w-3" />
                  Sub-domain
                </Label>
                <Select
                  value={selectedSubDomainId}
                  onValueChange={setSelectedSubDomainId}
                  disabled={!selectedProficiencyAreaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-domain..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subDomains.map((sd) => (
                      <SelectItem key={sd.id} value={sd.id}>
                        {sd.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Target Speciality
                </Label>
                <Select
                  value={selectedSpecialityId}
                  onValueChange={setSelectedSpecialityId}
                  disabled={!selectedSubDomainId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target speciality..." />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map((sp) => (
                      <SelectItem 
                        key={sp.id} 
                        value={sp.id}
                        disabled={sp.id === currentSpecialityId}
                      >
                        {sp.name} {sp.id === currentSpecialityId && "(current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Target Breadcrumb */}
          {selectedSpecialityId && !isProcessing && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
              <span className="text-xs text-muted-foreground">Target:</span>
              {selectedSegment && (
                <Badge variant="outline" className="text-xs">
                  {selectedSegment.name}
                </Badge>
              )}
              {selectedArea && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {selectedArea.name}
                  </Badge>
                </>
              )}
              {selectedSubDomain && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {selectedSubDomain.name}
                  </Badge>
                </>
              )}
              {selectedSpeciality && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="default" className="text-xs">
                    {selectedSpeciality.name}
                  </Badge>
                </>
              )}
            </div>
          )}

          {isSameSpeciality && !isProcessing && (
            <p className="text-sm text-destructive">
              Cannot duplicate to the same speciality. Please select a different target.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!canDuplicate || isProcessing}
          >
            {isProcessing 
              ? "Duplicating..." 
              : isBulk 
                ? `Duplicate ${questions.length} Questions` 
                : "Duplicate Question"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
