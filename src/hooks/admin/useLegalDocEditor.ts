/**
 * useLegalDocEditor — Manages save/publish/auto-save logic for legal doc editor.
 * Supports IPAA section-based editing via the sections JSONB column.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useLegalDocTemplateById,
  useSaveLegalDocDraft,
  usePublishLegalDoc,
  useCreateLegalDocTemplate,
} from '@/hooks/queries/useLegalDocumentTemplates';
import type { DocumentCode, LegalDocTemplate } from '@/types/legal.types';
import type { IpaaSectionKey } from '@/components/admin/legal/LegalDocSectionTabs';

const AUTO_SAVE_INTERVAL_MS = 30_000;

interface SectionContent {
  html: string;
  json: Record<string, unknown> | null;
}

interface EditorState {
  content: string;
  contentJson: Record<string, unknown> | null;
  sections: Record<string, SectionContent>;
}

interface UseEditorParams {
  templateId?: string;
  isNew: boolean;
  defaultCode: DocumentCode;
}

function parseSections(
  raw: Record<string, unknown> | null | undefined
): Record<string, SectionContent> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<string, SectionContent> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val && typeof val === 'object' && 'html' in (val as Record<string, unknown>)) {
      const v = val as Record<string, unknown>;
      result[key] = { html: (v.html as string) ?? '', json: (v.json as Record<string, unknown>) ?? null };
    } else if (typeof val === 'string') {
      result[key] = { html: val, json: null };
    }
  }
  return result;
}

export function useLegalDocEditor({ templateId, isNew, defaultCode }: UseEditorParams) {
  const navigate = useNavigate();
  const { data: template, isLoading } = useLegalDocTemplateById(isNew ? undefined : templateId);
  const saveDraft = useSaveLegalDocDraft();
  const publishDoc = usePublishLegalDoc();
  const createDoc = useCreateLegalDocTemplate();

  const [editorState, setEditorState] = React.useState<EditorState>({
    content: '',
    contentJson: null,
    sections: {},
  });
  const [config, setConfig] = React.useState<Partial<LegalDocTemplate>>({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [showPublish, setShowPublish] = React.useState(false);
  const [contentVersion, setContentVersion] = React.useState(0);

  // Sync template data into local state
  React.useEffect(() => {
    if (template) {
      setEditorState({
        content: template.content ?? template.template_content ?? '',
        contentJson: template.content_json ?? null,
        sections: parseSections(template.sections),
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
      setIsDirty(false);
    }
  }, [template]);

  const handleContentChange = (html: string, json: Record<string, unknown> | null) => {
    setEditorState((prev) => ({ ...prev, content: html, contentJson: json }));
    setIsDirty(true);
  };

  /** Update content for a specific IPAA section */
  const handleSectionContentChange = (
    section: IpaaSectionKey,
    html: string,
    json: Record<string, unknown> | null
  ) => {
    setEditorState((prev) => ({
      ...prev,
      sections: { ...prev.sections, [section]: { html, json } },
    }));
    setIsDirty(true);
  };

  /** Get content for a specific IPAA section */
  const getSectionContent = (section: IpaaSectionKey): string => {
    return editorState.sections[section]?.html ?? '';
  };

  const setUploadedContent = (html: string) => {
    setEditorState((prev) => ({ ...prev, content: html, contentJson: null }));
    setIsDirty(true);
    setContentVersion((v) => v + 1);
  };

  /** Build sections JSONB for save */
  const buildSectionsPayload = (): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(editorState.sections)) {
      result[key] = { html: val.html, json: val.json };
    }
    return result;
  };

  const handleSave = React.useCallback(async () => {
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
        sections: buildSectionsPayload(),
        ...config,
      } as Partial<LegalDocTemplate>);
      navigate(`/admin/legal-documents/${result.template_id}/edit`, { replace: true });
    } else {
      await saveDraft.mutateAsync({
        template_id: templateId!,
        content: editorState.content,
        content_json: editorState.contentJson,
        sections: buildSectionsPayload(),
        ...config,
      });
    }
    setIsDirty(false);
  }, [isNew, templateId, editorState, config, defaultCode, createDoc, saveDraft, navigate]);

  const handlePublish = async () => {
    if (!templateId || !template?.document_code) return;
    await publishDoc.mutateAsync({
      template_id: templateId,
      document_code: template.document_code,
    });
    setShowPublish(false);
  };

  // Auto-save every 30 seconds when dirty and not new
  React.useEffect(() => {
    if (isNew || !isDirty) return;
    const timer = setInterval(() => {
      handleSave();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isNew, isDirty, handleSave]);

  const isSaving = saveDraft.isPending || createDoc.isPending;
  const currentCode = template?.document_code ?? defaultCode;

  return {
    template,
    isLoading,
    editorState,
    config,
    setConfig,
    isDirty,
    isSaving,
    currentCode,
    showPublish,
    setShowPublish,
    contentVersion,
    handleContentChange,
    handleSectionContentChange,
    getSectionContent,
    setUploadedContent,
    handleSave,
    handlePublish,
    isPublishing: publishDoc.isPending,
  };
}
