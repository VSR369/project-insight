import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateLegalDocumentTemplate, LegalDocumentTemplate } from "@/hooks/queries/useLegalDocumentTemplates";
import { cn } from "@/lib/utils";

const MIN_CHARS = 500;

interface LegalTemplateContentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LegalDocumentTemplate;
}

export function LegalTemplateContentEditor({ open, onOpenChange, template }: LegalTemplateContentEditorProps) {
  const [content, setContent] = React.useState(template.template_content ?? "");
  const [showPreview, setShowPreview] = React.useState(false);
  const updateM = useUpdateLegalDocumentTemplate();

  React.useEffect(() => {
    if (open) {
      setContent(template.template_content ?? "");
      setShowPreview(false);
    }
  }, [open, template.template_content]);

  const charCount = content.length;
  const isValid = charCount >= MIN_CHARS;

  const handleSave = async () => {
    await updateM.mutateAsync({ template_id: template.template_id, template_content: content } as Parameters<typeof updateM.mutateAsync>[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Legal Content — {template.document_name}</DialogTitle>
          <DialogDescription>
            Full legal clause text (minimum {MIN_CHARS} characters). Supports Markdown formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 shrink-0">
          <Button variant={showPreview ? "outline" : "default"} size="sm" onClick={() => setShowPreview(false)}>
            Edit
          </Button>
          <Button variant={showPreview ? "default" : "outline"} size="sm" onClick={() => setShowPreview(true)}>
            Preview
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {showPreview ? (
            <div className="border rounded-md p-4 min-h-[300px]">
              <AiContentRenderer content={content} fallback="No content to preview" />
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter full legal clause text here. Markdown formatting is supported..."
              rows={20}
              className="min-h-[300px] font-mono text-sm"
              disabled={updateM.isPending}
            />
          )}
        </div>

        <div className="flex items-center justify-between shrink-0 pt-2">
          <span className={cn("text-xs", isValid ? "text-muted-foreground" : "text-destructive")}>
            {charCount} / {MIN_CHARS} min characters
            {!isValid && ` (${MIN_CHARS - charCount} more needed)`}
          </span>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateM.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || updateM.isPending}>
              {updateM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Content
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
