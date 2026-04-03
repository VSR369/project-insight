/**
 * LegalDocumentCard — Single card for a document code in the list page.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';
import { DOCUMENT_CODE_LABELS } from '@/types/legal.types';

interface LegalDocumentCardProps {
  code: DocumentCode;
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
  onCreate: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export function LegalDocumentCard({ code, templates, onEdit, onCreate }: LegalDocumentCardProps) {
  const active = templates.find((t) => t.version_status === 'ACTIVE');
  const draft = templates.find((t) => t.version_status === 'DRAFT');
  const primary = active ?? draft;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
          </div>
          {primary && (
            <Badge className={`text-xs ${STATUS_COLORS[primary.version_status] ?? ''}`}>
              {primary.version_status}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-1">{DOCUMENT_CODE_LABELS[code]}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        {primary ? (
          <>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Version: {primary.version}</p>
              {primary.summary && <p className="line-clamp-2">{primary.summary}</p>}
              {primary.updated_at && (
                <p>Updated: {format(new Date(primary.updated_at), 'MMM d, yyyy')}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(primary.template_id)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              {draft && draft.template_id !== primary.template_id && (
                <Button size="sm" variant="ghost" onClick={() => onEdit(draft.template_id)}>
                  Edit Draft
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">Not configured</p>
            <Button size="sm" onClick={onCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
