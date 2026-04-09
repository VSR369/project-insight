/**
 * LegacyDocumentsSection — Collapsed section showing archived legacy documents.
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';
import { DOCUMENT_CODE_LABELS } from '@/types/legal.types';

const LEGACY_CODES: DocumentCode[] = ['PMA', 'CA', 'PSA', 'IPAA', 'EPIA'];

interface LegacyDocumentsSectionProps {
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
}

export function LegacyDocumentsSection({ templates, onEdit }: LegacyDocumentsSectionProps) {
  const [open, setOpen] = useState(false);

  const legacyTemplates = templates.filter(
    (t) => t.document_code && LEGACY_CODES.includes(t.document_code as DocumentCode),
  );

  if (legacyTemplates.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Archive className="h-4 w-4" />
          <span>Legacy Documents (archived)</span>
          <Badge variant="secondary" className="ml-auto text-xs">{legacyTemplates.length}</Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 pl-10 opacity-60">
          {legacyTemplates.map((t) => (
            <div
              key={t.template_id}
              className="flex items-center justify-between rounded border border-dashed p-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{t.document_code}</Badge>
                <span>{DOCUMENT_CODE_LABELS[t.document_code as DocumentCode] ?? t.document_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">ARCHIVED</Badge>
                <Button size="sm" variant="ghost" onClick={() => onEdit(t.template_id)}>
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
