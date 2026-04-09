/**
 * CpaTemplateSection — 3 CPA template cards for org admin.
 */
import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CpaTemplateCard } from './CpaTemplateCard';
import { CpaVariableReference } from './CpaVariableReference';
import { useOrgCpaTemplates, useCreateOrgCpaTemplate, useUpdateOrgCpaTemplate } from '@/hooks/queries/useOrgCpaTemplates';
import {
  CPA_GOVERNANCE_MODES,
  CPA_CODE_MAP,
  CPA_DEFAULT_TEMPLATES,
  type CpaGovernanceMode,
} from '@/constants/cpaDefaults.constants';
import { DOCUMENT_CODE_LABELS, type DocumentCode } from '@/types/legal.types';

interface CpaTemplateSectionProps {
  organizationId: string;
  tenantId: string;
}

export function CpaTemplateSection({ organizationId, tenantId }: CpaTemplateSectionProps) {
  const { data: templates, isLoading } = useOrgCpaTemplates(organizationId);
  const createMut = useCreateOrgCpaTemplate();
  const updateMut = useUpdateOrgCpaTemplate();
  const [editMode, setEditMode] = useState<CpaGovernanceMode | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const templateByMode = (mode: CpaGovernanceMode) =>
    templates?.find((t) => t.document_code === CPA_CODE_MAP[mode]);

  const handleCreate = (mode: CpaGovernanceMode) => {
    setEditMode(mode);
    setEditContent(CPA_DEFAULT_TEMPLATES[mode]);
    setEditId(null);
  };

  const handleEdit = (id: string) => {
    const t = templates?.find((tmpl) => tmpl.id === id);
    if (!t) return;
    const mode = CPA_GOVERNANCE_MODES.find((m) => CPA_CODE_MAP[m] === t.document_code);
    if (!mode) return;
    setEditMode(mode);
    setEditContent(t.template_content ?? CPA_DEFAULT_TEMPLATES[mode]);
    setEditId(id);
  };

  const handleSave = () => {
    if (!editMode) return;
    const code = CPA_CODE_MAP[editMode];
    const label = DOCUMENT_CODE_LABELS[code as DocumentCode] ?? `CPA (${editMode})`;

    if (editId) {
      updateMut.mutate(
        { id: editId, organization_id: organizationId, template_content: editContent },
        { onSuccess: () => setEditMode(null) },
      );
    } else {
      createMut.mutate(
        {
          organization_id: organizationId,
          tenant_id: tenantId,
          document_name: label,
          document_code: code,
          applies_to_mode: editMode,
          template_content: editContent,
          version: '1.0',
          version_status: 'ACTIVE',
        },
        { onSuccess: () => setEditMode(null) },
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Challenge Participation Agreements</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Configure CPA templates for each governance mode. These are assembled per-challenge during legal review.
      </p>
      <CpaVariableReference />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {CPA_GOVERNANCE_MODES.map((mode) => (
          <CpaTemplateCard
            key={mode}
            mode={mode}
            template={templateByMode(mode)}
            onEdit={handleEdit}
            onCreate={handleCreate}
          />
        ))}
      </div>

      <Dialog open={editMode !== null} onOpenChange={(o) => !o && setEditMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Create'} CPA Template — {editMode}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
            <Label>Template Content</Label>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Use {{variable}} placeholders..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
