import * as React from "react";
import { Loader2, Upload, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateLegalDocumentTemplate, LegalDocumentTemplate } from "@/hooks/queries/useLegalDocumentTemplates";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/errorHandler";

const ACCEPTED_TYPES = ".pdf,.docx,.doc";
const MAX_SIZE_MB = 10;
const BUCKET = "challenge-assets";

interface LegalTemplateFileUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: LegalDocumentTemplate;
}

export function LegalTemplateFileUpload({ open, onOpenChange, template }: LegalTemplateFileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const updateM = useUpdateLegalDocumentTemplate();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File exceeds ${MAX_SIZE_MB}MB limit`);
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `legal-templates/${template.document_type}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      await updateM.mutateAsync({
        template_id: template.template_id,
        default_template_url: urlData.publicUrl,
      } as Parameters<typeof updateM.mutateAsync>[0]);

      toast.success("File uploaded successfully");
      onOpenChange(false);
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error("Upload failed"), { operation: "upload_legal_template_file" });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Template File — {template.document_name}</DialogTitle>
          <DialogDescription>Upload a PDF or DOCX file for this legal template.</DialogDescription>
        </DialogHeader>

        {template.default_template_url && (
          <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/50">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">Current file uploaded</span>
            <a href={template.default_template_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">Upload new file</label>
          <Input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleUpload}
            disabled={isUploading}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">Accepted: PDF, DOCX. Max {MAX_SIZE_MB}MB.</p>
        </div>

        <DialogFooter>
          {isUploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
