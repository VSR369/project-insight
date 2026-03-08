import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExpertiseTagsProps {
  ids: string[];
  type: 'industry' | 'country' | 'org_type';
  max?: number;
}

export function ExpertiseTags({ ids, type, max = 3 }: ExpertiseTagsProps) {
  const { data: labels } = useExpertiseLabels(ids, type);

  if (!ids?.length) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }

  const displayed = labels?.slice(0, max) ?? [];
  const remaining = (labels?.length ?? 0) - max;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((label, i) => (
        <Badge key={i} variant="outline" className="text-xs">
          {label}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

function useExpertiseLabels(ids: string[], type: 'industry' | 'country' | 'org_type') {
  return useQuery({
    queryKey: ['expertise-labels', type, ids],
    queryFn: async () => {
      const table = type === 'industry'
        ? 'industry_segments'
        : type === 'country'
          ? 'countries'
          : 'organization_types';

      const { data, error } = await supabase
        .from(table)
        .select('id, name')
        .in('id', ids);

      if (error) return ids;
      const map = new Map(data.map((d) => [d.id, d.name]));
      return ids.map((id) => map.get(id) || id);
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
