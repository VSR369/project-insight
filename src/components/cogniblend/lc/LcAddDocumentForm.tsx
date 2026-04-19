/**
 * LcAddDocumentForm — Collapsible "Add Legal Document Manually" form.
 * Pure presentation; submission and uploads are owned by the page orchestrator.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Loader2, Plus } from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import {
  DOCUMENT_TYPES,
  FILE_UPLOAD_CONFIG,
} from '@/lib/cogniblend/lcLegalHelpers';

export interface LcAddDocumentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onTitleChange: (v: string) => void;
  docType: string;
  onDocTypeChange: (v: string) => void;
  tier: string;
  onTierChange: (v: string) => void;
  content: string;
  onContentChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function LcAddDocumentForm(props: LcAddDocumentFormProps) {
  const {
    open, onOpenChange, title, onTitleChange, docType, onDocTypeChange,
    tier, onTierChange, content, onContentChange, notes, onNotesChange,
    file, onFileChange, onSubmit, submitting,
  } = props;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          Add Legal Document Manually
          <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Document Title *
                </label>
                <Input
                  placeholder="e.g., Non-Disclosure Agreement"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Document Type *
                </label>
                <Select value={docType} onValueChange={onDocTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Tier
              </label>
              <Select value={tier} onValueChange={onTierChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIER_1">Tier 1 — Entry/Participation</SelectItem>
                  <SelectItem value="TIER_2">Tier 2 — Solution/Award</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Document Content
              </label>
              <Textarea
                placeholder="Paste or write the full legal document content here…"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="text-sm min-h-[160px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                Upload Document (optional)
              </label>
              <FileUploadZone
                config={FILE_UPLOAD_CONFIG}
                value={file}
                onChange={onFileChange}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                LC Notes (optional)
              </label>
              <Textarea
                placeholder="Add notes about this document…"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="text-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={onSubmit} disabled={submitting || !title || !docType}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Document
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default LcAddDocumentForm;
