/**
 * ChallengeLegalDocsCard — Displays auto-populated legal documents for a challenge.
 * View-only for QUICK mode (auto-accepted). Shows review status for STRUCTURED/CONTROLLED.
 * During Phase 2, shows planned legal templates as a preview.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, ShieldCheck, Clock, Eye } from 'lucide-react';
import { handleQueryError } from '@/lib/errorHandler';

interface ChallengeLegalDocsCardProps {
  challengeId: string;
  isQuickMode: boolean;
  currentPhase?: number;
  governanceMode?: string;
  organizationId?: string;
  engagementModel?: string;
}

interface LegalDocRow {
  id: string;
  document_type: string;
  document_name: string | null;
  tier: string;
  status: string | null;
  lc_status: string | null;
}

interface LegalTemplatePreview {
  template_id: string;
  document_name: string;
  tier: string;
  is_mandatory: boolean;
}

function useLegalTemplatePreview(
  challengeId: string,
  currentPhase: number | undefined,
  hasActualDocs: boolean,
  engagementModel?: string,
  organizationId?: string,
) {
  const isPhase2 = (currentPhase ?? 1) < 3 && !hasActualDocs;
  const isAgg = engagementModel?.toUpperCase() === 'AGG';

  return useQuery<LegalTemplatePreview[]>({
    queryKey: ['legal-template-preview', challengeId, isAgg, organizationId],
    queryFn: async () => {
      if (isAgg && organizationId) {
        const { data, error } = await supabase
          .from('org_legal_document_templates')
          .select('id, document_name, tier, is_mandatory')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('tier', { ascending: true });
        if (error) { handleQueryError(error, { operation: 'fetch_org_legal_template_preview' }); return []; }
        return (data ?? []).map((d) => ({ template_id: d.id, document_name: d.document_name, tier: d.tier, is_mandatory: d.is_mandatory }));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, tier, is_mandatory')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE');
      if (error) { handleQueryError(error, { operation: 'fetch_legal_template_preview' }); return []; }
      return (data ?? []) as LegalTemplatePreview[];
    },
    enabled: isPhase2,
    staleTime: 5 * 60_000,
  });
}

export function ChallengeLegalDocsCard({
  challengeId, isQuickMode, currentPhase, governanceMode, organizationId, engagementModel,
}: ChallengeLegalDocsCardProps) {
  const { data: legalDocs } = useQuery<LegalDocRow[]>({
    queryKey: ['challenge-legal-docs', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, tier, status, lc_status')
        .eq('challenge_id', challengeId)
        .order('tier', { ascending: true });
      if (error) {
        handleQueryError(error, { operation: 'fetch_challenge_legal_docs' });
        return [];
      }
      return (data ?? []) as LegalDocRow[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const hasActualDocs = !!legalDocs && legalDocs.length > 0;
  const { data: templatePreviews } = useLegalTemplatePreview(
    challengeId, currentPhase, hasActualDocs, engagementModel, organizationId,
  );

  // Phase 2 preview: show planned templates
  if (!hasActualDocs && templatePreviews && templatePreviews.length > 0) {
    return (
      <Card className="border-dashed border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Legal Documents
            <Badge variant="outline" className="text-[10px] ml-2">Planned</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {templatePreviews.map((t) => (
              <div key={t.template_id} className="flex items-center justify-between rounded-lg bg-muted/20 border border-dashed border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.document_name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.tier.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {t.is_mandatory && (
                    <Badge variant="secondary" className="text-[10px]">Required</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Eye className="h-3 w-3" /> Preview
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            These legal templates will be assembled after curation review is complete.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No docs and no preview — early phase placeholder
  if (!hasActualDocs) {
    if (!isQuickMode && (currentPhase ?? 1) < 3) {
      return (
        <Card className="border-dashed border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Legal Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <p className="text-sm italic">
                Legal documents will be assembled after the curation review is complete.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" /> Legal Documents
          {isQuickMode && (
            <Badge variant="secondary" className="text-[10px] ml-2">Auto-applied</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {legalDocs!.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{doc.document_name ?? doc.document_type}</p>
                <p className="text-[11px] text-muted-foreground">{doc.document_type} · {doc.tier.replace('_', ' ')}</p>
              </div>
              {doc.status === 'auto_accepted' ? (
                <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Auto-accepted
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {doc.lc_status ?? doc.status ?? 'Pending'}
                </Badge>
              )}
            </div>
          ))}
        </div>
        {isQuickMode && (
          <p className="text-[11px] text-muted-foreground mt-2 italic">
            Platform default legal templates applied automatically. View-only.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
