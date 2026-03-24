/**
 * LegalDocsSectionRenderer — Read-only display for legal documents.
 * Used for: legal_docs (always read-only)
 */

import { Badge } from "@/components/ui/badge";
import { FileText, ShieldCheck } from "lucide-react";

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
}

export function LegalDocsSectionRenderer({ documents }: LegalDocsSectionRendererProps) {
  if (!documents || documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No legal documents found.</p>;
  }

  return (
    <div className="space-y-3">
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
