/**
 * Geography Tag Selector (REG-001)
 * 
 * Multi-select for operating geographies (countries).
 * Reuses the countries master data list.
 */

import { useCountries } from '@/hooks/queries/useMasterData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface GeographyTagSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function GeographyTagSelector({ value, onChange, disabled }: GeographyTagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: countries, isLoading } = useCountries();

  const items = countries ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((c) => c.name.toLowerCase().includes(q));
  }, [items, search]);

  const selectedItems = items.filter((c) => value.includes(c.id));

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  const toggleItem = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between text-base font-normal h-auto min-h-10 py-2"
          >
            <span className="text-muted-foreground">
              {value.length === 0
                ? 'Select operating geographies...'
                : `${value.length} countries selected`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full min-w-[300px] p-2" align="start">
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-base"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((item) => {
              const isSelected = value.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left',
                    isSelected && 'bg-accent',
                  )}
                >
                  <div className={cn(
                    'flex h-4 w-4 items-center justify-center rounded border shrink-0',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input',
                  )}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {item.name}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
