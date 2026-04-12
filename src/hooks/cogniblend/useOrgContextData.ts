/**
 * useOrgContextData — Data fetching, mutations, and auto-save logic for OrgContextPanel.
 * Extracted from OrgContextPanel.tsx (Batch B).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface OrgData {
  organization_name: string;
  orgTypeName: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  organization_description: string | null;
  tagline: string | null;
}

interface OrgAttachment {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string;
  extraction_status: string | null;
  storage_path: string;
}

export function useOrgContextData(challengeId: string, organizationId: string, isReadOnly: boolean) {
  const queryClient = useQueryClient();

  // ── Local form state ──
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // ── Fetch org data ──
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org-context-panel', organizationId],
    queryFn: async (): Promise<OrgData> => {
      const { data: org, error } = await supabase
        .from('seeker_organizations')
        .select('organization_name, organization_type_id, website_url, linkedin_url, twitter_url, organization_description, tagline')
        .eq('id', organizationId)
        .single();
      if (error) throw error;

      let orgTypeName: string | null = null;
      if (org?.organization_type_id) {
        const { data: ot } = await supabase
          .from('organization_types')
          .select('name')
          .eq('id', org.organization_type_id)
          .single();
        orgTypeName = ot?.name ?? null;
      }

      return {
        organization_name: org?.organization_name ?? '',
        orgTypeName,
        website_url: org?.website_url ?? null,
        linkedin_url: org?.linkedin_url ?? null,
        twitter_url: org?.twitter_url ?? null,
        organization_description: org?.organization_description ?? null,
        tagline: org?.tagline ?? null,
      };
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch existing org profile attachments ──
  const { data: attachments = [] } = useQuery({
    queryKey: ['org-profile-attachments', challengeId],
    queryFn: async (): Promise<OrgAttachment[]> => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, file_name, file_size, mime_type, extraction_status, storage_path')
        .eq('challenge_id', challengeId)
        .eq('section_key', 'org_profile')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrgAttachment[];
    },
    enabled: !!challengeId,
    staleTime: 30 * 1000,
  });

  // ── Save org details mutation ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('seeker_organizations')
        .update({
          website_url: websiteUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          organization_description: description.trim() || null,
          tagline: tagline.trim() || null,
        })
        .eq('id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-context-panel', organizationId] });
      setIsDirty(false);
      toast.success('Organization details saved');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // ── Upload file handler ──
  const handleFileUpload = useCallback(async (file: File) => {
    const storagePath = `${organizationId}/org_profile/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('challenge-attachments')
      .upload(storagePath, file);
    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      return;
    }

    const { data: att, error: insertErr } = await supabase
      .from('challenge_attachments')
      .insert({
        challenge_id: challengeId,
        section_key: 'org_profile',
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        extraction_status: 'pending',
      })
      .select('id')
      .single();
    if (insertErr) {
      toast.error(`Failed to save attachment record: ${insertErr.message}`);
      return;
    }

    if (att?.id) {
      supabase.functions
        .invoke('extract-attachment-text', { body: { attachment_id: att.id } })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['org-profile-attachments', challengeId] });
        })
        .catch(() => { /* extraction failure is non-blocking */ });
    }

    queryClient.invalidateQueries({ queryKey: ['org-profile-attachments', challengeId] });
    toast.success('Document uploaded');
  }, [challengeId, organizationId, queryClient]);

  // ── Delete attachment handler ──
  const deleteAttachment = useCallback(async (att: OrgAttachment) => {
    await supabase.storage.from('challenge-attachments').remove([att.storage_path]);
    await supabase.from('challenge_attachments').delete().eq('id', att.id);
    queryClient.invalidateQueries({ queryKey: ['org-profile-attachments', challengeId] });
    toast.success('Document removed');
  }, [challengeId, queryClient]);

  // ── Hydrate local state from query cache ──
  useEffect(() => {
    if (orgData) {
      setWebsiteUrl(orgData.website_url ?? '');
      setLinkedinUrl(orgData.linkedin_url ?? '');
      setTwitterUrl(orgData.twitter_url ?? '');
      setDescription(orgData.organization_description ?? '');
      setTagline(orgData.tagline ?? '');
      setIsDirty(false);
    }
  }, [orgData]);

  // ── Auto-save with 800ms debounce ──
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isDirty || isReadOnly || !organizationId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('seeker_organizations')
          .update({
            website_url: websiteUrl.trim() || null,
            linkedin_url: linkedinUrl.trim() || null,
            twitter_url: twitterUrl.trim() || null,
            organization_description: description.trim() || null,
            tagline: tagline.trim() || null,
          })
          .eq('id', organizationId);
        if (error) throw error;
        if (isMountedRef.current) {
          setIsDirty(false);
          queryClient.invalidateQueries({ queryKey: ['org-context-panel', organizationId] });
        }
      } catch (err) {
        handleMutationError(err as Error, { operation: 'org_context_auto_save', component: 'useOrgContextData' });
      }
    }, 800);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isDirty, websiteUrl, linkedinUrl, twitterUrl, description, tagline, organizationId, isReadOnly, queryClient]);

  // ── Flush pending auto-save on unmount ──
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        if (isDirty && organizationId) {
          supabase
            .from('seeker_organizations')
            .update({
              website_url: websiteUrl.trim() || null,
              linkedin_url: linkedinUrl.trim() || null,
              twitter_url: twitterUrl.trim() || null,
              organization_description: description.trim() || null,
              tagline: tagline.trim() || null,
            })
            .eq('id', organizationId)
            .then(() => {});
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Field change handler ──
  const handleFieldChange = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    };
  }, []);

  return {
    orgData,
    orgLoading,
    attachments,
    websiteUrl, setWebsiteUrl,
    linkedinUrl, setLinkedinUrl,
    twitterUrl, setTwitterUrl,
    description, setDescription,
    tagline, setTagline,
    isDirty,
    saveMutation,
    handleFileUpload,
    deleteAttachment,
    handleFieldChange,
  };
}
