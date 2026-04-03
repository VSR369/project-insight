/**
 * LegalDocVersionHistory — Lists previous versions for the current document_code.
 */
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLegalDocTemplateById, useLegalDocumentTemplates } from '@/hooks/queries/useLegalDocumentTemplates';

interface LegalDocVersionHistoryProps {
  templateId: string;
}

export function LegalDocVersionHistory({ templateId }: LegalDocVersionHistoryProps) {
  const { data: current } = useLegalDocTemplateById(templateId);
  const { data: all = [] } = useLegalDocumentTemplates(true);

  if (!current?.document_code) return null;

  const versions = all
    .filter((t) => t.document_code === current.document_code)
    .sort((a, b) => b.version.localeCompare(a.version));

  if (versions.length <= 1) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Version History</h3>
        <p className="text-xs text-muted-foreground">No previous versions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Version History</h3>
      <div className="space-y-1.5">
        {versions.map((v) => (
          <div key={v.template_id} className="flex items-center justify-between text-xs">
            <span className={v.template_id === templateId ? 'font-medium' : 'text-muted-foreground'}>
              v{v.version}
            </span>
            <Badge variant="outline" className="text-[10px] h-5">
              {v.version_status}
            </Badge>
            <span className="text-muted-foreground">
              {v.updated_at ? format(new Date(v.updated_at), 'MMM d, yy') : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
