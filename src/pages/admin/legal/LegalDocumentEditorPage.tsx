/**
 * LegalDocumentEditorPage — Full-screen editor for legal documents.
 * Route: /admin/legal-documents/:templateId/edit or /admin/legal-documents/new
 */
import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLegalDocTemplateById, useSaveLegalDocDraft, usePublishLegalDoc, useCreateLegalDocTemplate } from '@/hooks/queries/useLegalDocumentTemplates';
import { LegalDocEditorPanel } from '@/components/admin/legal/LegalDocEditorPanel';
import { LegalDocConfigSidebar } from '@/components/admin/legal/LegalDocConfigSidebar';
import { LegalDocPublishDialog } from '@/components/admin/legal/LegalDocPublishDialog';
import type { DocumentCode, LegalDocTemplate } from '@/types/legal.types';

export default function LegalDocumentEditorPage() {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !templateId || templateId === 'new';
  const defaultCode = (searchParams.get('code') as DocumentCode) ?? 'PMA';

  const { data: template, isLoading } = useLegalDocTemplateById(isNew ? undefined : templateId);
  const saveDraft = useSaveLegalDocDraft();
  const publishDoc = usePublishLegalDoc();
  const createDoc = useCreateLegalDocTemplate();
  const [showPublish, setShowPublish] = React.useState(false);

  const [editorState, setEditorState] = React.useState<{
    content: string;
    contentJson: Record<string, unknown> | null;
  }>({ content: '', contentJson: null });

  const [config, setConfig] = React.useState<Partial<LegalDocTemplate>>({});

  React.useEffect(() => {
    if (template) {
      setEditorState({
        content: template.content ?? template.template_content ?? '',
        contentJson: template.content_json ?? null,
      });
      setConfig({
        document_name: template.document_name,
        summary: template.summary,
        applies_to_roles: template.applies_to_roles,
        applies_to_model: template.applies_to_model,
        applies_to_mode: template.applies_to_mode,
        is_mandatory: template.is_mandatory,
        effective_date: template.effective_date,
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (isNew) {
      const result = await createDoc.mutateAsync({
        document_code: defaultCode,
        document_type: defaultCode.toLowerCase(),
        document_name: config.document_name ?? `New ${defaultCode} Document`,
        tier: 'TIER_1',
        version: '1.0',
        version_status: 'DRAFT',
        content: editorState.content,
        content_json: editorState.contentJson,
        ...config,
      } as Partial<LegalDocTemplate>);
      navigate(`/admin/legal-documents/${result.template_id}/edit`, { replace: true });
    } else {
      await saveDraft.mutateAsync({
        template_id: templateId!,
        content: editorState.content,
        content_json: editorState.contentJson,
        ...config,
      });
    }
  };

  const handlePublish = async () => {
    if (!templateId || !template?.document_code) return;
    await publishDoc.mutateAsync({
      template_id: templateId,
      document_code: template.document_code,
    });
    setShowPublish(false);
  };

  const currentCode = template?.document_code ?? defaultCode;
  const isSaving = saveDraft.isPending || createDoc.isPending;

  if (isLoading && !isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b flex items-center gap-3 px-4 shrink-0 bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/legal-documents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Badge variant="outline" className="font-mono">{currentCode}</Badge>
        <span className="font-medium truncate">
          {config.document_name ?? template?.document_name ?? 'New Document'}
        </span>
        {template && <Badge variant="secondary">v{template.version}</Badge>}
        {template && (
          <Badge className="text-xs" variant={template.version_status === 'ACTIVE' ? 'default' : 'outline'}>
            {template.version_status}
          </Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={() => setShowPublish(true)} disabled={isNew || publishDoc.isPending}>
            Publish
          </Button>
        </div>
      </div>

      {/* Editor + Sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <LegalDocEditorPanel
            content={editorState.content}
            onContentChange={(html, json) => setEditorState({ content: html, contentJson: json })}
          />
        </div>
        <div className="w-80 border-l shrink-0 overflow-y-auto hidden lg:block">
          <LegalDocConfigSidebar config={config} onChange={setConfig} templateId={templateId} />
        </div>
      </div>

      <LegalDocPublishDialog
        open={showPublish}
        onOpenChange={setShowPublish}
        onConfirm={handlePublish}
        isLoading={publishDoc.isPending}
      />
    </div>
  );
}
