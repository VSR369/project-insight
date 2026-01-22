import { useState, useEffect } from "react";
import { 
  FileText, 
  Link as LinkIcon, 
  File, 
  ChevronDown, 
  ChevronUp,
  Tag,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";
import type { RelevanceRating } from "@/services/proofPointsScoreService";

interface ProofPointReviewCardProps {
  proofPoint: ProofPointForReview;
  onRelevanceChange: (value: RelevanceRating) => void;
  onScoreChange: (value: number) => void;
  onCommentsChange: (value: string) => void;
  isUpdating?: boolean;
  isCompleted?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  project_case_study: 'Project Case Study',
  detailed_case_study: 'Detailed Case Study',
  certification: 'Certification',
  publication: 'Publication',
  speaking_engagement: 'Speaking Engagement',
  award: 'Award',
  patent: 'Patent',
  other: 'Other',
};

const MAX_COMMENTS_CHARS = 500;

export function ProofPointReviewCard({
  proofPoint,
  onRelevanceChange,
  onScoreChange,
  onCommentsChange,
  isUpdating = false,
  isCompleted = false,
}: ProofPointReviewCardProps) {
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(true);
  const [localComments, setLocalComments] = useState(proofPoint.reviewComments || '');

  // Sync local comments with prop changes
  useEffect(() => {
    setLocalComments(proofPoint.reviewComments || '');
  }, [proofPoint.reviewComments]);

  // Debounced comments save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localComments !== (proofPoint.reviewComments || '')) {
        onCommentsChange(localComments);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localComments, proofPoint.reviewComments, onCommentsChange]);

  const handleCommentsChange = (value: string) => {
    if (value.length <= MAX_COMMENTS_CHARS) {
      setLocalComments(value);
    }
  };

  const isRated = proofPoint.reviewRelevanceRating !== null && proofPoint.reviewScoreRating !== null;
  const formattedDate = proofPoint.updatedAt 
    ? format(new Date(proofPoint.updatedAt), 'dd MMM yyyy')
    : format(new Date(proofPoint.createdAt), 'dd MMM yyyy');

  return (
    <Card className={`mb-4 ${!isRated && !isCompleted ? 'border-amber-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">{proofPoint.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {TYPE_LABELS[proofPoint.type] || proofPoint.type}
              </Badge>
              <Badge variant={proofPoint.category === 'specialty_specific' ? 'default' : 'outline'}>
                {proofPoint.category === 'specialty_specific' ? 'Speciality' : 'General'}
              </Badge>
              {isRated && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Rated
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {proofPoint.description}
        </p>

        {/* Speciality Tags */}
        {proofPoint.specialityTags.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Tag className="h-4 w-4" />
              Mapped to:
            </div>
            <div className="flex flex-wrap gap-1">
              {proofPoint.specialityTags.map(tag => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.proficiencyAreaName && `${tag.proficiencyAreaName} > `}
                  {tag.subDomainName && `${tag.subDomainName} > `}
                  {tag.specialityName}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Supporting Links */}
        {proofPoint.links.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium">
              <LinkIcon className="h-4 w-4" />
              Supporting Links:
            </div>
            <div className="space-y-1">
              {proofPoint.links.map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  🔗 {link.title || link.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Supporting Files */}
        {proofPoint.files.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-medium">
              <File className="h-4 w-4" />
              Supporting Files:
            </div>
            <div className="space-y-1">
              {proofPoint.files.map(file => (
                <div key={file.id} className="flex items-center gap-1 text-sm text-muted-foreground">
                  📄 {file.fileName}
                  {file.fileSize && (
                    <span className="text-xs">
                      ({Math.round(file.fileSize / 1024)} KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No attachments message */}
        {proofPoint.links.length === 0 && proofPoint.files.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No links or files added</p>
        )}

        {/* Added date */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Added on: {formattedDate}
        </div>

        {/* Review Panel Assessment */}
        <Collapsible open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
          <div className="border-t pt-4 mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="font-medium">Review Panel Assessment</span>
                {isAssessmentOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="mt-4 space-y-4">
              {/* Relevance Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Relevance Rating <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={proofPoint.reviewRelevanceRating || ''}
                  onValueChange={(value) => onRelevanceChange(value as RelevanceRating)}
                  className="flex flex-wrap gap-4"
                  disabled={isCompleted}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id={`rel-high-${proofPoint.id}`} />
                    <Label htmlFor={`rel-high-${proofPoint.id}`} className="cursor-pointer">
                      High (1.0)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id={`rel-med-${proofPoint.id}`} />
                    <Label htmlFor={`rel-med-${proofPoint.id}`} className="cursor-pointer">
                      Medium (0.6)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id={`rel-low-${proofPoint.id}`} />
                    <Label htmlFor={`rel-low-${proofPoint.id}`} className="cursor-pointer">
                      Low (0.2)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Score Rating */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Score Rating (0-10) <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={proofPoint.reviewScoreRating?.toString() || ''}
                  onValueChange={(value) => onScoreChange(parseInt(value, 10))}
                  className="flex flex-wrap gap-2"
                  disabled={isCompleted}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                    <div key={score} className="flex items-center">
                      <RadioGroupItem
                        value={score.toString()}
                        id={`score-${score}-${proofPoint.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`score-${score}-${proofPoint.id}`}
                        className={`
                          cursor-pointer px-3 py-1.5 rounded-md border text-sm
                          peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground
                          peer-data-[state=checked]:border-primary
                          hover:bg-muted transition-colors
                          ${isCompleted ? 'cursor-not-allowed opacity-60' : ''}
                        `}
                      >
                        {score}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm font-medium">Comments (Optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    {localComments.length}/{MAX_COMMENTS_CHARS}
                  </span>
                </div>
                <Textarea
                  value={localComments}
                  onChange={(e) => handleCommentsChange(e.target.value)}
                  placeholder="Add your assessment comments here..."
                  rows={3}
                  disabled={isCompleted}
                  className="resize-none"
                />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
