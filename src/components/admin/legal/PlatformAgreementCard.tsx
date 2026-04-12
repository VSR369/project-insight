/**
 * PlatformAgreementCard — Card for SPA/SKPA/PWA platform agreements.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { LegalDocTemplate, DocumentCode } from '@/types/legal.types';
import { DOCUMENT_CODE_LABELS } from '@/types/legal.types';

interface PlatformAgreementCardProps {
  code: DocumentCode;
  templates: LegalDocTemplate[];
  onEdit: (id: string) => void;
  onCreate: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  solver: 'Solution Providers',
  seeker: 'Seekers',
};

export function PlatformAgreementCard({ code, templates, onEdit, onCreate }: PlatformAgreementCardProps) {
  const active = templates.find((t) => t.version_status === 'ACTIVE');
  const draft = templates.find((t) => t.version_status === 'DRAFT');
  const primary = active ?? draft;
  const hasContent = primary?.content || primary?.template_content;
  const roles = primary?.applies_to_roles ?? [];

  return (
    <Card className="flex flex-col border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="font-mono text-xs">{code}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {!hasContent && primary && (
              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Content needed
              </Badge>
            )}
            {primary && (
              <Badge className={`text-xs ${primary.version_status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                {primary.version_status}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-1">{DOCUMENT_CODE_LABELS[code]}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        {primary ? (
          <>
            <div className="space-y-1 text-sm text-muted-foreground">
              {primary.summary && <p className="line-clamp-2">{primary.summary}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <span>v{primary.version}</span>
                {roles.length > 0 && (
                  <span>· {roles.map((r) => ROLE_LABELS[r] ?? r).join(', ')}</span>
                )}
              </div>
              {primary.updated_at && (
                <p>Updated: {format(new Date(primary.updated_at), 'MMM d, yyyy')}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(primary.template_id)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                <span className="hidden lg:inline">Edit</span>
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
