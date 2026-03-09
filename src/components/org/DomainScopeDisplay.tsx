/**
 * DomainScopeDisplay — Resolves UUID arrays from DomainScope to display names.
 * Used in AdminManagementPage table and EditDelegatedAdminPage.
 */

import { Badge } from '@/components/ui/badge';
import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useProficiencyAreasBySegments, useSubDomainsByAreas, useSpecialitiesBySubDomains } from '@/hooks/queries/useScopeTaxonomy';
import type { DomainScope } from '@/hooks/queries/useDelegatedAdmins';
import { EMPTY_SCOPE } from '@/hooks/queries/useDelegatedAdmins';

interface DomainScopeDisplayProps {
  scope: DomainScope | null | undefined;
  /** Show only industry segments (compact mode for tables) */
  compact?: boolean;
}

export function DomainScopeDisplay({ scope, compact = false }: DomainScopeDisplayProps) {
  const s = scope ?? EMPTY_SCOPE;
  const { data: industries = [] } = useIndustrySegments();
  const { data: profAreas = [] } = useProficiencyAreasBySegments(s.industry_segment_ids);
  const { data: subDomains = [] } = useSubDomainsByAreas(s.proficiency_area_ids);
  const { data: specialities = [] } = useSpecialitiesBySubDomains(s.sub_domain_ids);

  const resolveNames = (ids: string[], items: { id: string; name: string }[]): string[] =>
    ids.map((id) => items.find((i) => i.id === id)?.name ?? id.slice(0, 8));

  const industryNames = resolveNames(s.industry_segment_ids, industries);

  if (compact) {
    if (industryNames.length === 0) return <span className="text-muted-foreground text-xs">All</span>;
    return (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {industryNames.slice(0, 2).map((name) => (
          <Badge key={name} variant="outline" className="text-[10px]">{name}</Badge>
        ))}
        {industryNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px]">+{industryNames.length - 2}</Badge>
        )}
      </div>
    );
  }

  const sections: { label: string; names: string[] }[] = [
    { label: 'Industries', names: industryNames },
    { label: 'Proficiency Areas', names: resolveNames(s.proficiency_area_ids, profAreas) },
    { label: 'Sub-domains', names: resolveNames(s.sub_domain_ids, subDomains) },
    { label: 'Specialities', names: resolveNames(s.speciality_ids, specialities) },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        if (section.names.length === 0) return null;
        return (
          <div key={section.label}>
            <p className="text-xs text-muted-foreground mb-1">{section.label}</p>
            <div className="flex flex-wrap gap-1">
              {section.names.map((name) => (
                <Badge key={name} variant="outline" className="text-xs">{name}</Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
