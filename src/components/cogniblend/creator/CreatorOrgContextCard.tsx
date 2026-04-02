/**
 * CreatorOrgContextCard — Collapsible org context card for Challenge Creator.
 * 
 * Shows auto-populated org profile data (read-only) plus editable fields
 * for gaps (description, website, LinkedIn, Twitter, tagline).
 * Edits persist to seeker_organizations via 800ms debounced auto-save.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Globe, Linkedin, Twitter, ChevronDown, ChevronUp,
  AlertTriangle, Info, Users, Calendar, MapPin, DollarSign, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GovernanceMode } from '@/lib/governanceMode';
import { ORG_SEED } from './creatorSeedContent';

interface CreatorOrgContextCardProps {
  organizationId: string;
  governanceMode: GovernanceMode;
  fillTrigger?: number;
}

export function CreatorOrgContextCard({ organizationId, governanceMode, fillTrigger = 0 }: CreatorOrgContextCardProps) {
  // ═══════ State ═══════
  const [isOpen, setIsOpen] = useState(governanceMode !== 'QUICK');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tagline, setTagline] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // ═══════ Queries ═══════
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

  // ═══════ Effects ═══════
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

  useEffect(() => {
    setIsOpen(governanceMode !== 'QUICK');
  }, [governanceMode]);

  // ═══════ Auto-save with debounce ═══════
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

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    saveToOrg({ organization_description: val.trim() || null });
  };
  const handleWebsiteChange = (val: string) => {
    setWebsite(val);
    saveToOrg({ website_url: val.trim() || null });
  };
  const handleLinkedinChange = (val: string) => {
    setLinkedin(val);
    saveToOrg({ linkedin_url: val.trim() || null });
  };
  const handleTwitterChange = (val: string) => {
    setTwitter(val);
    saveToOrg({ twitter_url: val.trim() || null });
  };
  const handleTaglineChange = (val: string) => {
    setTagline(val);
    saveToOrg({ tagline: val.trim() || null });
  };

  // ═══════ Loading ═══════
  if (orgLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-3">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
    );
  }

  if (!org) return null;

  const orgTypeName = (org as any).organization_types?.name ?? 'Organization';
  const countryName = (org as any).countries?.name ?? '';
  const hasGaps = !description.trim() || !website.trim();
  const primaryIndustry = industries?.find((i) => i.isPrimary)?.name;
  const allIndustryNames = industries?.map((i) => i.name) ?? [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* ═══ Trigger ═══ */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4.5 w-4.5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                Organization Context
              </span>
              <span className="text-xs text-muted-foreground">
                (auto-populated from your profile)
              </span>
              {hasGaps && (
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 ml-1">
                  Gaps to fill
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        {/* ═══ Content ═══ */}
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
            {/* CONTROLLED mode warning */}
            {governanceMode === 'CONTROLLED' && hasGaps && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Complete your org profile for best AI results. Controlled governance challenges require comprehensive context.
                </p>
              </div>
            )}

            {/* ─── Read-only summary ─── */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-base font-bold text-foreground">
                  {org.organization_name}
                </h3>
                {org.trade_brand_name && (
                  <span className="text-sm text-muted-foreground">({org.trade_brand_name})</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {orgTypeName}
                </span>
                {countryName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {org.hq_city ? `${org.hq_city}, ` : ''}{countryName}
                  </span>
                )}
                {org.employee_count_range && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {org.employee_count_range} employees
                  </span>
                )}
                {org.annual_revenue_range && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {org.annual_revenue_range}
                  </span>
                )}
                {org.founding_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Founded {org.founding_year}
                  </span>
                )}
              </div>

              {/* Industries */}
              {allIndustryNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allIndustryNames.map((name) => (
                    <Badge
                      key={name}
                      variant={name === primaryIndustry ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Editable fields ─── */}
            <div className="space-y-3 pt-2">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  About Your Organization
                  {!description.trim() && (
                    <span className="text-amber-600 text-[10px]">(empty — please add)</span>
                  )}
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="What does your organization do? Describe your core business, market, and key capabilities in 2-3 sentences."
                  className={cn(
                    'text-sm min-h-[80px] resize-y',
                    !description.trim() && 'border-amber-500/40',
                  )}
                />
                {description.trim() && description.trim().length < 200 && (
                  <p className="text-[10px] text-muted-foreground">
                    {description.trim().length}/200 chars — more detail helps AI generate better specs
                  </p>
                )}
              </div>

              {/* Tagline */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tagline</label>
                <Input
                  value={tagline}
                  onChange={(e) => handleTaglineChange(e.target.value)}
                  placeholder="Your organization's tagline or motto"
                  className="text-sm"
                />
              </div>

              {/* URLs row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Website
                    {!website.trim() && (
                      <span className="text-amber-600 text-[10px]">(empty)</span>
                    )}
                  </label>
                  <Input
                    value={website}
                    onChange={(e) => handleWebsiteChange(e.target.value)}
                    placeholder="https://www.example.com"
                    className={cn('text-sm', !website.trim() && 'border-amber-500/40')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </label>
                  <Input
                    value={linkedin}
                    onChange={(e) => handleLinkedinChange(e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Twitter className="h-3.5 w-3.5" />
                    Twitter / X
                  </label>
                  <Input
                    value={twitter}
                    onChange={(e) => handleTwitterChange(e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Info footer */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This context helps AI generate better challenge specs. Edits here update your org profile for all challenges.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
