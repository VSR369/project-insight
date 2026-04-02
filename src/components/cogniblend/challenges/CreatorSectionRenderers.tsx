/**
 * CreatorSectionRenderers — Reusable section display components
 * extracted from CreatorChallengeDetailView.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Tag } from 'lucide-react';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';

/* ─── parseItems: robust JSONB → displayable list helper ── */

export function parseItems(value: unknown): Array<{ name: string }> | null {
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

export function parseStakeholders(value: unknown): Array<{ name: string }> | null {
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

/* ─── Section rendering components ─── */

export interface SectionDef {
  title: string;
  icon: React.ElementType;
  content: React.ReactNode | null;
  fieldKey?: string;
}

export function RichTextSection({ title, html, icon: Icon }: { title: string; html: string | null | undefined; icon: React.ElementType }) {
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

export function BadgeSection({ title, icon: Icon, value }: { title: string; icon: React.ElementType; value: string | null | undefined }) {
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

export function ListSection({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: Array<{ name?: string; title?: string; target?: string }> | null | undefined }) {
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

export function WeightedCriteriaSection({ title, criteria }: { title: string; criteria: Array<{ name: string; weight: number }> }) {
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

export function TagsSection({ title, tags }: { title: string; tags: string[] | null | undefined }) {
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

export function EmptyPlaceholder({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <p className="text-sm text-muted-foreground italic">{message}</p>
      </CardContent>
    </Card>
  );
}

/* ─── Filtered sections container ─── */

import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
import { isFieldVisible } from '@/hooks/queries/useGovernanceFieldRules';

export function FilteredSections({ sections, searchTerm, fieldRules }: { sections: SectionDef[]; searchTerm: string; fieldRules?: FieldRulesMap }) {
  const filtered = useMemo(() => {
    return sections.filter((s) => {
      if (s.content === null) return false;
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
