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
import { DOCUMENT_CODE_LABELS } from '@/types/legal.types';
import { getDefaultTemplateContent } from '@/constants/legalDefaults.constants';
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

  // Seed config defaults for the "new" path so the sidebar reflects the URL ?code=
  // parameter (e.g. PRIVACY_POLICY / DPA) instead of falling back to a stale literal.
  const didInitNewRef = React.useRef(false);
  React.useEffect(() => {
    if (!isNew || didInitNewRef.current) return;
    didInitNewRef.current = true;
    setConfig({
      document_code: defaultCode,
      document_name: DOCUMENT_CODE_LABELS[defaultCode] ?? '',
      applies_to_model: 'BOTH',
      applies_to_mode: 'ALL',
      applies_to_roles: ['ALL'],
      is_mandatory: true,
    });
    // Pre-fill the canvas with a starter template for codes that have one
    // (RA_R2 + CPA_*). Markdown is rendered as plain text by TipTap; admins
    // can re-format with the toolbar — far better than starting empty.
    const seed = getDefaultTemplateContent(defaultCode);
    if (seed) {
      setEditorState((prev) => ({ ...prev, content: seed, contentJson: null }));
      setIsDirty(true);
      setContentVersion((v) => v + 1);
    }
  }, [isNew, defaultCode]);

  // Sync template data into local state. Bump contentVersion so the TipTap
  // editor reseeds itself once the async query resolves (otherwise the canvas
  // stays empty even though the saved HTML is in state).
  React.useEffect(() => {
    if (template) {
      setEditorState({
        // Prefer template_content (canonical) then fall back to legacy `content`.
        content: template.template_content ?? template.content ?? '',
        contentJson: template.content_json ?? null,
        sections: parseSections(template.sections),
      });
      setConfig({
        document_code: template.document_code,
        document_name: template.document_name,
        description: template.description,
        summary: template.summary,
        applies_to_roles: template.applies_to_roles,
        applies_to_model: template.applies_to_model,
        applies_to_mode: template.applies_to_mode,
        is_mandatory: template.is_mandatory,
        effective_date: template.effective_date,
      });
      setIsDirty(false);
      setContentVersion((v) => v + 1);
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

  // Track the persisted template id (set after first create for "new" path)
  const [persistedId, setPersistedId] = React.useState<string | undefined>(
    isNew ? undefined : templateId
  );
  React.useEffect(() => {
    if (!isNew && templateId) setPersistedId(templateId);
  }, [isNew, templateId]);

  const savingRef = React.useRef(false);

  const handleSave = React.useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const effectiveCode = (config.document_code as DocumentCode) ?? defaultCode;
      const targetId = persistedId ?? (isNew ? undefined : templateId);
      if (!targetId) {
        const result = await createDoc.mutateAsync({
          document_code: effectiveCode,
          document_type: effectiveCode.toLowerCase(),
          document_name: config.document_name ?? `New ${effectiveCode} Document`,
          tier: 'TIER_1',
          version: '1.0',
          version_status: 'DRAFT',
          content: editorState.content,
          content_json: editorState.contentJson,
          sections: buildSectionsPayload(),
          ...config,
        } as Partial<LegalDocTemplate>);
        setPersistedId(result.template_id);
        // Update URL silently so Publish + subsequent saves target this row
        navigate(`/admin/legal-documents/${result.template_id}/edit`, { replace: true });
      } else {
        await saveDraft.mutateAsync({
          template_id: targetId,
          content: editorState.content,
          content_json: editorState.contentJson,
          sections: buildSectionsPayload(),
          ...config,
        });
      }
      setIsDirty(false);
    } finally {
      savingRef.current = false;
    }
  }, [isNew, templateId, persistedId, editorState, config, defaultCode, createDoc, saveDraft, navigate]);

  const handlePublish = async () => {
    // Prefer the in-editor config (freshest) — template can be stale until
    // its query refetches after the first create.
    const code = (config.document_code ?? template?.document_code ?? defaultCode) as string;
    // Persist any pending edits first. handleSave will create the row if new
    // and update persistedId synchronously.
    if (isDirty || !persistedId) {
      await handleSave();
    }
    // Re-read after save so we hit the row that was just created.
    const targetId = persistedId ?? templateId;
    if (!targetId) {
      // Could not persist — abort silently, save flow already surfaced toast.
      return;
    }
    await publishDoc.mutateAsync({
      template_id: targetId,
      document_code: code,
    });
    setShowPublish(false);
  };

  // Auto-save (debounced) whenever dirty — covers both new and existing docs
  React.useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 2_000);
    return () => clearTimeout(timer);
  }, [isDirty, editorState, config, handleSave]);

  // Periodic safety net for long editing sessions
  React.useEffect(() => {
    if (!isDirty) return;
    const timer = setInterval(() => {
      handleSave();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isDirty, handleSave]);

  const isSaving = saveDraft.isPending || createDoc.isPending;
  const currentCode = template?.document_code ?? (config.document_code as DocumentCode) ?? defaultCode;
  const canPublish = !!(persistedId ?? (!isNew && templateId));

  return {
    template,
    isLoading,
    editorState,
    config,
    setConfig,
    isDirty,
    isSaving,
    currentCode,
    canPublish,
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
