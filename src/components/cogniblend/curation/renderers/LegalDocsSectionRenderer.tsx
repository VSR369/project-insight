/**
 * LegalDocsSectionRenderer — Display for legal documents in curation view.
 * Phase 3+: Shows actual challenge_legal_docs rows.
 * Phase 2: Shows planned legal template previews when no docs exist yet.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, CheckCircle2, Eye, Clock } from "lucide-react";
import type { LegalTemplatePreview } from "@/hooks/queries/useLegalTemplatePreview";

interface LegalDocDetail {
  id: string;
  document_type: string;
  document_name: string | null;
  content_summary: string | null;
  lc_status: string | null;
  status: string | null;
  tier: string;
}

function LcStatusBadge({ status }: { status: string | null }) {
  if (status === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
        <ShieldCheck className="h-3 w-3 mr-1" />Approved
      </Badge>
    );
  if (status === "rejected")
    return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>;
}

interface LegalDocsSectionRendererProps {
  documents: LegalDocDetail[];
  governanceMode?: 'QUICK' | 'STRUCTURED' | 'CONTROLLED';
  onAcceptAllDefaults?: () => void;
  isAcceptingAll?: boolean;
  /** Phase 2 planned template previews (when no actual docs exist) */
  templatePreviews?: LegalTemplatePreview[];
}

export function LegalDocsSectionRenderer({
  documents,
  governanceMode,
  onAcceptAllDefaults,
  isAcceptingAll,
  templatePreviews,
}: LegalDocsSectionRendererProps) {
  // Phase 2: show planned templates when no actual docs
  if ((!documents || documents.length === 0) && templatePreviews && templatePreviews.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-2.5">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Legal documents will be assembled after curation review is complete.
          </p>
          <Badge variant="outline" className="text-[10px] ml-auto shrink-0">Planned</Badge>
        </div>
        {templatePreviews.map((t) => (
          <div key={t.template_id} className="border border-dashed border-border rounded-md p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {t.document_name}
                </span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {t.tier.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.is_mandatory && (
                  <Badge variant="secondary" className="text-[10px]">Required</Badge>
                )}
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Eye className="h-3 w-3" /> Preview
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No legal documents found.</p>;
  }

  const hasPendingDefaults = documents.some(
    (d) => d.status === 'ai_suggested' || d.status === 'default_applied'
  );
  const showBulkAccept =
    governanceMode === 'STRUCTURED' && hasPendingDefaults && onAcceptAllDefaults;

  return (
    <div className="space-y-3">
      {showBulkAccept && (
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-2.5">
          <p className="text-xs text-muted-foreground">
            Accept all suggested legal documents at once
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onAcceptAllDefaults}
            disabled={isAcceptingAll}
            className="gap-1.5 text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isAcceptingAll ? 'Accepting…' : 'Accept All Defaults'}
          </Button>
        </div>
      )}

      {documents.map((doc) => (
        <div key={doc.id} className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {doc.document_name || doc.document_type}
              </span>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {doc.tier.replace("_", " ")}
              </Badge>
            </div>
            <LcStatusBadge status={doc.lc_status} />
          </div>
          {doc.content_summary && (
            <p className="text-xs text-muted-foreground leading-relaxed pl-6">
              {doc.content_summary}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}