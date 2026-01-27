/**
 * Interview Question Card Component
 * Individual question with rating controls, expected answer, and action buttons
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Lightbulb,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  InterviewRating,
  INTERVIEW_RATING_LABELS,
  INTERVIEW_RATING_COLORS,
  INTERVIEW_RATING_POINTS,
} from "@/constants/interview-kit-scoring.constants";

interface InterviewQuestionCardProps {
  questionNumber: number;
  questionText: string;
  expectedAnswer: string | null;
  rating: InterviewRating | null;
  comments: string | null;
  questionSource: string;
  metadata?: {
    specialityName?: string;
    proofPointTitle?: string;
    competencyName?: string;
  };
  onRatingChange: (rating: InterviewRating, comments?: string) => void;
  onDelete?: () => void;
  onModify?: () => void;
  isSaving?: boolean;
  hasError?: boolean;
  isSubmitted?: boolean;
}

export function InterviewQuestionCard({
  questionNumber,
  questionText,
  expectedAnswer,
  rating,
  comments,
  questionSource,
  metadata,
  onRatingChange,
  onDelete,
  onModify,
  isSaving,
  hasError,
  isSubmitted,
}: InterviewQuestionCardProps) {
  const [localRating, setLocalRating] = useState<InterviewRating | null>(rating);
  const [localComments, setLocalComments] = useState(comments || "");
  const [showCommentError, setShowCommentError] = useState(false);

  // Sync with props
  useEffect(() => {
    setLocalRating(rating);
    setLocalComments(comments || "");
  }, [rating, comments]);

  // Debounced save
  useEffect(() => {
    if (!localRating) return;

    // Check if comment is required
    const needsComment = localRating === 'wrong' || localRating === 'not_answered';
    if (needsComment && !localComments.trim()) {
      setShowCommentError(true);
      return;
    }
    setShowCommentError(false);

    const timer = setTimeout(() => {
      onRatingChange(localRating, localComments);
    }, 500);

    return () => clearTimeout(timer);
  }, [localRating, localComments, onRatingChange]);

  const handleRatingSelect = (value: string) => {
    const newRating = value as InterviewRating;
    setLocalRating(newRating);
    
    // Check if comment is now required
    if ((newRating === 'wrong' || newRating === 'not_answered') && !localComments.trim()) {
      setShowCommentError(true);
    }
  };

  const ratingIcons = {
    right: <CheckCircle2 className="h-4 w-4" />,
    wrong: <XCircle className="h-4 w-4" />,
    not_answered: <HelpCircle className="h-4 w-4" />,
  };

  const isCustomQuestion = questionSource === 'reviewer_custom';

  return (
    <Card className={`border ${hasError ? 'border-destructive' : 'border-border/50'}`}>
      <CardContent className="p-4 space-y-4">
        {/* Question Header with Actions */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {questionNumber}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm leading-relaxed">{questionText}</p>
            
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-1">
              {isCustomQuestion && (
                <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Reviewer Added
                </Badge>
              )}
              {metadata?.specialityName && (
                <Badge variant="outline" className="text-xs">
                  {metadata.specialityName}
                </Badge>
              )}
              {metadata?.proofPointTitle && (
                <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/20">
                  Proof: {metadata.proofPointTitle}
                </Badge>
              )}
              {metadata?.competencyName && (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/20">
                  {metadata.competencyName}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons and saving indicator */}
          <div className="flex items-center gap-1">
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            
            {!isSubmitted && onModify && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onModify}
                title="Modify question"
              >
                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            
            {!isSubmitted && onDelete && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={onDelete}
                title="Delete question"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        </div>

        {/* Rating Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Rating *</Label>
          <RadioGroup
            value={localRating || ""}
            onValueChange={handleRatingSelect}
            className="flex flex-wrap gap-2"
            disabled={isSubmitted}
          >
            {(Object.keys(INTERVIEW_RATING_LABELS) as InterviewRating[]).map((ratingKey) => {
              const colors = INTERVIEW_RATING_COLORS[ratingKey];
              const isSelected = localRating === ratingKey;
              
              return (
                <div key={ratingKey} className="flex items-center">
                  <RadioGroupItem
                    value={ratingKey}
                    id={`rating-${questionNumber}-${ratingKey}`}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={`rating-${questionNumber}-${ratingKey}`}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all
                      ${isSelected 
                        ? `${colors.bg} ${colors.text} ${colors.border} border-2` 
                        : 'border-border hover:bg-muted/50'
                      }
                      ${isSubmitted ? 'cursor-not-allowed opacity-60' : ''}
                    `}
                  >
                    {ratingIcons[ratingKey]}
                    <span className="text-sm">{INTERVIEW_RATING_LABELS[ratingKey]}</span>
                    <span className="text-xs opacity-70">
                      ({INTERVIEW_RATING_POINTS[ratingKey]} pts)
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Expected Answer - Always visible if configured */}
        {expectedAnswer && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3" />
              Expected Answer
            </div>
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground border-l-2 border-primary/30">
              {expectedAnswer}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-2">
          <Label 
            htmlFor={`comments-${questionNumber}`}
            className="text-xs text-muted-foreground"
          >
            Comments {(localRating === 'wrong' || localRating === 'not_answered') && '*'}
          </Label>
          <Textarea
            id={`comments-${questionNumber}`}
            placeholder={
              localRating === 'wrong' || localRating === 'not_answered'
                ? "Please explain why this rating was given (required)"
                : "Add any notes or observations (optional)"
            }
            value={localComments}
            onChange={(e) => setLocalComments(e.target.value)}
            className={`min-h-[60px] text-sm ${showCommentError ? 'border-destructive' : ''}`}
            maxLength={500}
            disabled={isSubmitted}
          />
          {showCommentError && (
            <p className="text-xs text-destructive">
              Comment is required for "Wrong" or "Not Answered" ratings
            </p>
          )}
          <div className="text-xs text-muted-foreground text-right">
            {localComments.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
