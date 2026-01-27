/**
 * Interview Kit Review Notes Component
 * Shows and manages flag/reviewer notes from interview_bookings
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Flag, 
  MessageSquare, 
  Plus, 
  Trash2,
  Edit2,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ReviewNote {
  type: 'flag' | 'note';
  content: string;
  timestamp?: string;
}

interface InterviewKitReviewNotesProps {
  flagForClarification: boolean;
  clarificationNotes: string | null;
  reviewerNotes: string | null;
  onUpdateClarification: (notes: string) => void;
  onUpdateNotes: (notes: string) => void;
  isUpdating?: boolean;
}

export function InterviewKitReviewNotes({
  flagForClarification,
  clarificationNotes,
  reviewerNotes,
  onUpdateClarification,
  onUpdateNotes,
  isUpdating,
}: InterviewKitReviewNotesProps) {
  const [editingType, setEditingType] = useState<'flag' | 'note' | null>(null);
  const [editContent, setEditContent] = useState("");

  // Count non-empty notes
  const noteCount = (clarificationNotes ? 1 : 0) + (reviewerNotes ? 1 : 0);

  const handleOpenEdit = (type: 'flag' | 'note') => {
    setEditingType(type);
    setEditContent(type === 'flag' ? (clarificationNotes || '') : (reviewerNotes || ''));
  };

  const handleSave = () => {
    if (!editingType) return;
    
    if (editingType === 'flag') {
      onUpdateClarification(editContent);
    } else {
      onUpdateNotes(editContent);
    }
    
    setEditingType(null);
    setEditContent("");
  };

  const handleDelete = (type: 'flag' | 'note') => {
    if (type === 'flag') {
      onUpdateClarification('');
    } else {
      onUpdateNotes('');
    }
    toast.success("Note removed");
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Review Notes
              {noteCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {noteCount} note{noteCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleOpenEdit('flag')}
              >
                <Flag className="h-3 w-3" />
                {clarificationNotes ? 'Edit Flag' : 'Flag for Clarification'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => handleOpenEdit('note')}
              >
                <MessageSquare className="h-3 w-3" />
                {reviewerNotes ? 'Edit Note' : 'Add Reviewer Note'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Flag Card */}
          {clarificationNotes && (
            <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <Badge className="bg-amber-500 text-white shrink-0">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                  <p className="text-sm">{clarificationNotes}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit('flag')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete('flag')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reviewer Note Card */}
          {reviewerNotes && (
            <div className="p-3 border border-border/50 bg-muted/30 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm">{reviewerNotes}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleOpenEdit('note')}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete('note')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!clarificationNotes && !reviewerNotes && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No review notes added yet. Use the buttons above to add notes.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType === 'flag' ? 'Flag for Clarification' : 'Reviewer Note'}
            </DialogTitle>
          </DialogHeader>
          
          <Textarea
            placeholder={
              editingType === 'flag'
                ? "Describe what needs clarification..."
                : "Add your notes about this candidate..."
            }
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px]"
            maxLength={editingType === 'flag' ? 1000 : 2000}
          />
          <div className="text-xs text-muted-foreground text-right">
            {editContent.length}/{editingType === 'flag' ? 1000 : 2000}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingType(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
