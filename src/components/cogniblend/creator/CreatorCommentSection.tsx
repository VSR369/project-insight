/**
 * CreatorCommentSection — Generic read-only viewer + comment textarea shown
 * to Creators on legal-docs and escrow sections (which they cannot edit
 * after Curator/LC/FC approval). The Creator may submit a comment for the
 * Curator to review.
 *
 * Pure presentation — receives content via props and emits the saved comment
 * via onSave. No supabase calls.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface CreatorCommentSectionProps {
  /** Header label, e.g. "Legal Documents" or "Escrow & Funding". */
  title: string;
  /** Approver label, e.g. "Legal Coordinator" or "Finance Coordinator". */
  approvedByLabel: string;
  /** HTML to render read-only inside a legal-doc styled container. */
  contentHtml?: string | null;
  /** Optional plain-text body used when `contentHtml` is absent. */
  fallbackText?: string;
  /** Existing saved comment (controlled). */
  initialComment?: string | null;
  /** Persist callback — parent owns the mutation. */
  onSave: (comment: string) => void | Promise<void>;
  /** True while the parent mutation is in flight. */
  isSaving: boolean;
}

export function CreatorCommentSection({
  title,
  approvedByLabel,
  contentHtml,
  fallbackText,
  initialComment,
  onSave,
  isSaving,
}: CreatorCommentSectionProps) {
  const [comment, setComment] = useState<string>(initialComment ?? '');
  const [savedSnapshot, setSavedSnapshot] = useState<string>(initialComment ?? '');

  useEffect(() => {
    setComment(initialComment ?? '');
    setSavedSnapshot(initialComment ?? '');
  }, [initialComment]);

  const isDirty = comment.trim() !== (savedSnapshot ?? '').trim();

  const handleSave = async () => {
    const value = comment.trim();
    await onSave(value);
    setSavedSnapshot(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {title} — Approved by {approvedByLabel}
          </CardTitle>
          <Badge className="bg-success/10 text-success border-success/30">
            Approved ✓
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {contentHtml ? (
          <div className="legal-doc-page">
            <div
              className="legal-doc"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            {fallbackText ?? 'No content available yet.'}
          </p>
        )}

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You cannot edit the approved content. Add comments below for the
            Curator to review.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label htmlFor="creator-comment" className="text-sm font-medium">
            Your Comments
          </label>
          <Textarea
            id="creator-comment"
            placeholder="Add your feedback or questions for the Curator..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={isSaving}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Comment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatorCommentSection;
