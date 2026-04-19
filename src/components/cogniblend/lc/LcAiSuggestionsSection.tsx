/**
 * LcAiSuggestionsSection — Generate CTA + AI suggestion document cards
 * (Textarea editing, file upload, Accept/Save/Dismiss). Preserves the
 * legacy individual-doc workflow verbatim. Mutations live in the page.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import {
  FILE_UPLOAD_CONFIG,
  type DocEditState,
  type SuggestedDoc,
} from '@/lib/cogniblend/lcLegalHelpers';

export interface LcAiSuggestionsSectionProps {
  isLC: boolean;
  generating: boolean;
  generateError: string | null;
  hasSuggestions: boolean;
  totalAccepted: number;
  suggestionsLoading: boolean;
  visibleSuggestions: SuggestedDoc[];
  onGenerate: () => void;
  getDocEdit: (docType: string) => DocEditState;
  updateDocEdit: (docType: string, field: keyof DocEditState, value: string | File | null) => void;
  initDocContent: (doc: SuggestedDoc) => void;
  onAccept: (doc: SuggestedDoc) => void;
  onSaveContent: (doc: SuggestedDoc) => void;
  onDismiss: (docId: string) => void;
  isAccepting: boolean;
  savingContent: string | null;
  openCards: Set<string>;
  onToggleCard: (docType: string) => void;
}

export function LcAiSuggestionsSection({
  isLC,
  generating,
  generateError,
  hasSuggestions,
  totalAccepted,
  suggestionsLoading,
  visibleSuggestions,
  onGenerate,
  getDocEdit,
  updateDocEdit,
  initDocContent,
  onAccept,
  onSaveContent,
  onDismiss,
  isAccepting,
  savingContent,
  openCards,
  onToggleCard,
}: LcAiSuggestionsSectionProps) {
  return (
    <>
      {isLC && !generating && !suggestionsLoading && !hasSuggestions && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="py-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {totalAccepted > 0 ? 'Generate Additional Legal Documents' : 'Ready to Generate Legal Documents'}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              AI will analyze the challenge specification above — maturity level, IP model, governance
              profile — and generate complete legal documents with full clauses ready for review.
            </p>
            <Button onClick={onGenerate} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Legal Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">AI is generating comprehensive legal documents…</p>
          </CardContent>
        </Card>
      )}

      {generateError && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">Failed to generate AI suggestions</p>
            <p className="text-xs text-muted-foreground mt-1">{generateError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onGenerate}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {hasSuggestions && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">AI Legal Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {visibleSuggestions.length} document{visibleSuggestions.length !== 1 ? 's' : ''} recommended for this challenge.
                </p>
              </div>
            </CardContent>
          </Card>

          {visibleSuggestions.map((doc) => {
            const isOpen = openCards.has(doc.document_type);
            const edit = getDocEdit(doc.document_type);

            return (
              <Collapsible
                key={doc.document_type}
                open={isOpen}
                onOpenChange={() => {
                  onToggleCard(doc.document_type);
                  initDocContent(doc);
                }}
              >
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="py-3 flex items-center gap-3 cursor-pointer">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{doc.title}</span>
                          <Badge variant={doc.priority === 'required' ? 'default' : 'secondary'} className="text-[10px]">
                            {doc.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Tier {doc.tier}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.rationale}</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t pt-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          Document Content
                        </label>
                        <Textarea
                          value={edit.content || doc.content_summary}
                          onChange={(e) => updateDocEdit(doc.document_type, 'content', e.target.value)}
                          className="text-sm min-h-[300px] font-mono"
                          placeholder="AI-generated legal document — edit as needed…"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          Upload Document (optional)
                        </label>
                        <FileUploadZone
                          config={FILE_UPLOAD_CONFIG}
                          value={edit.file}
                          onChange={(file) => updateDocEdit(doc.document_type, 'file', file)}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          LC Review Notes
                        </label>
                        <Textarea
                          placeholder="Add notes about modifications, special clauses…"
                          value={edit.notes}
                          onChange={(e) => updateDocEdit(doc.document_type, 'notes', e.target.value)}
                          className="text-sm"
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => onAccept(doc)} disabled={isAccepting}>
                          {isAccepting ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          Accept & Attach
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSaveContent(doc)}
                          disabled={savingContent === doc.document_type}
                        >
                          {savingContent === doc.document_type ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save Edits
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDismiss(doc.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </>
  );
}

export default LcAiSuggestionsSection;
