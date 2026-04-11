/**
 * CreatorSectionBuilders.curator — Curator Version section builder.
 * Split from CreatorSectionBuilders to keep files under 250 lines.
 */

import React from 'react';
import {
  Target, Layers, BookOpen, Info, Trophy, Clock, Tag,
  Briefcase, ListChecks, BarChart3, FileText, ShieldCheck,
  Coins, Link2, Users, AlertTriangle, XCircle, Compass, Ban, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  parseItems,
  parseStakeholders,
  RichTextSection,
  BadgeSection,
  ListSection,
  WeightedCriteriaSection,
  TagsSection,
  ReferenceLinksSection,
  type SectionDef,
} from './CreatorSectionRenderers';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { formatCurrency, complexityColor } from '@/lib/cogniblend/displayHelpers';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';

/* ── Curator Version (live challenge data) ── */

export function buildCuratorSections(
  data: PublicChallengeData,
): SectionDef[] {
  // Build ALL sections; filtering done by FilteredSections + fieldRules
  return buildAllCuratorSections(data).filter((s) => s.content !== null);
}

function buildAllCuratorSections(data: PublicChallengeData): SectionDef[] {
  const eb = (data.extended_brief ?? {}) as Record<string, unknown>;
  const rs = (data.reward_structure ?? {}) as Record<string, unknown>;
  const currency = data.currency_code || 'USD';
  const evalCriteria = data.evaluation_criteria as Record<string, unknown> | null;
  const weightedCriteria = (evalCriteria?.weighted_criteria ?? evalCriteria?.criteria ?? []) as Array<{ name: string; weight: number }>;
  const deliverables = data.deliverables as Record<string, unknown> | null;
  const deliverablesList = (deliverables?.deliverables_list ?? deliverables?.items ?? []) as Record<string, unknown>[];
  const outcomeItems = parseItems(data.expected_outcomes);
  const metricsItems = parseItems(data.success_metrics_kpis);
  const dataResources = data.data_resources_provided as Record<string, unknown> | null;
  const dataResourceItems = parseItems(dataResources) ?? (dataResources?.items ? parseItems(dataResources.items) : null);
  const guidelinesItems = parseItems(data.submission_guidelines);
  const phaseSchedule = data.phase_schedule as Record<string, unknown> | null;
  const platinumAward = Number(rs.platinum_award ?? rs.budget_max ?? 0);
  const goldAward = Number(rs.gold_award ?? 0);
  const silverAward = Number(rs.silver_award ?? 0);
  const refUrls = eb.reference_urls as string[] | undefined;

  return [
    buildOrgDetailsSection(data),
    { title: 'Challenge Title', icon: FileText, fieldKey: 'title', content: data.title ? (
      <Card className="border-border"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Challenge Title</CardTitle></CardHeader><CardContent><p className="text-sm font-medium text-foreground">{data.title}</p></CardContent></Card>
    ) : null },
    { title: 'Problem Statement', icon: Target, fieldKey: 'problem_statement', content: data.problem_statement ? <RichTextSection title="Problem Statement" html={data.problem_statement} icon={Target} /> : null },
    { title: 'Value Proposition (Hook)', icon: Info, fieldKey: 'hook', content: data.hook ? <RichTextSection title="Value Proposition (Hook)" html={data.hook} icon={Info} /> : null },
    { title: 'Scope', icon: Layers, fieldKey: 'scope', content: data.scope ? <RichTextSection title="Scope" html={data.scope} icon={Layers} /> : null },
    { title: 'Context & Background', icon: BookOpen, fieldKey: 'context_background', content: eb.context_background ? <RichTextSection title="Context & Background" html={eb.context_background as string} icon={BookOpen} /> : null },
    { title: 'Root Causes', icon: AlertTriangle, fieldKey: 'root_causes', content: (() => { const items = parseItems(eb.root_causes); return items?.length ? <ListSection title="Root Causes" icon={AlertTriangle} items={items} /> : null; })() },
    { title: 'Affected Stakeholders', icon: Users, fieldKey: 'affected_stakeholders', content: (() => { const items = parseStakeholders(eb.affected_stakeholders); return items?.length ? <ListSection title="Affected Stakeholders" icon={Users} items={items} /> : null; })() },
    { title: 'Current Deficiencies', icon: XCircle, fieldKey: 'current_deficiencies', content: (() => { const items = parseItems(eb.current_deficiencies); return items?.length ? <ListSection title="Current Deficiencies" icon={XCircle} items={items} /> : null; })() },
    { title: 'Preferred Approach', icon: Compass, fieldKey: 'preferred_approach', content: (() => { const items = parseItems(eb.preferred_approach); return items?.length ? <ListSection title="Preferred Approach" icon={Compass} items={items} /> : null; })() },
    { title: 'Approaches Not of Interest', icon: Ban, fieldKey: 'approaches_not_of_interest', content: (() => { const items = parseItems(eb.approaches_not_of_interest); return items?.length ? <ListSection title="Approaches Not of Interest" icon={Ban} items={items} /> : null; })() },
    { title: 'Expected Outcomes', icon: ListChecks, fieldKey: 'expected_outcomes', content: outcomeItems?.length ? <ListSection title="Expected Outcomes" icon={ListChecks} items={outcomeItems} /> : null },
    { title: 'Solution Type', icon: Briefcase, fieldKey: 'solution_type', content: data.solution_type ? <BadgeSection title="Solution Type" icon={Briefcase} value={data.solution_type} /> : null },
    { title: 'Deliverables', icon: FileText, fieldKey: 'deliverables_list', content: deliverablesList.length ? <ListSection title="Deliverables" icon={FileText} items={deliverablesList.map((d) => ({ name: typeof d === 'string' ? d : (d?.name as string) ?? (d?.title as string) ?? JSON.stringify(d) }))} /> : null },
    { title: 'Currency', icon: Coins, fieldKey: 'currency_code', content: currency ? <BadgeSection title="Currency" icon={Coins} value={currency} /> : null },
    { title: 'Maturity Level', icon: Layers, fieldKey: 'maturity_level', content: data.maturity_level ? <BadgeSection title="Maturity Level" icon={Layers} value={getMaturityLabel(data.maturity_level)} /> : null },
    { title: 'Data Resources Provided', icon: FileText, fieldKey: 'data_resources_provided', content: dataResourceItems?.length ? <ListSection title="Data Resources Provided" icon={FileText} items={dataResourceItems} /> : null },
    { title: 'Success Metrics & KPIs', icon: BarChart3, fieldKey: 'success_metrics_kpis', content: metricsItems?.length ? <ListSection title="Success Metrics & KPIs" icon={BarChart3} items={metricsItems} /> : null },
    { title: 'Complexity', icon: BarChart3, fieldKey: 'complexity_level', content: data.complexity_level ? (
      <Card className="border-border"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" /> Complexity</CardTitle></CardHeader><CardContent><Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>{data.complexity_level}{data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}</Badge></CardContent></Card>
    ) : null },
    { title: 'Effort Level', icon: BarChart3, fieldKey: 'effort_level', content: data.effort_level ? <BadgeSection title="Effort Level" icon={BarChart3} value={data.effort_level} /> : null },
    { title: 'Eligibility', icon: ShieldCheck, fieldKey: 'eligibility', content: data.eligibility ? <BadgeSection title="Eligibility" icon={ShieldCheck} value={data.eligibility} /> : null },
    { title: 'Evaluation Criteria', icon: BarChart3, fieldKey: 'weighted_criteria', content: weightedCriteria.length ? <WeightedCriteriaSection title="Evaluation Criteria" criteria={weightedCriteria} /> : null },
    { title: 'Submission Guidelines', icon: FileText, fieldKey: 'submission_guidelines', content: guidelinesItems?.length ? <ListSection title="Submission Guidelines" icon={FileText} items={guidelinesItems} /> : null },
    { title: 'Reward Structure', icon: Trophy, fieldKey: 'platinum_award', content: platinumAward > 0 ? (
      <Card className="border-border"><CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-primary" /> Reward Structure</CardTitle></CardHeader><CardContent><div className="space-y-1 text-sm"><p><span className="font-medium text-foreground">Budget Max:</span> <span className="text-muted-foreground">{formatCurrency(platinumAward, currency)}</span></p>{goldAward > 0 && <p><span className="font-medium text-foreground">Gold:</span> <span className="text-muted-foreground">{formatCurrency(goldAward, currency)}</span></p>}{silverAward > 0 && <p><span className="font-medium text-foreground">Silver:</span> <span className="text-muted-foreground">{formatCurrency(silverAward, currency)}</span></p>}</div></CardContent></Card>
    ) : null },
    { title: 'IP Model', icon: Briefcase, fieldKey: 'ip_model', content: data.ip_model ? <BadgeSection title="IP Model" icon={Briefcase} value={data.ip_model.replace(/_/g, ' ')} /> : null },
    { title: 'Expected Timeline', icon: Clock, fieldKey: 'expected_timeline', content: phaseSchedule?.expected_timeline ? <BadgeSection title="Expected Timeline" icon={Clock} value={String(phaseSchedule.expected_timeline)} /> : null },
    { title: 'Domain Tags', icon: Tag, fieldKey: 'domain_tags', content: (data.domain_tags as string[])?.length ? <TagsSection title="Domain Tags" tags={data.domain_tags as string[]} /> : null },
    { title: 'Reference Links', icon: Link2, content: refUrls?.length ? <ReferenceLinksSection title="Reference Links" urls={refUrls} /> : null },
  ];
}

function buildOrgDetailsSection(data: PublicChallengeData): SectionDef {
  const hasContent = data.organization_name || data.organization_description || data.organization_website;
  return {
    title: 'Organization Details', icon: Building2, fieldKey: 'organization_details',
    content: hasContent ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.organization_name && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Organization</p>
              <p className="font-medium text-foreground">{data.trade_brand_name || data.organization_name}</p>
            </div>
          )}
          {data.organization_description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Description</p>
              <p className="text-muted-foreground leading-relaxed">{data.organization_description}</p>
            </div>
          )}
          {data.organization_website && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Website</p>
              <a href={data.organization_website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{data.organization_website}</a>
            </div>
          )}
        </CardContent>
      </Card>
    ) : null,
  };
}
