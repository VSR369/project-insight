/**
 * CpaTemplateCard — Card for a single CPA governance mode template.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { OrgCpaTemplateRow } from '@/hooks/queries/useOrgCpaTemplates';
import {
  CPA_MODE_COLORS,
  CPA_MODE_DESCRIPTIONS,
  type CpaGovernanceMode,
} from '@/constants/cpaDefaults.constants';

interface CpaTemplateCardProps {
  mode: CpaGovernanceMode;
  template: OrgCpaTemplateRow | undefined;
  onEdit: (id: string) => void;
  onCreate: (mode: CpaGovernanceMode) => void;
}

export function CpaTemplateCard({ mode, template, onEdit, onCreate }: CpaTemplateCardProps) {
  const wordCount = template?.template_content
    ? template.template_content.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Badge variant="outline" className={`text-xs ${CPA_MODE_COLORS[mode]}`}>
              {mode}
            </Badge>
          </div>
          {template && (
            <Badge className="text-xs" variant={template.version_status === 'ACTIVE' ? 'default' : 'secondary'}>
              {template.version_status}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-1">CPA — {mode}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {CPA_MODE_DESCRIPTIONS[mode]}
        </p>
        {template ? (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>v{template.version}</span>
              <span>·</span>
              <span>{wordCount} words</span>
              {template.updated_at && (
                <>
                  <span>·</span>
                  <span>{format(new Date(template.updated_at), 'MMM d, yyyy')}</span>
                </>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => onEdit(template.id)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              <span className="hidden lg:inline">Edit Template</span>
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => onCreate(mode)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Template
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
