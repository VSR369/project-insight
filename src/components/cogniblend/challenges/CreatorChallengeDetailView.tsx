/**
 * CreatorChallengeDetailView — Dual-tab view: My Version (snapshot) + Curator Version (live).
 * Vertical scrolling with search filter on section headings.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Globe, Search, Target, Layers, BookOpen,
  Info, Trophy, Clock, Tag, Briefcase, MapPin, ListChecks, BarChart3,
  FileText, Scale, ShieldCheck, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';
import { getMaturityLabel } from '@/lib/maturityLabels';
import { ChallengeQASection } from '@/components/cogniblend/solver/ChallengeQASection';
import { useGovernanceFieldRules, isFieldVisible } from '@/hooks/queries/useGovernanceFieldRules';
import { resolveChallengeGovernance } from '@/lib/governanceMode';
import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

/* ─── parseItems: robust JSONB → displayable list helper ── */

/**
 * Safely extracts a displayable list from various stored formats:
 * - { items: [{ name: "..." }] }  → extract names
 * - string[]                      → wrap each
 * - JSON string                   → parse then extract
 * - plain string                  → single item
 */
function parseItems(value: unknown): Array<{ name: string }> | null {
  if (!value) return null;
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return [{ name: parsed as string }]; }
  }
  if (typeof parsed === 'object' && parsed !== null && 'items' in (parsed as any)) {
    const items = (parsed as any).items;
    if (Array.isArray(items) && items.length > 0) {
      return items.map((i: any) => ({ name: typeof i === 'string' ? i : i?.name ?? JSON.stringify(i) }));
    }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((item: any) => ({ name: typeof item === 'string' ? item : item?.name ?? JSON.stringify(item) }));
  }
  if (typeof value === 'string' && (value as string).trim()) return [{ name: value as string }];
  return null;
}

/**
 * Parse affected_stakeholders from various formats into a structured list.
 */
function parseStakeholders(value: unknown): Array<{ name: string }> | null {
  if (!value) return null;
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return [{ name: parsed as string }]; }
  }
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((s: any) => {
      if (typeof s === 'string') return { name: s };
      const label = s?.stakeholder_name || s?.name || '';
      const role = s?.role ? ` (${s.role})` : '';
      return { name: `${label}${role}`.trim() || JSON.stringify(s) };
    });
  }
  return parseItems(value);
}

/* ─── Helpers ────────────────────────────────────────────── */

function complexityColor(level: string | null): string {
  switch (level) {
    case 'L1': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'L2': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'L3': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'L4': return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'L5': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);
}

/* getMaturityLabel imported from @/lib/maturityLabels */

function governanceLabel(profile: string | null): string {
  switch (profile) {
    case 'LIGHTWEIGHT': return 'Quick';
    case 'STRUCTURED': return 'Structured';
    case 'CONTROLLED': return 'Controlled';
    default: return profile || '—';
  }
}

/* ─── Section rendering helpers ──────────────────────────── */

interface SectionDef {
  title: string;
  icon: React.ElementType;
  content: React.ReactNode | null;
  fieldKey?: string; // maps to md_governance_field_rules.field_key
}

function RichTextSection({ title, html, icon: Icon }: { title: string; html: string | null | undefined; icon: React.ElementType }) {
  if (!html) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SafeHtmlRenderer html={html} />
      </CardContent>
    </Card>
  );
}

function BadgeSection({ title, icon: Icon, value }: { title: string; icon: React.ElementType; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary" className="text-xs font-semibold">{value}</Badge>
      </CardContent>
    </Card>
  );
}

function ListSection({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: Array<{ name?: string; title?: string; target?: string }> | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              {item.name || item.title || JSON.stringify(item)}
              {item.target ? ` — Target: ${item.target}` : ''}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function WeightedCriteriaSection({ title, criteria }: { title: string; criteria: Array<{ name: string; weight: number }> }) {
  if (!criteria || criteria.length === 0) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criterion</th>
                <th className="text-right py-2 pl-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Weight</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4 text-foreground font-medium">{c.name}</td>
                  <td className="py-2.5 pl-4 text-right">
                    <Badge variant="secondary" className="text-xs font-bold tabular-nums">{c.weight}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TagsSection({ title, tags }: { title: string; tags: string[] | null | undefined }) {
  if (!tags || tags.length === 0) return null;
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs">{String(tag)}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPlaceholder({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <p className="text-sm text-muted-foreground italic">{message}</p>
      </CardContent>
    </Card>
  );
}

/* ─── Search + Filter ────────────────────────────────────── */

function FilteredSections({ sections, searchTerm, fieldRules }: { sections: SectionDef[]; searchTerm: string; fieldRules?: FieldRulesMap }) {
  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (s.content === null) return false;
      // Hide sections whose governance field rule is 'hidden'
      if (s.fieldKey && fieldRules && !isFieldVisible(fieldRules, s.fieldKey)) return false;
      if (searchTerm.trim()) {
        return s.title.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [sections, searchTerm, fieldRules]);

  if (filtered.length === 0) {
    return <EmptyPlaceholder message={searchTerm ? `No sections matching "${searchTerm}"` : 'No content available.'} />;
  }

  return <>{filtered.map((s) => <div key={s.title}>{s.content}</div>)}</>;
}

/* ─── Main Component ─────────────────────────────────────── */

interface CreatorChallengeDetailViewProps {
  data: PublicChallengeData;
  challengeId: string;
}

export function CreatorChallengeDetailView({ data, challengeId }: CreatorChallengeDetailViewProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve effective governance mode and fetch field rules
  const effectiveGovernance = resolveChallengeGovernance(
    data.governance_mode_override,
    data.governance_profile,
    null // tier ceiling not needed for display filtering
  );
  const { data: fieldRules } = useGovernanceFieldRules(effectiveGovernance);

  const snapshot = (data as any).creator_snapshot as Record<string, unknown> | null;
  const hasSnapshot = !!snapshot && Object.keys(snapshot).length > 0;

  /* ── Build "My Version" sections from snapshot ── */
  const myVersionSections: SectionDef[] = useMemo(() => {
    if (!snapshot) return [];
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
        content: (snapshot.domain_tags as string[])?.length ? <TagsSection title="Domain Tags" tags={snapshot.domain_tags as string[]} /> : null,
      },
    ];
  }, [snapshot]);

  /* ── Build "Curator Version" sections from live challenge data ── */
  const curatorSections: SectionDef[] = useMemo(() => {
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
  }, [data]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back nav */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/cogni/my-challenges')}
        className="text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> My Challenges
      </Button>

      {/* Hero */}
      <div className="space-y-4">
        {(data.organization_name || data.industry_name) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {(data.organization_name || data.trade_brand_name) && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {data.trade_brand_name || data.organization_name}
              </span>
            )}
            {data.industry_name && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                {data.industry_name}
              </span>
            )}
          </div>
        )}

        <h1 className="text-2xl font-bold text-primary tracking-tight leading-tight">
          {data.title}
        </h1>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          {data.master_status === 'IN_PREPARATION' && (
            <Badge variant="outline" className="text-xs font-semibold border-amber-300 text-amber-700 bg-amber-50">
              {data.current_phase === 1 ? 'Draft' : 'In Curation'}
            </Badge>
          )}
          {data.master_status === 'ACTIVE' && (
            <Badge variant="outline" className="text-xs font-semibold border-emerald-300 text-emerald-700 bg-emerald-50">
              Published
            </Badge>
          )}
          {data.master_status === 'COMPLETED' && (
            <Badge variant="outline" className="text-xs font-semibold border-blue-300 text-blue-700 bg-blue-50">
              Completed
            </Badge>
          )}
          {data.governance_profile && (
            <Badge variant="secondary" className="text-xs font-semibold">
              {governanceLabel(data.governance_profile)}
            </Badge>
          )}
          {data.complexity_level && (
            <Badge className={cn('text-xs font-semibold border', complexityColor(data.complexity_level))}>
              {data.complexity_level}
              {data.complexity_score != null && ` — ${Number(data.complexity_score).toFixed(1)}`}
            </Badge>
          )}
          {data.current_phase != null && (
            <Badge variant="outline" className="text-xs font-semibold">
              Phase {data.current_phase}
            </Badge>
          )}
        </div>
      </div>

      {/* Dual-tab view */}
      <Tabs defaultValue={hasSnapshot ? 'my-version' : 'curator-version'} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <TabsList className="w-auto">
            <TabsTrigger value="my-version" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" /> My Version
            </TabsTrigger>
            <TabsTrigger value="curator-version" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> Curator Version
            </TabsTrigger>
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* My Version tab */}
        <TabsContent value="my-version" className="space-y-4">
          {hasSnapshot ? (
            <FilteredSections sections={myVersionSections} searchTerm={searchTerm} fieldRules={fieldRules} />
          ) : (
            <Card className="border-dashed border-amber-300 bg-amber-50/50">
              <CardContent className="py-8 text-center">
                <Info className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-800">Original submission data is not available</p>
                <p className="text-xs text-amber-600 mt-1">This challenge was created before snapshot tracking was enabled. Please view the Curator Version instead.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Curator Version tab */}
        <TabsContent value="curator-version" className="space-y-4">
          {((data.current_phase ?? 1) > 3 || ((data.current_phase ?? 1) === 3 && data.phase_status === 'COMPLETED')) ? (
            <FilteredSections sections={curatorSections} searchTerm={searchTerm} />
          ) : (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-10 w-10 text-primary/50 mx-auto mb-3" />
                <p className="text-base font-semibold text-foreground">Under Review by Curator</p>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                  This challenge is currently being reviewed and refined by the Curator.
                  The curated version will be available once the review is complete and submitted for approval.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Q&A section */}
      <ChallengeQASection challengeId={challengeId} />
      <div className="pb-8" />
    </div>
  );
}
