/**
 * OrgContextPanel — Organization Context for Curation Review
 *
 * Collapsible accordion showing org details (auto-populated from seeker_organizations)
 * with editable fields for curator enrichment and file upload for org profile docs.
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Globe, Linkedin, Twitter, Zap, Save, Loader2, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrgContextPanelProps {
  challengeId: string;
  organizationId: string;
  isReadOnly?: boolean;
}

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

// ---------------------------------------------------------------------------
// File upload config
// ---------------------------------------------------------------------------

const ORG_DOC_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
  ] as const,
  allowedExtensions: ['.pdf', '.docx', '.png', '.jpg', '.webp'] as const,
  label: 'Organization Profile Document',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrgContextPanel({ challengeId, organizationId, isReadOnly = false }: OrgContextPanelProps) {
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

      // Seed local state
      setWebsiteUrl(org?.website_url ?? '');
      setLinkedinUrl(org?.linkedin_url ?? '');
      setTwitterUrl(org?.twitter_url ?? '');
      setDescription(org?.organization_description ?? '');
      setTagline(org?.tagline ?? '');
      setIsDirty(false);

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
  const { data: attachments = [], isLoading: attLoading } = useQuery({
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

    // 1. Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from('challenge-attachments')
      .upload(storagePath, file);
    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      return;
    }

    // 2. Insert attachment record
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

    // 3. Trigger text extraction
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
    // Delete from storage
    await supabase.storage.from('challenge-attachments').remove([att.storage_path]);
    // Delete record
    await supabase.from('challenge_attachments').delete().eq('id', att.id);
    queryClient.invalidateQueries({ queryKey: ['org-profile-attachments', challengeId] });
    toast.success('Document removed');
  }, [challengeId, queryClient]);

  // ── Field change handler ──
  const handleFieldChange = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
    };
  }, []);

  if (orgLoading) {
    return (
      <div className="border border-border rounded-lg p-4 animate-pulse bg-muted/20">
        <div className="h-5 w-48 bg-muted rounded" />
      </div>
    );
  }

  const filledCount = [websiteUrl, linkedinUrl, twitterUrl, description].filter(v => v.trim()).length;

  return (
    <Accordion type="single" collapsible defaultValue="org-context" className="w-full">
      <AccordionItem value="org-context" className="border border-border rounded-lg">
        <AccordionTrigger className="px-4 py-2.5 text-sm font-semibold hover:no-underline gap-2">
          <div className="flex items-center gap-2 flex-1 text-left">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Organization Context</span>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 ml-1">
              <Zap className="h-2.5 w-2.5 mr-0.5" />AI uses this
            </Badge>
            {filledCount < 3 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground ml-auto mr-2">
                {filledCount}/4 fields filled
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4">
            {/* Read-only org info */}
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="text-sm font-medium">{orgData?.organization_name || '—'}</p>
              </div>
              {orgData?.orgTypeName && (
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant="secondary" className="text-xs">{orgData.orgTypeName}</Badge>
                </div>
              )}
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />Website
                </Label>
                <Input
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={handleFieldChange(setWebsiteUrl)}
                  disabled={isReadOnly}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Linkedin className="h-3 w-3" />LinkedIn
                </Label>
                <Input
                  placeholder="https://linkedin.com/company/..."
                  value={linkedinUrl}
                  onChange={handleFieldChange(setLinkedinUrl)}
                  disabled={isReadOnly}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Twitter className="h-3 w-3" />Twitter / X
                </Label>
                <Input
                  placeholder="https://x.com/..."
                  value={twitterUrl}
                  onChange={handleFieldChange(setTwitterUrl)}
                  disabled={isReadOnly}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tagline</Label>
                <Input
                  placeholder="Brief tagline or motto"
                  value={tagline}
                  onChange={handleFieldChange(setTagline)}
                  disabled={isReadOnly}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Organization Description</Label>
              <Textarea
                placeholder="Describe the organization — industry, products/services, size, market position..."
                value={description}
                onChange={handleFieldChange(setDescription)}
                disabled={isReadOnly}
                rows={3}
                className="text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Providing a rich description helps the AI produce more contextually relevant challenge content.
              </p>
            </div>

            {/* Save button */}
            {!isReadOnly && isDirty && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Organization Details
                </Button>
              </div>
            )}

            {/* Org profile documents */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Organization Profile Documents
              </Label>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="border rounded-md p-2 flex items-center gap-2 bg-muted/30 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-xs">{att.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      {att.extraction_status === 'completed' && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200 shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Extracted
                        </Badge>
                      )}
                      {att.extraction_status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 shrink-0">
                          <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />Processing
                        </Badge>
                      )}
                      {att.extraction_status === 'failed' && (
                        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 shrink-0">
                          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Failed
                        </Badge>
                      )}
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteAttachment(att)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              {!isReadOnly && (
                <FileUploadZone
                  config={ORG_DOC_CONFIG}
                  multiple
                  files={[]}
                  onFilesChange={(files) => {
                    files.forEach(handleFileUpload);
                  }}
                  onChange={() => {}}
                />
              )}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
