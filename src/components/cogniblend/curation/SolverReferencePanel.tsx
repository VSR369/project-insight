/**
 * SolverReferencePanel — Read-only panel showing reference documents shared with solvers.
 * Groups by section, provides download buttons for files and external links for URLs.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Globe, Download, ExternalLink, BookOpen } from 'lucide-react';

interface SolverReferencePanelProps {
  challengeId: string;
}

interface SharedAttachment {
  id: string;
  section_key: string;
  source_type: string;
  source_url: string | null;
  display_name: string | null;
  file_name: string | null;
  url_title: string | null;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
}

/** Section key to human-readable label mapping */
const SECTION_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  context_and_background: 'Context & Background',
  deliverables: 'Deliverables',
  data_resources_provided: 'Data & Resources',
  evaluation_criteria: 'Evaluation Criteria',
  scope: 'Scope',
  success_metrics_kpis: 'Success Metrics & KPIs',
  affected_stakeholders: 'Stakeholders',
  expected_outcomes: 'Expected Outcomes',
  phase_schedule: 'Timeline & Schedule',
  reward_structure: 'Reward Structure',
  solver_expertise: 'Solver Expertise',
  submission_guidelines: 'Submission Guidelines',
  ip_model: 'IP & Licensing',
  current_deficiencies: 'Current Deficiencies',
  root_causes: 'Root Causes',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Excluded Approaches',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeLabel(mime: string | null): string {
  if (!mime) return '';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('word') || mime.includes('docx')) return 'DOCX';
  if (mime.includes('spreadsheet') || mime.includes('xlsx')) return 'XLSX';
  if (mime.includes('presentation') || mime.includes('pptx')) return 'PPTX';
  if (mime.includes('csv')) return 'CSV';
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() || 'Image';
  return '';
}

export function SolverReferencePanel({ challengeId }: SolverReferencePanelProps) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['solver-references', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, section_key, source_type, source_url, display_name, file_name, url_title, description, mime_type, file_size, storage_path')
        .eq('challenge_id', challengeId)
        .eq('shared_with_solver', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data || []) as SharedAttachment[];
    },
    staleTime: 60_000,
  });

  if (isLoading || attachments.length === 0) return null;

  // Group by section
  const grouped: Record<string, SharedAttachment[]> = {};
  for (const att of attachments) {
    if (!grouped[att.section_key]) grouped[att.section_key] = [];
    grouped[att.section_key].push(att);
  }

  const handleDownload = async (att: SharedAttachment) => {
    if (!att.storage_path) return;
    const { data, error } = await supabase.storage
      .from('challenge-attachments')
      .createSignedUrl(att.storage_path, 3600);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Reference Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([sectionKey, items]) => (
          <div key={sectionKey}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              {SECTION_LABELS[sectionKey] || sectionKey}
            </h4>
            <div className="space-y-2">
              {items.map((att) => {
                const isUrl = att.source_type === 'url';
                const displayName = att.display_name || (isUrl ? (att.url_title || att.source_url) : att.file_name) || 'Untitled';
                const meta = isUrl
                  ? null
                  : [getMimeLabel(att.mime_type), formatFileSize(att.file_size)].filter(Boolean).join(', ');
                const Icon = isUrl ? Globe : FileText;

                return (
                  <div key={att.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
                      {att.description && <p className="text-xs text-muted-foreground mt-0.5">{att.description}</p>}
                    </div>
                    {isUrl && att.source_url ? (
                      <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" asChild>
                        <a href={att.source_url} target="_blank" rel="noopener noreferrer">
                          Open Link <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" onClick={() => handleDownload(att)}>
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
