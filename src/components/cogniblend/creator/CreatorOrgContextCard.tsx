/**
 * CreatorOrgContextCard — Collapsible org context card for Challenge Creator.
 * Sub-components extracted to CreatorOrgReadOnlySummary + CreatorOrgEditableFields.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Building2, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import type { GovernanceMode } from '@/lib/governanceMode';
import { ORG_SEED } from './creatorSeedContent';
import { OrgAttachmentList } from '@/components/cogniblend/curation/OrgAttachmentList';
import { useCreatorOrgAttachments } from '@/hooks/mutations/useCreatorOrgAttachments';
import { CreatorOrgReadOnlySummary } from './CreatorOrgReadOnlySummary';
import { CreatorOrgEditableFields } from './CreatorOrgEditableFields';

interface CreatorOrgContextCardProps {
  organizationId: string;
  governanceMode: GovernanceMode;
  fillTrigger?: number;
  challengeId?: string;
}

export function CreatorOrgContextCard({ organizationId, governanceMode, fillTrigger = 0, challengeId }: CreatorOrgContextCardProps) {
  const [isOpen, setIsOpen] = useState(governanceMode !== 'QUICK');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tagline, setTagline] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { attachments, upload, remove } = useCreatorOrgAttachments(challengeId);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['creator-org-context', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seeker_organizations')
        .select(`
          organization_name, trade_brand_name, organization_description,
          website_url, linkedin_url, twitter_url, tagline,
          hq_country_id, hq_city, annual_revenue_range,
          employee_count_range, founding_year, functional_areas,
          organization_type_id,
          organization_types!seeker_organizations_organization_type_id_fkey ( name ),
          countries!seeker_organizations_hq_country_id_fkey ( name )
        `)
        .eq('id', organizationId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: industries } = useQuery({
    queryKey: ['creator-org-industries', organizationId],
    queryFn: async () => {
      const { data: ois, error: oisErr } = await supabase
        .from('seeker_org_industries')
        .select('industry_id, is_primary')
        .eq('organization_id', organizationId);
      if (oisErr) throw new Error(oisErr.message);
      if (!ois?.length) return [];
      const ids = ois.map((o) => o.industry_id);
      const { data: segs, error: segErr } = await supabase
        .from('industry_segments')
        .select('id, name')
        .in('id', ids);
      if (segErr) throw new Error(segErr.message);
      return (segs || []).map((s) => ({
        name: s.name,
        isPrimary: ois.find((o) => o.industry_id === s.id)?.is_primary ?? false,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (org && !hydrated) {
      setDescription(org.organization_description ?? '');
      setWebsite(org.website_url ?? '');
      setLinkedin(org.linkedin_url ?? '');
      setTwitter(org.twitter_url ?? '');
      setTagline(org.tagline ?? '');
      setHydrated(true);
    }
  }, [org, hydrated]);

  useEffect(() => { setIsOpen(governanceMode !== 'QUICK'); }, [governanceMode]);

  const saveToOrg = useCallback(
    (updates: Record<string, string | null>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('seeker_organizations')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', organizationId);
        if (error) {
          toast.error('Failed to save org profile update');
        } else {
          queryClient.invalidateQueries({ queryKey: ['creator-org-context', organizationId] });
        }
      }, 800);
    },
    [organizationId, queryClient],
  );

  useEffect(() => {
    if (fillTrigger === 0) return;
    setDescription(ORG_SEED.organization_description);
    setWebsite(ORG_SEED.website_url);
    setLinkedin(ORG_SEED.linkedin_url);
    setTwitter(ORG_SEED.twitter_url);
    setTagline(ORG_SEED.tagline);
    setIsOpen(true);
    saveToOrg({
      organization_description: ORG_SEED.organization_description,
      website_url: ORG_SEED.website_url,
      linkedin_url: ORG_SEED.linkedin_url,
      twitter_url: ORG_SEED.twitter_url,
      tagline: ORG_SEED.tagline,
    });
  }, [fillTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const makeHandler = (setter: React.Dispatch<React.SetStateAction<string>>, field: string) =>
    (val: string) => { setter(val); saveToOrg({ [field]: val.trim() || null }); };

  if (orgLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
    );
  }

  if (!org) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgTypeName = (org as any).organization_types?.name ?? 'Organization';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countryName = (org as any).countries?.name ?? '';
  const hasGaps = !description.trim() || !website.trim();
  const primaryIndustry = industries?.find((i) => i.isPrimary)?.name;
  const allIndustryNames = industries?.map((i) => i.name) ?? [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4.5 w-4.5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">Organization Context</span>
              <span className="text-xs text-muted-foreground">(auto-populated from your profile)</span>
              {hasGaps && (
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 ml-1">Gaps to fill</Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
            {governanceMode === 'CONTROLLED' && hasGaps && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Complete your org profile for best AI results. Controlled governance challenges require comprehensive context.
                </p>
              </div>
            )}

            <CreatorOrgReadOnlySummary
              org={org}
              orgTypeName={orgTypeName}
              countryName={countryName}
              allIndustryNames={allIndustryNames}
              primaryIndustry={primaryIndustry}
            />

            <CreatorOrgEditableFields
              description={description}
              tagline={tagline}
              website={website}
              linkedin={linkedin}
              twitter={twitter}
              onDescriptionChange={makeHandler(setDescription, 'organization_description')}
              onTaglineChange={makeHandler(setTagline, 'tagline')}
              onWebsiteChange={makeHandler(setWebsite, 'website_url')}
              onLinkedinChange={makeHandler(setLinkedin, 'linkedin_url')}
              onTwitterChange={makeHandler(setTwitter, 'twitter_url')}
            />

            {challengeId ? (
              <OrgAttachmentList attachments={attachments} isReadOnly={false} onUpload={upload} onDelete={remove} />
            ) : (
              <div className="space-y-1 pt-3 border-t border-border">
                <label className="text-xs font-medium flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />Organization Profile Documents
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Save as draft first to upload org/department documents (annual reports, capability decks, etc.)
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This context helps AI generate better challenge specs. Edits here update your org profile for all challenges.
                {challengeId && ' Uploaded documents help AI understand your organization — not the specific challenge.'}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
