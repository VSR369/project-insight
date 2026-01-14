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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  question: Question | null;
  currentSpecialityId: string;
}

export function QuestionDuplicateDialog({
  open,
  onOpenChange,
  question,
  currentSpecialityId,
}: QuestionDuplicateDialogProps) {
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = React.useState("");
  const [selectedProficiencyAreaId, setSelectedProficiencyAreaId] = React.useState("");
  const [selectedSubDomainId, setSelectedSubDomainId] = React.useState("");
  const [selectedSpecialityId, setSelectedSpecialityId] = React.useState("");

  const createMutation = useCreateQuestion();

  // Queries for hierarchy
  const { data: industrySegments = [] } = useIndustrySegments(false);
  const { data: proficiencyAreas = [] } = useProficiencyAreasAdmin(
    selectedIndustrySegmentId || undefined,
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
  const canDuplicate = selectedSpecialityId && !isSameSpeciality;

  const handleDuplicate = async () => {
    if (!question || !selectedSpecialityId) return;

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

      toast.success(`Question duplicated to "${selectedSpeciality?.name}"`);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Question
          </DialogTitle>
          <DialogDescription>
            Select a target speciality to copy this question to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question Preview */}
          {question && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium line-clamp-2">{question.question_text}</p>
            </div>
          )}

          {/* Target Hierarchy Selection */}
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

          {/* Target Breadcrumb */}
          {selectedSpecialityId && (
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

          {isSameSpeciality && (
            <p className="text-sm text-destructive">
              Cannot duplicate to the same speciality. Please select a different target.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={!canDuplicate || createMutation.isPending}
          >
            {createMutation.isPending ? "Duplicating..." : "Duplicate Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
