/**
 * CreatorSectionBuilders — Pure functions that build section definitions
 * for the "My Version" and "Curator Version" tabs.
 *
 * Builds ALL possible sections; governance filtering is done downstream
 * by FilteredSections using fieldRules from md_governance_field_rules.
 *
 * CREATOR_SECTION_KEYS is used only for "Your input" badge display.
 */

import React from 'react';
import {
  Target, Layers, BookOpen, Info, Trophy, Clock, Tag,
  Briefcase, MapPin, ListChecks, BarChart3, FileText, Scale, ShieldCheck, Globe,
  Coins, Link2, Users, AlertTriangle, XCircle, Compass, Ban,
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
import { formatCurrency, governanceLabel, complexityColor } from '@/lib/cogniblend/displayHelpers';
import type { PublicChallengeData } from '@/hooks/cogniblend/usePublicChallenge';

/* ── Creator field keys per governance mode (for "Your input" badge only) ── */

const CREATOR_SECTION_KEYS: Record<string, string[]> = {
  QUICK: [
    'title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award',
  ],
  STRUCTURED: [
    'title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award',
    'scope', 'maturity_level', 'weighted_criteria',
  ],
  CONTROLLED: [
    'title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award',
    'scope', 'maturity_level', 'weighted_criteria',
    'hook', 'context_background', 'ip_model', 'expected_timeline',
    'root_causes', 'affected_stakeholders', 'current_deficiencies',
    'expected_outcomes', 'preferred_approach', 'approaches_not_of_interest',
  ],
};

export { CREATOR_SECTION_KEYS };

/* ── My Version (Creator snapshot) ── */

export function buildMyVersionSections(
  snapshot: Record<string, unknown>,
): SectionDef[] {
  // Build ALL sections; filtering is done by FilteredSections + fieldRules
  return buildAllSnapshotSections(snapshot).filter((s) => s.content !== null);
}

function buildAllSnapshotSections(snapshot: Record<string, unknown>): SectionDef[] {
  const eb = (snapshot.extended_brief ?? {}) as Record<string, unknown>;
  const rs = (snapshot.reward_structure ?? {}) as Record<string, unknown>;
  const currencyCode = (snapshot.currency_code as string) || (snapshot.currency as string) || (rs.currency as string) || 'USD';
  const platinumAward = Number(snapshot.platinum_award ?? snapshot.budget_max ?? rs.platinum_award ?? rs.budget_max ?? 0);
  const phaseSchedule = (snapshot.phase_schedule ?? {}) as Record<string, unknown>;
  const refUrls = (eb.reference_urls ?? snapshot.reference_urls) as string[] | undefined;

  return [
    buildTitleSection(snapshot),
    buildProblemSection(snapshot),
    buildHookSection(snapshot),
    buildScopeSection(snapshot),
    buildContextSection(snapshot, eb),
    buildRootCausesSection(eb),
    buildStakeholdersSection(eb),
    buildDeficienciesSection(eb),
    buildPreferredApproachSection(eb),
    buildApproachesNotOfInterestSection(eb),
    buildExpectedOutcomesSection(snapshot),
    buildCurrencySection(currencyCode),
    buildTopPrizeSection(platinumAward, currencyCode),
    buildTimelineSection(phaseSchedule, snapshot),
    buildMaturitySection(snapshot),
    buildIpModelSection(snapshot),
    buildDomainTagsSection(snapshot),
    buildWeightedCriteriaSection(snapshot),
    buildRefLinksSection(refUrls),
  ];
}

/* ── Individual snapshot section builders ── */

function buildTitleSection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'Challenge Title', icon: FileText, fieldKey: 'title',
    content: s.title ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" /> Challenge Title
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium text-foreground">{String(s.title)}</p>
        </CardContent>
      </Card>
    ) : null,
  };
}

function buildProblemSection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'Problem Statement', icon: Target, fieldKey: 'problem_statement',
    content: s.problem_statement ? <RichTextSection title="Problem Statement" html={s.problem_statement as string} icon={Target} /> : null,
  };
}

function buildHookSection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'Value Proposition (Hook)', icon: Info, fieldKey: 'hook',
    content: s.hook ? <RichTextSection title="Value Proposition (Hook)" html={s.hook as string} icon={Info} /> : null,
  };
}

function buildScopeSection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'Scope / Constraints', icon: Layers, fieldKey: 'scope',
    content: s.scope ? <RichTextSection title="Scope / Constraints" html={s.scope as string} icon={Layers} /> : null,
  };
}

function buildContextSection(s: Record<string, unknown>, eb: Record<string, unknown>): SectionDef {
  const val = (s.context_background as string) || (eb.context_background as string);
  return {
    title: 'Context & Background', icon: BookOpen, fieldKey: 'context_background',
    content: val ? <RichTextSection title="Context & Background" html={val} icon={BookOpen} /> : null,
  };
}

function buildRootCausesSection(eb: Record<string, unknown>): SectionDef {
  const items = parseItems(eb.root_causes);
  return {
    title: 'Root Causes', icon: AlertTriangle, fieldKey: 'root_causes',
    content: items?.length ? <ListSection title="Root Causes" icon={AlertTriangle} items={items} /> : null,
  };
}

function buildStakeholdersSection(eb: Record<string, unknown>): SectionDef {
  const items = parseStakeholders(eb.affected_stakeholders);
  return {
    title: 'Affected Stakeholders', icon: Users, fieldKey: 'affected_stakeholders',
    content: items?.length ? <ListSection title="Affected Stakeholders" icon={Users} items={items} /> : null,
  };
}

function buildDeficienciesSection(eb: Record<string, unknown>): SectionDef {
  const items = parseItems(eb.current_deficiencies);
  return {
    title: 'Current Deficiencies', icon: XCircle, fieldKey: 'current_deficiencies',
    content: items?.length ? <ListSection title="Current Deficiencies" icon={XCircle} items={items} /> : null,
  };
}

function buildPreferredApproachSection(eb: Record<string, unknown>): SectionDef {
  const items = parseItems(eb.preferred_approach);
  return {
    title: 'Preferred Approach', icon: Compass, fieldKey: 'preferred_approach',
    content: items?.length ? <ListSection title="Preferred Approach" icon={Compass} items={items} /> : null,
  };
}

function buildApproachesNotOfInterestSection(eb: Record<string, unknown>): SectionDef {
  const items = parseItems(eb.approaches_not_of_interest);
  return {
    title: 'Approaches Not of Interest', icon: Ban, fieldKey: 'approaches_not_of_interest',
    content: items?.length ? <ListSection title="Approaches Not of Interest" icon={Ban} items={items} /> : null,
  };
}

function buildExpectedOutcomesSection(s: Record<string, unknown>): SectionDef {
  const items = parseItems(s.expected_outcomes);
  return {
    title: 'Expected Outcomes', icon: ListChecks, fieldKey: 'expected_outcomes',
    content: items?.length ? <ListSection title="Expected Outcomes" icon={ListChecks} items={items} /> : null,
  };
}

function buildCurrencySection(currencyCode: string): SectionDef {
  return {
    title: 'Currency', icon: Coins, fieldKey: 'currency_code',
    content: currencyCode ? <BadgeSection title="Currency" icon={Coins} value={currencyCode} /> : null,
  };
}

function buildTopPrizeSection(amount: number, currency: string): SectionDef {
  return {
    title: 'Top Prize', icon: Trophy, fieldKey: 'platinum_award',
    content: amount > 0 ? (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-primary" /> Top Prize
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(amount, currency)}
            <span className="text-sm font-normal text-muted-foreground ml-1.5">{currency}</span>
          </p>
        </CardContent>
      </Card>
    ) : null,
  };
}

function buildTimelineSection(ps: Record<string, unknown>, s: Record<string, unknown>): SectionDef {
  const val = ps.expected_timeline || s.expected_timeline;
  return {
    title: 'Expected Timeline', icon: Clock, fieldKey: 'expected_timeline',
    content: val ? (
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Expected Timeline</p>
            <p className="text-sm font-medium text-foreground">{String(val)}</p>
          </div>
        </CardContent>
      </Card>
    ) : null,
  };
}

function buildMaturitySection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'Maturity Level', icon: Layers, fieldKey: 'maturity_level',
    content: s.maturity_level ? <BadgeSection title="Maturity Level" icon={Layers} value={getMaturityLabel(s.maturity_level as string)} /> : null,
  };
}

function buildIpModelSection(s: Record<string, unknown>): SectionDef {
  return {
    title: 'IP Model', icon: Briefcase, fieldKey: 'ip_model',
    content: s.ip_model ? <BadgeSection title="IP Model" icon={Briefcase} value={(s.ip_model as string).replace(/_/g, ' ')} /> : null,
  };
}

function buildDomainTagsSection(s: Record<string, unknown>): SectionDef {
  const tags = (s.domain_tags ?? s.domain_tag_ids) as string[] | undefined;
  if (!tags?.length) return { title: 'Domain Tags', icon: Tag, fieldKey: 'domain_tags', content: null };
  const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
  const displayTags = tags.map((t) => isUuid(t) ? `Tag ${t.substring(0, 6)}…` : t);
  return { title: 'Domain Tags', icon: Tag, fieldKey: 'domain_tags', content: <TagsSection title="Domain Tags" tags={displayTags} /> };
}

function buildWeightedCriteriaSection(s: Record<string, unknown>): SectionDef {
  const topWc = s.weighted_criteria as Array<{ name: string; weight: number }> | null;
  const ec = s.evaluation_criteria as Record<string, unknown> | null;
  const nestedWc = (ec?.weighted_criteria ?? ec?.criteria ?? []) as Array<{ name: string; weight: number }>;
  const criteria = topWc?.length ? topWc : nestedWc;
  return {
    title: 'Evaluation Criteria', icon: BarChart3, fieldKey: 'weighted_criteria',
    content: criteria.length ? <WeightedCriteriaSection title="Evaluation Criteria" criteria={criteria} /> : null,
  };
}

function buildRefLinksSection(urls: string[] | undefined): SectionDef {
  return {
    title: 'Reference Links', icon: Link2,
    content: urls?.length ? <ReferenceLinksSection title="Reference Links" urls={urls} /> : null,
  };
}
