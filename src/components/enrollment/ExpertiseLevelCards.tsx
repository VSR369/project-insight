/**
 * Expertise Level Cards
 * 
 * Radio card selector for expertise levels from the expertise_levels table.
 * Each card shows level name, year range, and description.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ExpertiseLevel {
  id: string;
  level_number: number;
  name: string;
  min_years: number | null;
  max_years: number | null;
  description: string | null;
}

interface ExpertiseLevelCardsProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

function useExpertiseLevels() {
  return useQuery({
    queryKey: ['expertise-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expertise_levels')
        .select('id, level_number, name, min_years, max_years, description')
        .eq('is_active', true)
        .order('level_number', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ExpertiseLevel[];
    },
    staleTime: 15 * 60_000,
  });
}

function getYearLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max} years`;
  if (min !== null) return `${min}+ years`;
  return '';
}

export function ExpertiseLevelCards({
  selectedId,
  onSelect,
  disabled = false,
  className,
}: ExpertiseLevelCardsProps) {
  const { data: levels, isLoading } = useExpertiseLevels();

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!levels?.length) {
    return <p className="text-sm text-muted-foreground">No expertise levels available.</p>;
  }

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-3', className)}>
      {levels.map((level) => {
        const isSelected = selectedId === level.id;
        return (
          <Card
            key={level.id}
            className={cn(
              'cursor-pointer transition-all duration-200 border-2',
              isSelected
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-transparent hover:border-muted-foreground/20',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
            onClick={() => !disabled && onSelect(level.id)}
            role="radio"
            aria-checked={isSelected}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onSelect(level.id);
              }
            }}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}
              >
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{level.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    L{level.level_number}
                  </Badge>
                  {level.min_years !== null && (
                    <span className="text-xs text-muted-foreground">
                      {getYearLabel(level.min_years, level.max_years)}
                    </span>
                  )}
                </div>
                {level.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {level.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
