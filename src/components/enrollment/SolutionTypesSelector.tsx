/**
 * Solution Types Selector
 * 
 * Grouped multi-select for md_solution_types.
 * Groups by proficiency_group with checkboxes.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SolutionType {
  id: string;
  code: string;
  label: string;
  proficiency_group: string;
  proficiency_group_label: string;
}

interface SolutionTypesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  maxSelections?: number;
  className?: string;
}

function useSolutionTypes() {
  return useQuery({
    queryKey: ['md-solution-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_solution_types')
        .select('id, code, label, proficiency_group, proficiency_group_label')
        .eq('is_active', true)
        .order('proficiency_group')
        .order('label');
      if (error) throw new Error(error.message);
      return (data ?? []) as SolutionType[];
    },
    staleTime: 15 * 60_000,
  });
}

function groupByProficiency(types: SolutionType[]): Map<string, { label: string; items: SolutionType[] }> {
  const groups = new Map<string, { label: string; items: SolutionType[] }>();
  for (const t of types) {
    const existing = groups.get(t.proficiency_group);
    if (existing) {
      existing.items.push(t);
    } else {
      groups.set(t.proficiency_group, { label: t.proficiency_group_label, items: [t] });
    }
  }
  return groups;
}

export function SolutionTypesSelector({
  selectedIds,
  onChange,
  disabled = false,
  maxSelections = 10,
  className,
}: SolutionTypesSelectorProps) {
  const { data: types, isLoading } = useSolutionTypes();

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!types?.length) {
    return <p className="text-sm text-muted-foreground">No solution types available.</p>;
  }

  const groups = groupByProficiency(types);
  const atLimit = selectedIds.length >= maxSelections;

  const handleToggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else if (!atLimit) {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selectedIds.length} of {maxSelections} selected
        </span>
        {atLimit && (
          <Badge variant="secondary" className="text-xs">Max reached</Badge>
        )}
      </div>

      {Array.from(groups.entries()).map(([groupKey, group]) => (
        <div key={groupKey} className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">{group.label}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {group.items.map((st) => {
              const isChecked = selectedIds.includes(st.id);
              const isDisabled = disabled || (!isChecked && atLimit);
              return (
                <div
                  key={st.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md border transition-colors',
                    isChecked ? 'border-primary/30 bg-primary/5' : 'border-transparent',
                    isDisabled && !isChecked ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'
                  )}
                  onClick={() => handleToggle(st.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={isDisabled ? -1 : 0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggle(st.id);
                    }
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={isDisabled}
                    onCheckedChange={() => handleToggle(st.id)}
                    aria-label={st.label}
                  />
                  <Label className="text-sm cursor-pointer flex-1">{st.label}</Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
