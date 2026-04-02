/**
 * CreatorSectionBuilders — Pure functions that build section definitions
 * for the "My Version" and "Curator Version" tabs.
 * Extracted from CreatorChallengeDetailView.tsx (Batch B).
 */

import React from 'react';
import {
  Target, Layers, BookOpen, Info, Trophy, Clock, Tag,
  Briefcase, MapPin, ListChecks, BarChart3, FileText, Scale, ShieldCheck, Globe,
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
  type SectionDef,
} from './CreatorSectionRenderers';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { formatCurrency, governanceLabel, complexityColor } from '@/lib/cogniblend/displayHelpers';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';

export function buildMyVersionSections(snapshot: Record<string, unknown>): SectionDef[] {
  const eb = (snapshot.extended_brief ?? {}) as Record<string, unknown>;
  const rs = (snapshot.reward_structure ?? {}) as Record<string, unknown>;
  const currency = (snapshot.currency as string) || (rs.currency as string) || 'USD';
  const budgetMin = Number(snapshot.budget_min ?? rs.budget_min ?? 0);
  const budgetMax = Number(snapshot.budget_max ?? rs.budget_max ?? 0);

  return [
    {
      title: 'Problem Statement', icon: Target, fieldKey: 'problem_statement',
      content: snapshot.problem_statement ? <RichTextSection title="Problem Statement" html={snapshot.problem_statement as string} icon={Target} /> : null,
    },
    {
      title: 'Scope / Constraints', icon: Layers, fieldKey: 'scope',
      content: snapshot.scope ? <RichTextSection title="Scope / Constraints" html={snapshot.scope as string} icon={Layers} /> : null,
    },
    {
      title: 'Expected Outcomes', icon: ListChecks, fieldKey: 'expected_outcomes',
      content: parseItems(snapshot.expected_outcomes) ? <ListSection title="Expected Outcomes" icon={ListChecks} items={parseItems(snapshot.expected_outcomes)!} /> : null,
    },
    {
      title: 'Context & Background', icon: BookOpen, fieldKey: 'context_background',
      content: eb.context_background ? <RichTextSection title="Context & Background" html={eb.context_background as string} icon={BookOpen} /> : null,
    },
    {
      title: 'Root Causes', icon: Info, fieldKey: 'root_causes',
      content: parseItems(eb.root_causes) ? <ListSection title="Root Causes" icon={Info} items={parseItems(eb.root_causes)!} /> : null,
    },
    {
      title: 'Affected Stakeholders', icon: Info, fieldKey: 'affected_stakeholders',
      content: parseStakeholders(eb.affected_stakeholders) ? <ListSection title="Affected Stakeholders" icon={Info} items={parseStakeholders(eb.affected_stakeholders)!} /> : null,
    },
    {
      title: 'Current Deficiencies', icon: Info, fieldKey: 'current_deficiencies',
      content: parseItems(eb.current_deficiencies) ? <ListSection title="Current Deficiencies" icon={Info} items={parseItems(eb.current_deficiencies)!} /> : null,
    },
    {
      title: 'Preferred Approach', icon: Info, fieldKey: 'preferred_approach',
      content: parseItems(eb.preferred_approach) ? <ListSection title="Preferred Approach" icon={Info} items={parseItems(eb.preferred_approach)!} /> : null,
    },
    {
      title: 'Approaches Not of Interest', icon: Info, fieldKey: 'approaches_not_of_interest',
      content: parseItems(eb.approaches_not_of_interest) ? <ListSection title="Approaches Not of Interest" icon={Info} items={parseItems(eb.approaches_not_of_interest)!} /> : null,
    },
    {
      title: 'Budget Range', icon: Trophy, fieldKey: 'platinum_award',
      content: (budgetMin > 0 || budgetMax > 0) ? (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-primary" /> Budget Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">
              {budgetMin > 0 && `${formatCurrency(budgetMin, currency)} — `}
              {formatCurrency(budgetMax, currency)}
              <span className="text-sm font-normal text-muted-foreground ml-1.5">{currency}</span>
            </p>
          </CardContent>
        </Card>
      ) : null,
    },
    {
      title: 'Expected Timeline', icon: Clock, fieldKey: 'expected_timeline',
      content: snapshot.expected_timeline ? (
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Expected Timeline</p>
              <p className="text-sm font-medium text-foreground">{String(snapshot.expected_timeline)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null,
    },
    {
      title: 'Maturity Level', icon: Layers, fieldKey: 'maturity_level',
      content: snapshot.maturity_level ? <BadgeSection title="Maturity Level" icon={Layers} value={getMaturityLabel(snapshot.maturity_level as string)} /> : null,
    },
    {
      title: 'IP Model', icon: Briefcase, fieldKey: 'ip_model',
      content: snapshot.ip_model ? <BadgeSection title="IP Model" icon={Briefcase} value={(snapshot.ip_model as string).replace(/_/g, ' ')} /> : null,
    },
    {
      title: 'Domain Tags', icon: Tag, fieldKey: 'domain_tags',
      content: (() => {
        const tags = snapshot.domain_tags as string[] | undefined;
        if (!tags?.length) return null;
        const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const displayTags = tags.map((t) => isUuid(t) ? `Tag ${t.substring(0, 6)}…` : t);
        return <TagsSection title="Domain Tags" tags={displayTags} />;
      })(),
    },
  ];
}

export function buildCuratorSections(data: PublicChallengeData): SectionDef[] {
  const eb = data.extended_brief ?? {};
  const rs = data.reward_structure ?? {};
  const currency = data.currency_code || 'USD';
  const evalCriteria = data.evaluation_criteria as Record<string, unknown> | null;
  const weightedCriteria = (evalCriteria?.weighted_criteria ?? evalCriteria?.criteria ?? []) as Array<{ name: string; weight: number }>;
  const deliverables = data.deliverables as Record<string, unknown> | null;
  const deliverablesList = (deliverables?.deliverables_list ?? deliverables?.items ?? []) as any[];
  const outcomeItems = parseItems(data.expected_outcomes);
  const metricsItems = parseItems(data.success_metrics_kpis);
  const dataResources = data.data_resources_provided as Record<string, unknown> | null;
  const dataResourceItems = parseItems(dataResources) ?? (dataResources?.items ? parseItems(dataResources.items) : null);
  const guidelinesItems = parseItems(data.submission_guidelines);
  const phaseSchedule = data.phase_schedule as Record<string, unknown> | null;
  const platinumAward = Number(rs.platinum_award ?? rs.budget_max ?? 0);
  const goldAward = Number(rs.gold_award ?? 0);
  const silverAward = Number(rs.silver_award ?? 0);

  return [
    { title: 'Problem Statement', icon: Target, fieldKey: 'problem_statement', content: data.problem_statement ? <RichTextSection title="Problem Statement" html={data.problem_statement} icon={Target} /> : null },
    { title: 'Scope', icon: Layers, fieldKey: 'scope', content: data.scope ? <RichTextSection title="Scope" html={data.scope} icon={Layers} /> : null },
    { title: 'Expected Outcomes', icon: ListChecks, fieldKey: 'expected_outcomes', content: outcomeItems?.length ? <ListSection title="Expected Outcomes" icon={ListChecks} items={outcomeItems} /> : null },
    { title: 'Context & Background', icon: BookOpen, fieldKey: 'context_background', content: (eb as any).context_background ? <RichTextSection title="Context & Background" html={(eb as any).context_background} icon={BookOpen} /> : null },
    { title: 'Root Causes', icon: Info, fieldKey: 'root_causes', content: (() => { const items = parseItems((eb as any).root_causes); return items?.length ? <ListSection title="Root Causes" icon={Info} items={items} /> : null; })() },
    { title: 'Affected Stakeholders', icon: Info, fieldKey: 'affected_stakeholders', content: (() => { const items = parseStakeholders((eb as any).affected_stakeholders); return items?.length ? <ListSection title="Affected Stakeholders" icon={Info} items={items} /> : null; })() },
    { title: 'Current Deficiencies', icon: Info, fieldKey: 'current_deficiencies', content: (() => { const items = parseItems((eb as any).current_deficiencies); return items?.length ? <ListSection title="Current Deficiencies" icon={Info} items={items} /> : null; })() },
    { title: 'Preferred Approach', icon: Info, fieldKey: 'preferred_approach', content: (() => { const items = parseItems((eb as any).preferred_approach); return items?.length ? <ListSection title="Preferred Approach" icon={Info} items={items} /> : null; })() },
    { title: 'Approaches Not of Interest', icon: Info, fieldKey: 'approaches_not_of_interest', content: (() => { const items = parseItems((eb as any).approaches_not_of_interest); return items?.length ? <ListSection title="Approaches Not of Interest" icon={Info} items={items} /> : null; })() },
    { title: 'Value Proposition (Hook)', icon: Info, fieldKey: 'hook', content: data.hook ? <RichTextSection title="Value Proposition (Hook)" html={data.hook} icon={Info} /> : null },
    { title: 'Solution Type', icon: Briefcase, fieldKey: 'solution_type', content: data.solution_type ? <BadgeSection title="Solution Type" icon={Briefcase} value={data.solution_type} /> : null },
    { title: 'Deliverables', icon: FileText, fieldKey: 'deliverables_list', content: deliverablesList.length ? <ListSection title="Deliverables" icon={FileText} items={deliverablesList.map((d: any) => ({ name: typeof d === 'string' ? d : d?.name ?? d?.title ?? JSON.stringify(d) }))} /> : null },
    { title: 'Maturity Level', icon: Layers, fieldKey: 'maturity_level', content: data.maturity_level ? <BadgeSection title="Maturity Level" icon={Layers} value={getMaturityLabel(data.maturity_level)} /> : null },
    { title: 'Data Resources Provided', icon: FileText, fieldKey: 'data_resources_provided', content: dataResourceItems?.length ? <ListSection title="Data Resources Provided" icon={FileText} items={dataResourceItems} /> : null },
    { title: 'Success Metrics & KPIs', icon: BarChart3, fieldKey: 'success_metrics_kpis', content: metricsItems?.length ? <ListSection title="Success Metrics & KPIs" icon={BarChart3} items={metricsItems} /> : null },
    { title: 'Complexity', icon: BarChart3, fieldKey: 'complexity_level', content: data.complexity_level ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Complexity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>
            {data.complexity_level}
            {data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}
          </Badge>
        </CardContent>
      </Card>
    ) : null },
    { title: 'Effort Level', icon: BarChart3, fieldKey: 'effort_level', content: data.effort_level ? <BadgeSection title="Effort Level" icon={BarChart3} value={data.effort_level} /> : null },
    { title: 'Eligibility', icon: ShieldCheck, fieldKey: 'eligibility', content: data.eligibility ? <BadgeSection title="Eligibility" icon={ShieldCheck} value={data.eligibility} /> : null },
    { title: 'Evaluation Criteria', icon: BarChart3, fieldKey: 'weighted_criteria', content: weightedCriteria.length ? <WeightedCriteriaSection title="Evaluation Criteria" criteria={weightedCriteria} /> : null },
    { title: 'Submission Guidelines', icon: FileText, fieldKey: 'submission_guidelines', content: guidelinesItems?.length ? <ListSection title="Submission Guidelines" icon={FileText} items={guidelinesItems} /> : null },
    { title: 'Reward Structure', icon: Trophy, fieldKey: 'platinum_award', content: platinumAward > 0 ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" /> Reward Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium text-foreground">Budget Max:</span> <span className="text-muted-foreground">{formatCurrency(platinumAward, currency)}</span></p>
            {goldAward > 0 && <p><span className="font-medium text-foreground">Gold:</span> <span className="text-muted-foreground">{formatCurrency(goldAward, currency)}</span></p>}
            {silverAward > 0 && <p><span className="font-medium text-foreground">Silver:</span> <span className="text-muted-foreground">{formatCurrency(silverAward, currency)}</span></p>}
          </div>
        </CardContent>
      </Card>
    ) : null },
    { title: 'IP Model', icon: Briefcase, fieldKey: 'ip_model', content: data.ip_model ? <BadgeSection title="IP Model" icon={Briefcase} value={data.ip_model.replace(/_/g, ' ')} /> : null },
    { title: 'Phase Schedule', icon: Clock, fieldKey: 'phase_schedule', content: phaseSchedule && Object.keys(phaseSchedule).length ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Phase Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(phaseSchedule).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-muted/30 border border-border px-4 py-2.5">
                <p className="text-[13px] font-semibold text-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                <Badge variant="outline" className="text-xs font-bold">{String(value)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ) : null },
    { title: 'Governance', icon: Scale, content: data.governance_profile ? <BadgeSection title="Governance Profile" icon={Scale} value={governanceLabel(data.governance_profile)} /> : null },
    { title: 'Visibility', icon: Globe, content: data.challenge_visibility ? <BadgeSection title="Visibility" icon={Globe} value={data.challenge_visibility} /> : null },
    { title: 'Functional Area', icon: Briefcase, fieldKey: 'functional_area', content: data.functional_area ? <BadgeSection title="Functional Area" icon={Briefcase} value={data.functional_area} /> : null },
    { title: 'Target Geography', icon: MapPin, fieldKey: 'target_geography', content: data.target_geography ? <BadgeSection title="Target Geography" icon={MapPin} value={data.target_geography} /> : null },
    { title: 'Domain Tags', icon: Tag, fieldKey: 'domain_tags', content: (data.domain_tags as string[])?.length ? <TagsSection title="Domain Tags" tags={data.domain_tags as string[]} /> : null },
  ];
}
