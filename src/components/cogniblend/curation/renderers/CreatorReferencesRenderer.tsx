/**
 * CreatorReferencesRenderer — Displays creator-uploaded reference documents
 * for the curation review panel. When not read-only, also renders the
 * SectionReferencePanel so the Curator can upload/add references.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2 } from "lucide-react";
import { CACHE_STANDARD } from "@/config/queryCache";
import { handleQueryError } from "@/lib/errorHandler";
import { SectionReferencePanel } from "@/components/cogniblend/curation/SectionReferencePanel";

interface CreatorAttachment {
  id: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  created_at: string | null;
}

interface CreatorReferencesRendererProps {
  challengeId: string;
  isReadOnly?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeLabel(mime: string | null): string {
  if (!mime) return "";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("docx")) return "DOCX";
  if (mime.includes("spreadsheet") || mime.includes("xlsx")) return "XLSX";
  if (mime.includes("csv")) return "CSV";
  if (mime.startsWith("image/")) return mime.split("/")[1]?.toUpperCase() || "Image";
  return mime.split("/").pop()?.toUpperCase() || "";
}

export function CreatorReferencesRenderer({
  challengeId,
  isReadOnly = true,
}: CreatorReferencesRendererProps) {
  const { data: attachments = [], isLoading, error } = useQuery({
    queryKey: ["creator-attachments", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from("challenge_attachments")
        .select("id, file_name, file_size, mime_type, storage_path, created_at")
        .eq("challenge_id", challengeId)
        .eq("section_key", "creator_reference")
        .order("created_at");
      if (queryError) {
        handleQueryError(queryError, { operation: "fetch_creator_attachments" });
        throw queryError;
      }
      return (data ?? []) as CreatorAttachment[];
    },
    ...CACHE_STANDARD,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading reference documents…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load reference documents.</p>;
  }

  const handleDownload = async (att: CreatorAttachment) => {
    if (!att.storage_path) return;
    const { data, error: signError } = await supabase.storage
      .from("challenge-attachments")
      .createSignedUrl(att.storage_path, 3600);
    if (signError || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Creator-uploaded attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.file_name || "Untitled"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {att.mime_type && (
                    <Badge variant="secondary" className="text-[10px]">{getMimeLabel(att.mime_type)}</Badge>
                  )}
                  {att.file_size && (
                    <span className="text-xs text-muted-foreground">{formatFileSize(att.file_size)}</span>
                  )}
                  {att.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(att.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-7"
                onClick={() => handleDownload(att)}
                disabled={!att.storage_path}
              >
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No reference documents uploaded by Creator.</p>
      )}

      {/* Curator upload/URL panel — shown when editable */}
      {!isReadOnly && (
        <SectionReferencePanel
          challengeId={challengeId}
          sectionKey="creator_references"
        />
      )}
    </div>
  );
}
