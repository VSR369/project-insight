/**
 * LegalDocumentEditorPage — Full-screen editor for legal documents.
 * Route: /admin/legal-documents/:templateId/edit or /admin/legal-documents/new
 */
import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLegalDocEditor } from '@/hooks/admin/useLegalDocEditor';
import { LegalDocEditorPanel } from '@/components/admin/legal/LegalDocEditorPanel';
import { LegalDocConfigSidebar } from '@/components/admin/legal/LegalDocConfigSidebar';
import { LegalDocPublishDialog } from '@/components/admin/legal/LegalDocPublishDialog';
import { LegalDocUploadHandler } from '@/components/admin/legal/LegalDocUploadHandler';
import { LegalDocSectionTabs } from '@/components/admin/legal/LegalDocSectionTabs';
import type { DocumentCode } from '@/types/legal.types';
import type { IpaaSectionKey } from '@/components/admin/legal/LegalDocSectionTabs';

export default function LegalDocumentEditorPage() {
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !templateId || templateId === 'new';
  const defaultCode = (searchParams.get('code') as DocumentCode) ?? 'PMA';

  const editor = useLegalDocEditor({ templateId, isNew, defaultCode });
  const [activeSection, setActiveSection] = React.useState<IpaaSectionKey>('abstract');
  const isIPAA = editor.currentCode === 'IPAA';

  const handleUploadContent = (html: string, fileName: string, storageUrl: string | null) => {
    editor.setUploadedContent(html);
    editor.setConfig((prev) => ({
      ...prev,
      ...(storageUrl ? { original_file_url: storageUrl, original_file_name: fileName } : {}),
    }));
  };

  if (editor.isLoading && !isNew) {
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
        <Badge variant="outline" className="font-mono">{editor.currentCode}</Badge>
        <span className="font-medium truncate">
          {editor.config.document_name ?? editor.template?.document_name ?? 'New Document'}
        </span>
        {editor.template && <Badge variant="secondary">v{editor.template.version}</Badge>}
        {editor.template && (
          <Badge className="text-xs" variant={editor.template.version_status === 'ACTIVE' ? 'default' : 'outline'}>
            {editor.template.version_status}
          </Badge>
        )}
        {editor.isDirty && (
          <span className="text-xs text-muted-foreground italic">unsaved</span>
        )}
        <div className="ml-auto flex gap-2">
          <LegalDocUploadHandler
            templateId={templateId}
            hasContent={editor.editorState.content.length > 0}
            onContentUploaded={handleUploadContent}
          />
          <Button variant="outline" size="sm" onClick={editor.handleSave} disabled={editor.isSaving}>
            {editor.isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={() => editor.setShowPublish(true)} disabled={isNew || editor.isPublishing}>
            Publish
          </Button>
        </div>
      </div>

      {/* IPAA section tabs */}
      {isIPAA && (
        <LegalDocSectionTabs activeSection={activeSection} onSectionChange={setActiveSection} />
      )}

      {/* Editor + Sidebar */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <LegalDocEditorPanel
            content={editor.editorState.content}
            onContentChange={editor.handleContentChange}
          />
        </div>
        <div className="w-80 border-l shrink-0 overflow-y-auto hidden lg:block">
          <LegalDocConfigSidebar config={editor.config} onChange={editor.setConfig} templateId={templateId} />
        </div>
      </div>

      <LegalDocPublishDialog
        open={editor.showPublish}
        onOpenChange={editor.setShowPublish}
        onConfirm={editor.handlePublish}
        isLoading={editor.isPublishing}
      />
    </div>
  );
}
