/**
 * useLcLegalActions — Shared mutations + edit state for any actor (LC or
 * Curator-in-STRUCTURED) working the legal-docs surface. Extracted from
 * LcLegalWorkspacePage so CuratorComplianceTab can reuse the exact same
 * Accept / Save / Dismiss / Add-Document behaviour.
 */
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import type { DocEditState, SuggestedDoc } from '@/lib/cogniblend/lcLegalHelpers';

interface UseLcLegalActionsArgs {
  challengeId: string | undefined;
  userId: string | undefined;
  maturityLevel?: string | null;
}

export function useLcLegalActions({
  challengeId,
  userId,
  maturityLevel,
}: UseLcLegalActionsArgs) {
  const queryClient = useQueryClient();

  // ── Generate ──
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ── Card edit state ──
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [docEdits, setDocEdits] = useState<Record<string, DocEditState>>({});
  const [savingContent, setSavingContent] = useState<string | null>(null);

  // ── Add-doc form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newDocTier, setNewDocTier] = useState('TIER_1');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);

  const getDocEdit = useCallback(
    (docType: string): DocEditState =>
      docEdits[docType] ?? { content: '', notes: '', file: null },
    [docEdits],
  );

  const updateDocEdit = useCallback(
    (docType: string, field: keyof DocEditState, value: string | File | null) => {
      setDocEdits((prev) => ({
        ...prev,
        [docType]: {
          ...(prev[docType] ?? { content: '', notes: '', file: null }),
          [field]: value,
        },
      }));
    },
    [],
  );

  const initDocContent = useCallback((doc: SuggestedDoc) => {
    setDocEdits((prev) => {
      if (prev[doc.document_type]?.content) return prev;
      const existing = prev[doc.document_type] ?? { content: '', notes: '', file: null };
      return { ...prev, [doc.document_type]: { ...existing, content: doc.content_summary } };
    });
  }, []);

  const toggleCard = useCallback((docType: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(docType)) next.delete(docType);
      else next.add(docType);
      return next;
    });
  }, []);

  const handleGenerate = async () => {
    if (!challengeId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message ?? 'Failed to get suggestions');
      if (!data?.success) throw new Error(data?.error?.message ?? 'AI suggestion failed');
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
      toast.success('Legal documents generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate';
      setGenerateError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const acceptDocMutation = useMutation({
    mutationFn: async (doc: SuggestedDoc) => {
      if (!challengeId || !userId) throw new Error('Missing context');
      const edit = getDocEdit(doc.document_type);
      const { error } = await supabase.from('challenge_legal_docs').update({
        status: 'ATTACHED',
        content_summary: edit.content || doc.content_summary || null,
        lc_status: 'approved',
        lc_reviewed_by: userId,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: edit.notes || `AI-suggested: ${doc.rationale}`,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).eq('id', doc.id);
      if (error) throw new Error(error.message);

      if (edit.file && challengeId) {
        const safeName = sanitizeFileName(edit.file.name);
        const path = `${challengeId}/${doc.document_type}/${crypto.randomUUID()}_${safeName}`;
        await supabase.storage.from('legal-docs').upload(path, edit.file);
      }
      return doc.document_type;
    },
    onSuccess: (docType) => {
      toast.success(`${docType} document accepted and attached`);
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'accept_legal_doc' }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId);
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Legal document deleted');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_legal_doc' }),
  });

  const dismissSuggestionMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('challenge_legal_docs')
        .delete()
        .eq('id', docId)
        .eq('status', 'ai_suggested');
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Suggestion dismissed');
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'dismiss_legal_suggestion' }),
  });

  const handleSaveContent = useCallback(
    async (doc: SuggestedDoc) => {
      if (!userId) return;
      const edit = getDocEdit(doc.document_type);
      const contentToSave = edit.content || doc.content_summary;
      if (!contentToSave) return;
      setSavingContent(doc.document_type);
      try {
        const { error } = await supabase.from('challenge_legal_docs').update({
          content_summary: contentToSave,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq('id', doc.id);
        if (error) throw new Error(error.message);
        toast.success(`${doc.document_type} content saved`);
        queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSavingContent(null);
      }
    },
    [userId, getDocEdit, challengeId, queryClient],
  );

  const handleAddNewDoc = async () => {
    if (!challengeId || !userId || !newDocTitle || !newDocType) {
      toast.error('Please fill in title and document type');
      return;
    }
    setAddingDoc(true);
    try {
      const { data: existing } = await supabase
        .from('challenge_legal_docs')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('document_type', newDocType)
        .eq('tier', newDocTier)
        .maybeSingle();

      const payload = {
        status: 'ATTACHED',
        content_summary: newDocContent || null,
        lc_status: 'approved',
        lc_reviewed_by: userId,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: newDocNotes || null,
        document_name: newDocTitle,
        maturity_level: maturityLevel ?? null,
        attached_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      if (existing?.id) {
        const { error } = await supabase
          .from('challenge_legal_docs')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('challenge_legal_docs').insert({
          challenge_id: challengeId,
          document_type: newDocType,
          tier: newDocTier,
          created_by: userId,
          ...payload,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        if (error) throw new Error(error.message);
      }

      if (newDocFile) {
        const safeName = sanitizeFileName(newDocFile.name);
        const path = `${challengeId}/${newDocType}/${crypto.randomUUID()}_${safeName}`;
        await supabase.storage.from('legal-docs').upload(path, newDocFile);
      }

      toast.success('Legal document added successfully');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });

      setNewDocTitle('');
      setNewDocType('');
      setNewDocTier('TIER_1');
      setNewDocContent('');
      setNewDocNotes('');
      setNewDocFile(null);
      setShowAddForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add document';
      toast.error(msg);
    } finally {
      setAddingDoc(false);
    }
  };

  return {
    // generate
    generating,
    generateError,
    handleGenerate,
    // edit state
    openCards,
    toggleCard,
    getDocEdit,
    updateDocEdit,
    initDocContent,
    savingContent,
    // mutations
    acceptDocMutation,
    deleteDocMutation,
    dismissSuggestionMutation,
    handleSaveContent,
    // add-doc form
    showAddForm,
    setShowAddForm,
    newDocTitle,
    setNewDocTitle,
    newDocType,
    setNewDocType,
    newDocTier,
    setNewDocTier,
    newDocContent,
    setNewDocContent,
    newDocNotes,
    setNewDocNotes,
    newDocFile,
    setNewDocFile,
    addingDoc,
    handleAddNewDoc,
  };
}
